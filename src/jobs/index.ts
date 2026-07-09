import { registry } from "@/jobs/scheduler/registry";
import { trendingJob } from "@/jobs/definitions/trending.job";

/** 注册所有 Job —— 模块加载时自动执行 */
registry.register(trendingJob);

export { registry };
