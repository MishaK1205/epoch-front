/** The site is admin-only, so there are no public URLs to list and the API is not called. */
export async function getSitemapXml(): Promise<string> {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    '</urlset>\n'
  );
}
