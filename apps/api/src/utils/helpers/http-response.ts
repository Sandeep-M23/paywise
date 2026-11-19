/** A CSV download. The body already carries the UTF-8 BOM and formula escaping. */
export const csvResponse = (csv: string, filename: string) =>
  new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
