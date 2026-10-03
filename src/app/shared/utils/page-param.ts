/** Parses a `?page=` route/query param: positive integers pass through, anything else is page 1. */
export function toPage(value: string | number | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
