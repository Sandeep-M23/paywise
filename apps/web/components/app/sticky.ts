/** Classes for a table that scrolls inside its card with a header that stays visible. */
export const scrollTable = (maxHeight: string) => `${maxHeight} overflow-auto overscroll-contain`;

export const stickyHeader =
  "bg-card sticky top-0 z-10 shadow-[inset_0_-1px_0_var(--border)] [&_tr]:border-b-0";
