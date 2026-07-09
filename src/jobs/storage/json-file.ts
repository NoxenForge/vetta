import fs from "node:fs/promises";
import path from "node:path";
import type { Storage } from "./types";

/** 数据文件存放目录（相对于项目根目录） */
const DATA_DIR = path.resolve(process.cwd(), "data");

export interface JsonFileOptions<T> {
  /** 自定义 key 提取函数，默认用 full_name ?? repo_full_name */
  getKey?: (item: T) => string;
}

/**
 * JSON 文件存储 —— 数据持久化到本地 JSON 文件。
 *
 * 用法：
 *   // 单 key: 按 full_name 去重
 *   createJsonFileStorage<Repository>("repositories.json")
 *
 *   // 复合 key: 按 full_name + since 去重
 *   createJsonFileStorage<Repository>("repositories.json", {
 *     getKey: (r) => `${r.full_name}:${r.since}`,
 *   })
 */
export function createJsonFileStorage<
  T extends { full_name?: string; repo_full_name?: string },
>(filename: string, options?: string | JsonFileOptions<T>): Storage<T> {
  const filePath = path.join(DATA_DIR, filename);
  const name = typeof options === "string" ? options : filename;

  /** 获取去重 key */
  const getKey: (item: T) => string =
    typeof options === "object" && options?.getKey
      ? options.getKey
      : (item: T) =>
          (item.full_name ?? item.repo_full_name) ?? "";

  /** 确保 data 目录存在 */
  async function ensureDir(): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  /** 读取现有数据 */
  async function readAll(): Promise<T[]> {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }

  /** 写入全部数据 */
  async function writeAll(data: T[]): Promise<void> {
    await ensureDir();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  return {
    name,

    async save(data: T): Promise<void> {
      const existing = await readAll();
      const key = getKey(data);
      if (!key) {
        throw new Error("JSON 存储: 数据缺少唯一标识字段");
      }

      const index = existing.findIndex((item) => getKey(item) === key);

      if (index >= 0) {
        existing[index] = data;
      } else {
        existing.push(data);
      }

      await writeAll(existing);
    },

    async saveBatch(data: T[]): Promise<void> {
      const existing = await readAll();

      for (const item of data) {
        const key = getKey(item);
        if (!key) continue;

        const index = existing.findIndex((e) => getKey(e) === key);

        if (index >= 0) {
          existing[index] = item;
        } else {
          existing.push(item);
        }
      }

      await writeAll(existing);
    },
  };
}
