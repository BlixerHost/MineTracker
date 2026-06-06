#!/bin/bash
# MineTracker VPS Setup Script
# Ubuntu/Debian 22.04+
# Usage: bash setup.sh

set -euo pipefail

echo "======================================"
echo "  MineTracker VPS Setup"
echo "======================================"

# ─── CONFIG (edita esto antes de correr) ──────────────────────────────────────
APP_DIR="/var/www/minetracker"
DOMAIN=""                      # <-- REQUIRED: tu dominio, ej: minetracker.com
ADMIN_EMAIL=""                 # <-- REQUIRED: email del admin
ADMIN_PASSWORD=""              # <-- REQUIRED: contraseña fuerte (mín. 12 chars)
# ──────────────────────────────────────────────────────────────────────────────

# ─── Validar config obligatoria ───────────────────────────────────────────────
if [ -z "$DOMAIN" ] || [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo ""
  echo "ERROR: Debes configurar DOMAIN, ADMIN_EMAIL y ADMIN_PASSWORD"
  echo "       Edita las variables al inicio del script antes de ejecutarlo."
  exit 1
fi

if [ ${#ADMIN_PASSWORD} -lt 12 ]; then
  echo "ERROR: ADMIN_PASSWORD debe tener al menos 12 caracteres."
  exit 1
fi

# Generar secretos fuertes automáticamente
JWT_SECRET=$(openssl rand -hex 64)        # 128 chars
IP_HASH_SALT=$(openssl rand -hex 32)      # 64 chars
DB_PASSWORD=$(openssl rand -hex 24)       # 48 chars — contraseña de MariaDB

APP_URL="https://${DOMAIN}"

# 1. Dependencias del sistema
echo ""
echo "[1/9] Instalando dependencias del sistema..."
apt-get update -qq
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx ufw mariadb-server

# 2. Node.js 20
echo ""
echo "[2/9] Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -qq nodejs

# 3. pnpm + PM2
echo ""
echo "[3/9] Instalando pnpm y PM2..."
npm install -g pnpm@11 pm2 --quiet

# 4. Firewall básico
echo ""
echo "[4/9] Configurando firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 5. MariaDB — crear base de datos y usuario
echo ""
echo "[5/9] Configurando MariaDB..."

# Asegurarse de que MariaDB corre
systemctl start mariadb
systemctl enable mariadb

# Crear base de datos y usuario dedicado (idempotente)
mysql -u root << SQLEOF
CREATE DATABASE IF NOT EXISTS minetracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'minetracker'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON minetracker.* TO 'minetracker'@'localhost';

-- Ajustes de rendimiento InnoDB
SET GLOBAL innodb_flush_log_at_trx_commit = 2;

FLUSH PRIVILEGES;
SQLEOF

echo "  MariaDB configurado: usuario 'minetracker' en DB 'minetracker'"

# 6. Copiar archivos y compilar
echo ""
echo "[6/9] Preparando directorio de la app..."
mkdir -p "$APP_DIR"

rsync -a \
  --exclude node_modules \
  --exclude .next \
  --exclude dist \
  --exclude ".git" \
  --exclude ".env" \
  --exclude ".env.local" \
  . "$APP_DIR/"

cd "$APP_DIR"

DATABASE_URL="mysql://minetracker:${DB_PASSWORD}@localhost:3306/minetracker"

# Crear .env de producción para la API
cat > apps/api/.env << ENVEOF
NODE_ENV="production"
DATABASE_URL="${DATABASE_URL}"
REDIS_URL=""
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="8h"
ADMIN_EMAIL="${ADMIN_EMAIL}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"
API_PORT=3001
CORS_ORIGINS="${APP_URL}"
APP_URL="${APP_URL}"
API_URL="http://localhost:3001"
ENABLE_SERVER_SUBMISSIONS=true
SUBMISSION_RATE_LIMIT_PER_HOUR=5
REQUIRE_ADMIN_APPROVAL=true
PING_INTERVAL_SECONDS=10
PING_CONCURRENCY=50
PING_TIMEOUT_MS=5000
IP_HASH_SALT="${IP_HASH_SALT}"
ENVEOF

chmod 600 apps/api/.env

# Crear .env de producción para la Web
cat > apps/web/.env.local << WEBENVEOF
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=${APP_URL}
WEBENVEOF

chmod 600 apps/web/.env.local

echo ""
echo "[7/9] Instalando dependencias y compilando..."
pnpm install --frozen-lockfile
pnpm --filter @minetracker/shared build

# Generar cliente Prisma y crear el schema en MariaDB
DATABASE_URL="${DATABASE_URL}" \
  pnpm --filter @minetracker/api exec prisma generate

DATABASE_URL="${DATABASE_URL}" \
  pnpm --filter @minetracker/api exec prisma db push --accept-data-loss

# Seed: crear admin inicial
ADMIN_EMAIL="${ADMIN_EMAIL}" \
  ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
  DATABASE_URL="${DATABASE_URL}" \
  pnpm --filter @minetracker/api exec prisma db seed

pnpm --filter @minetracker/api build

NEXT_PUBLIC_API_URL="http://localhost:3001" \
  NEXT_PUBLIC_SITE_URL="${APP_URL}" \
  pnpm --filter @minetracker/web build

# 8. PM2
echo ""
echo "[8/9] Configurando PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash

# 9. Nginx + SSL
echo ""
echo "[9/9] Configurando Nginx y SSL..."

cat > /etc/nginx/sites-available/minetracker << NGINXEOF
# Redirigir HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    # SSL — certbot lo rellena automáticamente
    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options           "DENY" always;
    add_header X-Content-Type-Options    "nosniff" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;

    client_max_body_size 10M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/rss+xml text/javascript;

    # Next.js — archivos estáticos con cache larga
    location /_next/static/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_cache_bypass \$http_upgrade;
        expires            1y;
        add_header         Cache-Control "public, immutable";
    }

    # Next.js — todo lo demás
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 30s;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/minetracker /etc/nginx/sites-enabled/minetracker
rm -f /etc/nginx/sites-enabled/default

# Obtener certificado SSL con certbot
certbot --nginx -d "${DOMAIN}" \
  --non-interactive \
  --agree-tos \
  -m "${ADMIN_EMAIL}" \
  --redirect

# Renovación automática de SSL
echo "0 0,12 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" \
  > /etc/cron.d/certbot-renew

nginx -t && systemctl reload nginx

# ─── Resumen ──────────────────────────────────────────────────────────────────
echo ""
echo "======================================"
echo "  Instalación completa!"
echo "======================================"
echo ""
echo "  Web:    https://${DOMAIN}"
echo "  Admin:  https://${DOMAIN}/admin/login"
echo "  Email:  ${ADMIN_EMAIL}"
echo "  Health: https://${DOMAIN}/api/health"
echo ""
echo "  Secretos generados guardados en:"
echo "    ${APP_DIR}/apps/api/.env  (chmod 600)"
echo ""
echo "  MariaDB:"
echo "    Usuario:   minetracker"
echo "    Database:  minetracker"
echo "    Password:  (en apps/api/.env como DATABASE_URL)"
echo ""
echo "  Comandos útiles:"
echo "    pm2 status          — ver procesos"
echo "    pm2 logs            — ver logs en vivo"
echo "    pm2 restart all     — reiniciar todo"
echo "    pm2 monit           — monitor de recursos"
echo "    mysql -u minetracker -p minetracker — consola DB"
echo "======================================"
