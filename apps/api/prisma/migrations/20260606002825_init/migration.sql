-- CreateTable
CREATE TABLE "admins" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "servers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "motd" TEXT,
    "version" TEXT,
    "favicon_hash" TEXT,
    "favicon_data" TEXT,
    "players_online" INTEGER NOT NULL DEFAULT 0,
    "players_max" INTEGER NOT NULL DEFAULT 0,
    "peak_players" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER,
    "uptime_percentage" DECIMAL NOT NULL DEFAULT 0,
    "country" TEXT,
    "website_url" TEXT,
    "discord_url" TEXT,
    "approved_at" DATETIME,
    "last_checked_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "server_submissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "website_url" TEXT,
    "discord_url" TEXT,
    "contact_email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitter_ip_hash" TEXT NOT NULL,
    "last_ping_error" TEXT,
    "notes" TEXT,
    "reviewed_by_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" DATETIME
);

-- CreateTable
CREATE TABLE "server_snapshots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "server_id" INTEGER NOT NULL,
    "checked_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "online" BOOLEAN NOT NULL,
    "players_online" INTEGER NOT NULL DEFAULT 0,
    "players_max" INTEGER NOT NULL DEFAULT 0,
    "version" TEXT,
    "latency_ms" INTEGER,
    "motd_hash" TEXT,
    "error_message" TEXT,
    CONSTRAINT "server_snapshots_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "server_daily_stats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "server_id" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "avg_players" DECIMAL NOT NULL DEFAULT 0,
    "max_players" INTEGER NOT NULL DEFAULT 0,
    "min_players" INTEGER NOT NULL DEFAULT 0,
    "uptime_percentage" DECIMAL NOT NULL DEFAULT 0,
    "checks_count" INTEGER NOT NULL DEFAULT 0,
    "online_checks" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "server_daily_stats_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "admin_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "metadata_json" TEXT,
    "ip" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "servers_slug_key" ON "servers"("slug");

-- CreateIndex
CREATE INDEX "servers_status_idx" ON "servers"("status");

-- CreateIndex
CREATE INDEX "servers_type_idx" ON "servers"("type");

-- CreateIndex
CREATE INDEX "idx_players_online" ON "servers"("players_online");

-- CreateIndex
CREATE INDEX "servers_slug_idx" ON "servers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "servers_host_port_type_key" ON "servers"("host", "port", "type");

-- CreateIndex
CREATE INDEX "server_submissions_status_idx" ON "server_submissions"("status");

-- CreateIndex
CREATE INDEX "server_submissions_created_at_idx" ON "server_submissions"("created_at");

-- CreateIndex
CREATE INDEX "server_snapshots_server_id_checked_at_idx" ON "server_snapshots"("server_id", "checked_at");

-- CreateIndex
CREATE INDEX "server_snapshots_checked_at_idx" ON "server_snapshots"("checked_at");

-- CreateIndex
CREATE INDEX "server_daily_stats_server_id_idx" ON "server_daily_stats"("server_id");

-- CreateIndex
CREATE INDEX "server_daily_stats_date_idx" ON "server_daily_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "server_daily_stats_server_id_date_key" ON "server_daily_stats"("server_id", "date");

-- CreateIndex
CREATE INDEX "audit_logs_admin_id_idx" ON "audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
