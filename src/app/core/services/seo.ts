import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { toPage } from '../../shared/utils/page-param';

const SITE_NAME = 'Epoch';
const JSON_LD_ID = 'seo-json-ld';

export const DEFAULT_TITLE = 'Epoch';
export const DEFAULT_DESCRIPTION =
  'Epoch — სტატიები ისტორიაზე, მეცნიერებასა და საინტერესო ფაქტებზე ქართულ ენაზე.';

export interface ArticleSeo {
  publishedAt: string | null;
  modifiedAt: string;
  author: string | null;
  section: string | null;
  tags: string[];
}

export interface PageSeo {
  /** Full document title, e.g. `"<article title> — Epoch"`. */
  title: string;
  /** Plain text; falls back to `DEFAULT_DESCRIPTION`. */
  description?: string;
  /** Absolute image URL for link previews. */
  image?: string | null;
  imageAlt?: string;
  /** Adds `og:type=article`, `article:*` tags and schema.org `Article` JSON-LD. */
  article?: ArticleSeo;
}

/**
 * Owns the document head for search engines and link previews: title, description, canonical
 * URL, Open Graph / Twitter tags and JSON-LD. Works the same during server rendering.
 * `SeoTitleStrategy` resets it on every navigation; pages call `update()` once their data loads.
 */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  private canonicalUrl = `${environment.siteUrl}/`;

  /** Route defaults: the route title, the default description and a canonical URL from `url`. */
  resetForRoute(title: string, url: string): void {
    this.canonicalUrl = toCanonicalUrl(url);
    this.setCanonicalLink(this.canonicalUrl);
    this.update({ title });
  }

  update(page: PageSeo): void {
    const description = page.description?.trim() || DEFAULT_DESCRIPTION;

    this.title.setTitle(page.title);
    this.setName('description', description);

    this.setProperty('og:site_name', SITE_NAME);
    this.setProperty('og:locale', 'ka_GE');
    this.setProperty('og:type', page.article ? 'article' : 'website');
    this.setProperty('og:title', page.title);
    this.setProperty('og:description', description);
    this.setProperty('og:url', this.canonicalUrl);
    this.setName('twitter:title', page.title);
    this.setName('twitter:description', description);

    if (page.image) {
      this.setProperty('og:image', page.image);
      this.setProperty('og:image:alt', page.imageAlt || page.title);
      this.setName('twitter:card', 'summary_large_image');
      this.setName('twitter:image', page.image);
    } else {
      this.meta.removeTag('property="og:image"');
      this.meta.removeTag('property="og:image:alt"');
      this.meta.removeTag('name="twitter:image"');
      this.setName('twitter:card', 'summary');
    }

    this.setArticleTags(page.article);
    this.setJsonLd(page.article ? this.articleJsonLd(page, description, page.article) : null);
  }

  private setArticleTags(article: ArticleSeo | undefined): void {
    for (const name of ['published_time', 'modified_time', 'author', 'section', 'tag']) {
      this.meta.getTags(`property="article:${name}"`).forEach((tag) => tag.remove());
    }
    if (!article) {
      return;
    }
    const tags = [
      { property: 'article:modified_time', content: article.modifiedAt },
      ...(article.publishedAt
        ? [{ property: 'article:published_time', content: article.publishedAt }]
        : []),
      ...(article.author ? [{ property: 'article:author', content: article.author }] : []),
      ...(article.section ? [{ property: 'article:section', content: article.section }] : []),
      ...article.tags.map((tag) => ({ property: 'article:tag', content: tag })),
    ];
    this.meta.addTags(tags);
  }

  private articleJsonLd(page: PageSeo, description: string, article: ArticleSeo): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.title.replace(/ — Epoch$/, ''),
      description,
      ...(page.image ? { image: [page.image] } : {}),
      ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
      dateModified: article.modifiedAt,
      ...(article.author ? { author: { '@type': 'Person', name: article.author } } : {}),
      ...(article.section ? { articleSection: article.section } : {}),
      ...(article.tags.length > 0 ? { keywords: article.tags.join(', ') } : {}),
      inLanguage: 'ka',
      mainEntityOfPage: this.canonicalUrl,
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: `${environment.siteUrl}/`,
        logo: { '@type': 'ImageObject', url: `${environment.siteUrl}/apple-touch-icon.png` },
      },
    };
  }

  private setJsonLd(data: object | null): void {
    const existing = this.document.getElementById(JSON_LD_ID);
    if (!data) {
      existing?.remove();
      return;
    }
    const script = existing ?? this.document.createElement('script');
    script.id = JSON_LD_ID;
    script.setAttribute('type', 'application/ld+json');
    // `<` is escaped so article text can never close the script element.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    if (!existing) {
      this.document.head.appendChild(script);
    }
  }

  private setCanonicalLink(href: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private setName(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content }, `property="${property}"`);
  }
}

/** Site origin + path; only `?page=` (when > 1) survives, other query params are filters. */
function toCanonicalUrl(url: string): string {
  const [path, query = ''] = url.split('#')[0].split('?');
  const page = toPage(new URLSearchParams(query).get('page') ?? undefined);
  return `${environment.siteUrl}${path || '/'}${page > 1 ? `?page=${page}` : ''}`;
}
