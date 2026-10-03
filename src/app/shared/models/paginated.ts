export interface Paginated<T> {
  items: T[];
  /** Total matching items across all pages. */
  total: number;
  page: number;
  limit: number;
}
