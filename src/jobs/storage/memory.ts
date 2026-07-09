import type { Storage } from "./types";

/**
 * 内存存储 —— 用于开发调试和单元测试，数据存储在 Map 中，进程重启后丢失
 */
export function createMemoryStorage<T extends { full_name?: string; repo_full_name?: string }>(
  name: string,
): Storage<T> {
  const store = new Map<string, T>();

  return {
    name,

    async save(data: T): Promise<void> {
      const key = data.full_name ?? data.repo_full_name;
      if (!key) {
        throw new Error(`MemoryStorage.save: 数据缺少唯一标识字段`);
      }
      store.set(key, data);
    },

    async saveBatch(data: T[]): Promise<void> {
      for (const item of data) {
        await this.save(item);
      }
    },
  };
}
