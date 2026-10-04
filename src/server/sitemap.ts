import type { ArticleSummary } from '../app/core/api/articles/articles.models';
import type { Category } from '../app/core/api/categories/categories.models';
import type { Paginated } from '../app/shared/models/paginated';
import { environment } from '../environments/environment';

/** The API's maximum page size. */
const PAGE_LIMIT = 100;
const CACHE_TTL_MS = 60 * 60 * 1000;

interface SitemapEntry {
  path: string;
  lastModified?: string;
}

let cached: { xml: string; expiresAt: number } | null = null;

/** `sitemap.xml` with the home page, every category and every published article. */
export async function getSitemapXml(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.xml;
  }
  const [categories, articles] = await Promise.all([fetchCategories(), fetchArticles()]);
  const entries: SitemapEntry[] = [
    { path: '/', lastModified: articles[0]?.updatedAt },
    ...categories.map((category) => ({
      path: `/category/${encodeURIComponent(category.slug)}`,
      lastModified: category.updatedAt,
    })),
    ...articles.map((article) => ({
      path: `/articles/${encodeURIComponent(article.slug)}`,
      lastModified: article.updatedAt,
    })),
  ];
  const xml = toXml(entries);
  cached = { xml, expiresAt: Date.now() + CACHE_TTL_MS };
  return xml;
}

async function fetchCategories(): Promise<Category[]> {
  return fetchJson<Category[]>(`${environment.apiUrl}/categories`);
}

async function fetchArticles(): Promise<ArticleSummary[]> {
  const articles: ArticleSummary[] = [];
  for (let page = 1; ; page++) {
    const result = await fetchJson<Paginated<ArticleSummary>>(
      `${environment.apiUrl}/articles?page=${page}&limit=${PAGE_LIMIT}`,
    );
    articles.push(...result.items);
    if (result.items.length === 0 || articles.length >= result.total) {
      return articles;
    }
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Sitemap: GET ${url} failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

function toXml(entries: SitemapEntry[]): string {
  const urls = entries.map(({ path, lastModified }) => {
    const lastmod = lastModified ? `<lastmod>${escapeXml(lastModified)}</lastmod>` : '';
    return `<url><loc>${escapeXml(environment.siteUrl + path)}</loc>${lastmod}</url>`;
  });
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') +
    '\n</urlset>\n'
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
