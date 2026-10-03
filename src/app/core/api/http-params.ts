import { HttpParams } from '@angular/common/http';

export type QueryParamValue = string | number | boolean | null | undefined;

/** Builds `HttpParams`, skipping `undefined`, `null` and `''` values. */
export function toHttpParams<T extends { [K in keyof T]: QueryParamValue }>(query: T): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries<QueryParamValue>(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    params = params.set(key, String(value));
  }
  return params;
}
