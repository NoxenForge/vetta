import { createClient } from "@supabase/supabase-js";
import type { Storage } from "./types";
import type {
  Repository,
  RepoRow,
  TrendingSnapshot,
  Readme,
} from "@/jobs/fetcher/types";

/**
 * 创建 Supabase 客户端（server-side，使用 service_role key 写入）。
 * 注意：需要 SUPABASE_SERVICE_ROLE_KEY 环境变量。
 */
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase 存储需要 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key);
}

/** Repository 表名 */
const REPOS_TABLE = "repositories";
/** Trending Snapshot 表名 */
const SNAPS_TABLE = "trending_snapshots";
/** README 表名 */
const READMES_TABLE = "readmes";

/** Repository Supabase 存储（只写入静态字段，变动数据由 snapshots 管理） */
export const repoStorage: Storage<RepoRow> = {
  name: "supabase-repositories",

  async save(data: RepoRow): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(REPOS_TABLE)
      .upsert(data, { onConflict: "id" });

    if (error) throw new Error(`Repository 写入失败: ${error.message}`);
  },

  async saveBatch(data: RepoRow[]): Promise<void> {
    if (data.length === 0) return;
    const supabase = getSupabase();
    const { error } = await supabase
      .from(REPOS_TABLE)
      .upsert(data, { onConflict: "id" });

    if (error) throw new Error(`Repository 批量写入失败: ${error.message}`);
  },
};

/** TrendingSnapshot Supabase 存储 */
export const snapStorage: Storage<TrendingSnapshot> = {
  name: "supabase-snapshots",

  async save(data: TrendingSnapshot): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(SNAPS_TABLE)
      .insert(data);

    if (error) throw new Error(`Snapshot 写入失败: ${error.message}`);
  },

  async saveBatch(data: TrendingSnapshot[]): Promise<void> {
    if (data.length === 0) return;
    const supabase = getSupabase();
    const { error } = await supabase
      .from(SNAPS_TABLE)
      .insert(data);

    if (error) throw new Error(`Snapshot 批量写入失败: ${error.message}`);
  },
};

/** Readme Supabase 存储 */
export const readmeStorage: Storage<Readme> = {
  name: "supabase-readmes",

  async save(data: Readme): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(READMES_TABLE)
      .upsert(data, { onConflict: "repo_id" });

    if (error) throw new Error(`README 写入失败: ${error.message}`);
  },

  async saveBatch(data: Readme[]): Promise<void> {
    if (data.length === 0) return;
    const supabase = getSupabase();
    const { error } = await supabase
      .from(READMES_TABLE)
      .upsert(data, { onConflict: "repo_id" });

    if (error) throw new Error(`README 批量写入失败: ${error.message}`);
  },
};
