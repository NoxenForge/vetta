/** 任务上下文 —— 携带取消信号和日志函数，不依赖任何框架 */
export interface JobContext {
  /** 取消信号 —— 外部可通过 AbortController 中断长时间运行的任务 */
  signal: AbortSignal;
  /** 日志函数 —— 任务内部通过此函数输出日志 */
  log: (message: string) => void;
}

/** 任务接口 —— 所有 Job 必须实现此接口 */
export interface Job {
  /** 任务唯一名称 */
  name: string;
  /** 执行任务 */
  run(ctx: JobContext): Promise<void>;
}
