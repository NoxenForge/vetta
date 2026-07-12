import { createClient } from "@supabase/supabase-js";

const TABLE = "sync_job_logs";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("缺少 Supabase 环境变量");
  return createClient(url, key);
}

interface LogEntry {
  repo_id?: number;
  job_type: "full" | "repository" | "metrics" | "readme";
  trigger_type: "cron" | "manual" | "webhook";
  status: "running" | "success" | "failed" | "cancelled";
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  retry_count?: number;
  github_rate_limit_remaining?: number;
  github_rate_limit_used?: number;
  error_message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 写入一条 sync_job_logs 记录。
 * 调用 start() 得到 logId，任务结束时调用 finish() 更新状态。
 */
export async function startJobLog(params: {
  job_type: LogEntry["job_type"];
  trigger_type: LogEntry["trigger_type"];
  metadata?: Record<string, unknown>;
}): Promise<{ logId: number; startedAt: string }> {
  const supabase = getSupabase();
  const startedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      job_type: params.job_type,
      trigger_type: params.trigger_type,
      status: "running",
      started_at: startedAt,
      metadata: params.metadata ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[JobLogger] 写入开始日志失败:", error.message);
    return { logId: 0, startedAt };
  }

  return { logId: (data as { id: number }).id, startedAt };
}

/** 更新 sync_job_logs 记录为最终状态 */
export async function finishJobLog(logId: number, params: {
  startedAt: string;
  status: LogEntry["status"];
  error_message?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (logId === 0) return;
  const supabase = getSupabase();
  const finishedAt = new Date().toISOString();
  const durationMs =
    new Date(finishedAt).getTime() - new Date(params.startedAt).getTime();

  const { error } = await supabase
    .from(TABLE)
    .update({
      status: params.status,
      finished_at: finishedAt,
      duration_ms: durationMs,
      error_message: params.error_message ?? null,
      metadata: params.metadata ?? null,
    })
    .eq("id", logId);

  if (error) {
    console.error("[JobLogger] 更新结束日志失败:", error.message);
  }
}
