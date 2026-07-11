-- Vetta 数据表
-- 每张表均含 created_at / updated_at (TIMESTAMPTZ, 带时区)

CREATE TABLE IF NOT EXISTS repositories (
  id                  BIGINT PRIMARY KEY,
  full_name           TEXT NOT NULL,
  owner               TEXT NOT NULL,
  repo                TEXT NOT NULL,
  avatar_url          TEXT NOT NULL DEFAULT '',
  description         TEXT,
  language            TEXT,
  topics              TEXT[] DEFAULT '{}',
  license             TEXT,
  homepage            TEXT,
  default_branch      TEXT NOT NULL DEFAULT 'main',
  archived            BOOLEAN NOT NULL DEFAULT FALSE,
  fork                BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pushed_at           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS trending_snapshots (
  repo_id             BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  since               TEXT NOT NULL CHECK (since IN ('daily', 'weekly', 'monthly')),
  rank                INTEGER NOT NULL DEFAULT 0,
  stargazers_count    INTEGER NOT NULL DEFAULT 0,
  forks_count         INTEGER NOT NULL DEFAULT 0,
  open_issues_count   INTEGER NOT NULL DEFAULT 0,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (repo_id, since)
);

CREATE TABLE IF NOT EXISTS readmes (
  repo_id             BIGINT PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
  content             TEXT NOT NULL,
  size_bytes          INTEGER NOT NULL DEFAULT 0,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repos_full_name ON repositories(full_name);
CREATE INDEX IF NOT EXISTS idx_repos_language ON repositories(language);
CREATE INDEX IF NOT EXISTS idx_snapshots_since ON trending_snapshots(since);
CREATE INDEX IF NOT EXISTS idx_snapshots_fetched ON trending_snapshots(fetched_at DESC);

ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE readmes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON repositories FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON trending_snapshots FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON readmes FOR SELECT TO anon USING (true);

-- ============================================================
-- 迁移：为已有表补充 TIMESTAMPTZ 字段
-- ============================================================

ALTER TABLE trending_snapshots
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE readmes
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE repositories
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- ============================================================
-- 迁移：Metrics Dashboard 工程指标字段
-- ============================================================

ALTER TABLE repositories
  ADD COLUMN IF NOT EXISTS commit_activity JSONB,
  ADD COLUMN IF NOT EXISTS contributor_count INTEGER,
  ADD COLUMN IF NOT EXISTS release_count INTEGER,
  ADD COLUMN IF NOT EXISTS latest_release_at TIMESTAMPTZ;

-- ============================================================
-- 迁移：trending_snapshots 主键改为 (repo_id, since, fetched_at)
-- 让每次抓取产生独立快照，支持时间序列趋势图
-- ============================================================

ALTER TABLE trending_snapshots DROP CONSTRAINT IF EXISTS trending_snapshots_pkey;
ALTER TABLE trending_snapshots ADD PRIMARY KEY (repo_id, since, fetched_at);
