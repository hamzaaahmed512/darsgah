export function paginateRows<T>(rows: T[], pageValue?: string | number, pageSizeValue?: string | number) {
  const requestedPageSize = Number(pageSizeValue ?? 10);
  const pageSize = [10, 25, 50].includes(requestedPageSize) ? requestedPageSize : 10;
  const parsedPage = Number(pageValue ?? 1);
  const requestedPage = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
  const count = rows.length;
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const start = (page - 1) * pageSize;

  return { rows: rows.slice(start, start + pageSize), count, page, pageSize };
}
