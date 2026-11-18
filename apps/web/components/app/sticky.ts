/** Classes for a table that scrolls inside its card with a header that stays visible. */
export const scrollTable = (maxHeight: string) => `${maxHeight} overflow-auto overscroll-contain`;

/**
 * From md up the page is fixed to the window and only tables scroll: `fill` makes a
 * flex item take the height left over, and `fillScrollTable` is a table container
 * that fills it. On small screens the page scrolls and tables get a fixed height.
 */
export const fill = "md:min-h-0 md:flex-1";
export const fillScrollTable = scrollTable("h-[70vh] min-h-64 md:h-auto md:min-h-48 md:flex-1");

// The header's black background comes from TableHeader itself.
export const stickyHeader = "sticky top-0 z-10";
