/** Storage 泛型接口 —— 不关心数据来源 */
export interface Storage<T> {
  name: string;
  /** 保存单条数据 */
  save(data: T): Promise<void>;
  /** 批量保存 */
  saveBatch(data: T[]): Promise<void>;
}
