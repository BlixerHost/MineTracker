# MineTracker

Production-grade Minecraft server tracker. Live player counts, uptime statistics, historical charts, and server rankings for Java and Bedrock editions.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 + TypeScript + TailwindCSS + shadcn/ui |
| Backend | NestJS + Fastify adapter + TypeScript |
| Database | MariaDB 11 / MySQL 8 + Prisma ORM |
| Cache & Queues | Redis 7 + BullMQ |
| Charts | Recharts |
| Deploy | Docker + Docker Compose + Nginx |

---

## Project Structure

```
minetracker/
├── apps/
│   ├── api/        # NestJS backend (port 3001)
│   └── web/        # Next.js frontend (port 3000)
├── packages/
│   └── shared/     # Shared TypeScript types
├── docker/
│   ├── mysql/      # DB init script
│   └── nginx/      # Nginx config
├── docker-compose.yml
└── .env.example
```

---

## Local Development

### Prerequisites

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- Docker + Docker Compose (for MySQL + Redis)

### 1. Clone and install dependencies

```bash
git clone <repo>
cd minetracker
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

Required values to set:
- `JWT_SECRET` — min 32 chars, random
- `IP_HASH_SALT` — min 16 chars, random
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — for the seed script

### 3. Start database and Redis

```bash
# Start only DB and Redis via Docker
docker compose up db redis -d
```

### 4. Run Prisma migrations

```bash
pnpm db:migrate
```

### 5. Create admin user

```bash
pnpm db:seed
```

### 6. Start the API

```bash
pnpm --filter @minetracker/api dev
# API available at http://localhost:3001
```

### 7. Start the web frontend

```bash
pnpm --filter @minetracker/web dev
# Web available at http://localhost:3000
```

Or run everything at once:

```bash
pnpm dev
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | MySQL/MariaDB connection string |
| `REDIS_URL` | — | Redis connection string |
| `JWT_SECRET` | — | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | `8h` | JWT token expiry |
| `ADMIN_EMAIL` | — | Seed admin email |
| `ADMIN_PASSWORD` | — | Seed admin password |
| `API_PORT` | `3001` | API server port |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins (comma-separated) |
| `ENABLE_SERVER_SUBMISSIONS` | `true` | Allow public server submissions |
| `SUBMISSION_RATE_LIMIT_PER_HOUR` | `5` | Max submissions per IP per hour |
| `REQUIRE_ADMIN_APPROVAL` | `true` | Require admin approval before listing |
| `PING_INTERVAL_SECONDS` | `60` | How often to ping each server |
| `PING_CONCURRENCY` | `10` | Parallel ping jobs |
| `PING_TIMEOUT_MS` | `5000` | Ping timeout per server |
| `IP_HASH_SALT` | — | Salt for hashing submitter IPs |

---

## Docker (Production)

### Build and start all services

```bash
docker compose up --build -d
```

### Run migrations in production

```bash
docker compose exec api pnpm db:migrate:prod
```

### Seed admin in production

```bash
docker compose exec api node dist/prisma/seed.js
```

### Services

| Service | Port | Description |
|---|---|---|
| `nginx` | 80, 443 | Reverse proxy |
| `web` | 3000 | Next.js frontend |
| `api` | 3001 | NestJS API |
| `db` | 3306 | MariaDB |
| `redis` | 6379 | Redis |

---

## How Redis Works

Redis is used **only as cache and queue layer** — it is never the source of truth.

- `server:{id}:current` — cached live server status (TTL 90s)
- `servers:ranking` — cached top-100 ranking (TTL 30s)
- `ratelimit:submit:{ipHash}` — submission rate limit counter (TTL 1h)
- BullMQ queue `server-monitor` — jobs for the ping worker

MySQL/MariaDB is always the source of truth. If Redis goes down, the system degrades gracefully (slower responses, no queue — but data is safe).

---

## How the Worker Works

1. `SchedulerService` runs every 30 seconds via `@nestjs/schedule`
2. It queries MySQL for servers whose `last_checked_at` is older than `PING_INTERVAL_SECONDS`
3. For each server, it adds a BullMQ job to the `server-monitor` queue
4. `MonitorProcessor` workers consume jobs with configurable concurrency
5. Each job: pings the server → saves snapshot to MySQL → updates server live data → caches result in Redis
6. At 00:05 UTC daily, `AggregationService` aggregates yesterday's snapshots into `server_daily_stats`
7. Raw snapshots older than 7 days are pruned

---

## How to Add Servers

**Public submission:**
```
POST /api/servers/submit
{
  "name": "Hypixel",
  "host": "mc.hypixel.net",
  "port": 25565,
  "type": "JAVA"
}
```

The server is validated (SSRF-safe ping), and if approved (`REQUIRE_ADMIN_APPROVAL=true`), it appears in the listing.

**Direct via admin panel:**
```
POST /api/admin/submissions/:id/approve
Authorization: Bearer <jwt>
```

---

## How to Approve Servers

1. Login: `POST /api/admin/auth/login` → get JWT
2. List pending: `GET /api/admin/submissions?status=PENDING`
3. Approve: `POST /api/admin/submissions/:id/approve`
4. Or reject: `POST /api/admin/submissions/:id/reject`

---

## Running Tests

```bash
pnpm --filter @minetracker/api test
pnpm --filter @minetracker/api test:cov
```

Key test files:
- `src/modules/ping/ssrf-guard.service.spec.ts` — SSRF protection tests
- `src/config/env.validation.spec.ts` — Environment validation tests
- `src/modules/submissions/submissions.service.spec.ts` — Submission flow tests

---

## Database Migrations

```bash
# Create a new migration
pnpm --filter @minetracker/api prisma migrate dev --name <migration-name>

# Apply all pending migrations (production)
pnpm --filter @minetracker/api prisma migrate deploy

# Open Prisma Studio (DB GUI)
pnpm db:studio
```

---

## Scaling

**Horizontal scaling considerations:**

- The API is stateless — run multiple instances behind a load balancer
- The worker can run as a separate service (just share the Redis and DB)
- Set `PING_CONCURRENCY` higher on dedicated worker nodes
- For 1000+ servers: increase `PING_INTERVAL_SECONDS` or add more worker replicas
- MySQL read replicas for heavy `SELECT` loads on the public API

**Recommended production setup:**

```
[Cloudflare/CDN] → [Nginx] → [API x2] → [MariaDB Primary + Replica]
                                       ↘ [Redis Cluster]
                                [Worker x2] ↗
```

---

## Development Phases

| Phase | Status | Description |
|---|---|---|
| Phase 1 | ✅ Complete | Backend foundation, DB, Ping, Worker |
| Phase 2 | 🔄 Next | Frontend UI — Home, server cards, detail pages |
| Phase 3 | ⏳ Pending | Submit form, admin panel UI, approval flow |
| Phase 4 | ⏳ Pending | Charts, aggregations, historical data |
| Phase 5 | ⏳ Pending | SEO, security hardening, production deploy |
