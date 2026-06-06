-- MineTracker — MariaDB initialization
-- Prisma handles schema creation via `prisma db push`.
-- This file tunes InnoDB settings for the workload.

SET GLOBAL innodb_buffer_pool_size = 268435456;  -- 256 MB
SET GLOBAL innodb_flush_log_at_trx_commit = 2;   -- Better write throughput (safe for this workload)
SET GLOBAL innodb_log_file_size = 67108864;       -- 64 MB log files
