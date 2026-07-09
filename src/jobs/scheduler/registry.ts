import type { Job, JobContext } from "./types";

/** Job 注册表 —— 全局单例，管理所有已注册的任务 */
class JobRegistry {
  private jobs = new Map<string, Job>();

  /** 注册一个任务 */
  register(job: Job): void {
    if (this.jobs.has(job.name)) {
      throw new Error(`Job "${job.name}" 已注册，不允许重复注册`);
    }
    this.jobs.set(job.name, job);
  }

  /** 按名称获取任务 */
  get(name: string): Job | undefined {
    return this.jobs.get(name);
  }

  /** 列出所有已注册的任务名称 */
  list(): string[] {
    return Array.from(this.jobs.keys());
  }

  /** 执行指定名称的任务 */
  async run(name: string, ctx: JobContext): Promise<void> {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(
        `未找到任务: "${name}"，已注册的任务: ${this.list().join(", ")}`,
      );
    }
    await job.run(ctx);
  }
}

/** 全局单例 */
export const registry = new JobRegistry();
