-- ============================================================
-- Vetta v2 数据库 Schema
-- 设计原则：
--   1. 静态表 (repositories) — 首次抓取后很少更新
--   2. 动态表 (repository_metrics) — 每个 repo 一条记录，同步时 UPDATE
--   3. 历史表 (repository_metrics_history) — append-only，用于趋势图
--   4. 所有时间字段使用 TIMESTAMPTZ（UTC 存储，会话时区展示）
-- ============================================================

-- ============================================================
-- 公共函数：自动维护 updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. repositories — 仓库静态信息
--    特点：首次抓取后很少更新，不保存任何动态指标
-- ============================================================

CREATE TABLE IF NOT EXISTS repositories (
  id                BIGINT PRIMARY KEY,
  owner             TEXT NOT NULL,
  repo              TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  html_url          TEXT NOT NULL DEFAULT '',
  avatar_url        TEXT NOT NULL DEFAULT '',
  description       TEXT,
  homepage          TEXT,
  language          TEXT,
  topics            TEXT[] DEFAULT '{}',
  license           TEXT,
  default_branch    TEXT NOT NULL DEFAULT 'main',
  visibility        TEXT NOT NULL DEFAULT 'public'
                    CHECK (visibility IN ('public', 'private', 'internal')),
  archived          BOOLEAN NOT NULL DEFAULT FALSE,
  fork              BOOLEAN NOT NULL DEFAULT FALSE,
  is_template       BOOLEAN NOT NULL DEFAULT FALSE,
  github_created_at TIMESTAMPTZ,
  github_updated_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS uq_repos_owner_repo
  ON repositories(owner, repo);
CREATE UNIQUE INDEX IF NOT EXISTS uq_repos_full_name
  ON repositories(full_name);

-- 查询索引
CREATE INDEX IF NOT EXISTS idx_repos_language
  ON repositories(language);
CREATE INDEX IF NOT EXISTS idx_repos_topics
  ON repositories USING GIN(topics);

-- updated_at 自动维护
DROP TRIGGER IF EXISTS trg_repos_updated_at ON repositories;
CREATE TRIGGER trg_repos_updated_at
  BEFORE UPDATE ON repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. repository_metrics — 仓库当前动态数据
--    特点：每个 repo 永远只有一条记录，同步时 UPDATE
-- ============================================================

CREATE TABLE IF NOT EXISTS repository_metrics (
  repo_id             BIGINT PRIMARY KEY
                      REFERENCES repositories(id) ON DELETE CASCADE,
  stargazers_count    INTEGER NOT NULL DEFAULT 0,
  forks_count         INTEGER NOT NULL DEFAULT 0,
  watchers_count      INTEGER NOT NULL DEFAULT 0,
  subscribers_count   INTEGER NOT NULL DEFAULT 0,
  open_issues_count   INTEGER NOT NULL DEFAULT 0,
  network_count       INTEGER NOT NULL DEFAULT 0,
  size                INTEGER NOT NULL DEFAULT 0,
  contributor_count   INTEGER,
  release_count       INTEGER NOT NULL DEFAULT 0,
  latest_release_at   TIMESTAMPTZ,
  pushed_at           TIMESTAMPTZ,
  commit_activity     JSONB,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 排序/筛选索引
CREATE INDEX IF NOT EXISTS idx_metrics_stars
  ON repository_metrics(stargazers_count DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_pushed_at
  ON repository_metrics(pushed_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_latest_release
  ON repository_metrics(latest_release_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_fetched_at
  ON repository_metrics(fetched_at DESC);

-- updated_at 自动维护
DROP TRIGGER IF EXISTS trg_metrics_updated_at ON repository_metrics;
CREATE TRIGGER trg_metrics_updated_at
  BEFORE UPDATE ON repository_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. repository_metrics_history — 指标历史快照
--    特点：每次同步 INSERT 一条，永不允许 UPDATE，用于趋势图
-- ============================================================

CREATE TABLE IF NOT EXISTS repository_metrics_history (
  id                  BIGSERIAL PRIMARY KEY,
  repo_id             BIGINT NOT NULL
                      REFERENCES repositories(id) ON DELETE CASCADE,
  stargazers_count    INTEGER NOT NULL DEFAULT 0,
  forks_count         INTEGER NOT NULL DEFAULT 0,
  open_issues_count   INTEGER NOT NULL DEFAULT 0,
  contributor_count   INTEGER,
  release_count       INTEGER NOT NULL DEFAULT 0,
  pushed_at           TIMESTAMPTZ,
  snapshot_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 核心查询：按仓库 + 时间范围拉取趋势
CREATE INDEX IF NOT EXISTS idx_history_repo_time
  ON repository_metrics_history(repo_id, snapshot_at DESC);

-- 全局时间轴查询（最近 N 天的所有快照）
CREATE INDEX IF NOT EXISTS idx_history_snapshot_at
  ON repository_metrics_history(snapshot_at DESC);

-- ============================================================
-- 4. repository_readmes — README 内容
--    特点：每个 repo 一份，更新时 UPDATE，含增量更新标记
-- ============================================================

CREATE TABLE IF NOT EXISTS repository_readmes (
  repo_id             BIGINT PRIMARY KEY
                      REFERENCES repositories(id) ON DELETE CASCADE,
  content             TEXT NOT NULL,
  content_hash        CHAR(64) NOT NULL DEFAULT '',
  etag                TEXT,
  size_bytes          INTEGER NOT NULL DEFAULT 0,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at 自动维护
DROP TRIGGER IF EXISTS trg_readmes_updated_at ON repository_readmes;
CREATE TRIGGER trg_readmes_updated_at
  BEFORE UPDATE ON repository_readmes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. sync_job_logs — 同步任务日志（运维用）
--    特点：append-only，每次任务 INSERT 一条
-- ============================================================

CREATE TABLE IF NOT EXISTS sync_job_logs (
  id                          BIGSERIAL PRIMARY KEY,
  repo_id                     BIGINT
                              REFERENCES repositories(id) ON DELETE SET NULL,
  job_type                    TEXT NOT NULL
                              CHECK (job_type IN ('full', 'repository', 'metrics', 'readme')),
  trigger_type                TEXT NOT NULL DEFAULT 'manual'
                              CHECK (trigger_type IN ('cron', 'manual', 'webhook')),
  status                      TEXT NOT NULL DEFAULT 'running'
                              CHECK (status IN ('running', 'success', 'failed', 'cancelled')),
  started_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at                 TIMESTAMPTZ,
  duration_ms                 INTEGER,
  retry_count                 INTEGER NOT NULL DEFAULT 0,
  github_rate_limit_remaining INTEGER,
  github_rate_limit_used      INTEGER,
  error_message               TEXT,
  metadata                    JSONB,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 按状态查询运行中/失败任务
CREATE INDEX IF NOT EXISTS idx_jobs_status
  ON sync_job_logs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type
  ON sync_job_logs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at
  ON sync_job_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_repo_created
  ON sync_job_logs(repo_id, created_at DESC);

-- ============================================================
-- RLS：公开只读（anon key），写操作使用 service_role
-- ============================================================

ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_readmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_job_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON repositories
  FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON repository_metrics
  FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON repository_metrics_history
  FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON repository_readmes
  FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON sync_job_logs
  FOR SELECT TO anon USING (true);
