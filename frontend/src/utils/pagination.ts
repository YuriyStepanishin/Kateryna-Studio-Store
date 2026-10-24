export const PAGE_SIZE = 20;
export function productWindow(
  total: number,
  page: number,
  shown: number,
  desktop: boolean
) {
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const safePage = Math.max(0, Math.min(page, Math.max(0, pageCount - 1)));
  const start = desktop ? safePage * PAGE_SIZE : 0;
  const end = Math.min(
    total,
    desktop ? start + PAGE_SIZE : Math.max(PAGE_SIZE, shown)
  );
  return {
    start,
    end,
    page: safePage,
    pageCount,
    remaining: Math.max(0, total - end),
  };
}
