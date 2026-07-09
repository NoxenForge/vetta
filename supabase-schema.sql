-- GitHub Insight 数据表
-- PK: GitHub 不可变仓库 ID (id)，无跨表冗余字段

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
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ,
  pushed_at           TIMESTAMPTZ,
  stargazers_count    INTEGER NOT NULL DEFAULT 0,
  forks_count         INTEGER NOT NULL DEFAULT 0,
  open_issues_count   INTEGER NOT NULL DEFAULT 0,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trending_snapshots (
  repo_id             BIGINT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  since               TEXT NOT NULL CHECK (since IN ('daily', 'weekly', 'monthly')),
  rank                INTEGER NOT NULL DEFAULT 0,
  stargazers_count    INTEGER NOT NULL DEFAULT 0,
  forks_count         INTEGER NOT NULL DEFAULT 0,
  open_issues_count   INTEGER NOT NULL DEFAULT 0,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (repo_id, since)
);

CREATE TABLE IF NOT EXISTS readmes (
  repo_id             BIGINT PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
  content             TEXT NOT NULL,
  size_bytes          INTEGER NOT NULL DEFAULT 0,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repos_full_name ON repositories(full_name);
CREATE INDEX IF NOT EXISTS idx_repos_language ON repositories(language);
CREATE INDEX IF NOT EXISTS idx_repos_stars ON repositories(stargazers_count DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_since ON trending_snapshots(since);
CREATE INDEX IF NOT EXISTS idx_snapshots_fetched ON trending_snapshots(fetched_at DESC);

ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE readmes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON repositories FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON trending_snapshots FOR SELECT TO anon USING (true);
CREATE POLICY "public_read" ON readmes FOR SELECT TO anon USING (true);
