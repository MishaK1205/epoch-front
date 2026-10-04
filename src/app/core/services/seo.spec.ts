import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { DEFAULT_DESCRIPTION, Seo } from './seo';

describe('Seo', () => {
  let seo: Seo;
  let doc: Document;

  const meta = (selector: string) =>
    doc.head.querySelector<HTMLMetaElement>(`meta[${selector}]`)?.content;

  beforeEach(() => {
    seo = TestBed.inject(Seo);
    doc = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    seo.resetForRoute('Epoch', '/');
  });

  it('resets to route defaults with a canonical URL that keeps only ?page > 1', () => {
    seo.resetForRoute('კატეგორია — Epoch', '/category/x?page=3&tag=y#top');

    expect(doc.title).toBe('კატეგორია — Epoch');
    expect(meta('name="description"')).toBe(DEFAULT_DESCRIPTION);
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${environment.siteUrl}/category/x?page=3`,
    );
    expect(meta('property="og:url"')).toBe(`${environment.siteUrl}/category/x?page=3`);

    seo.resetForRoute('Epoch', '/?page=1');
    expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${environment.siteUrl}/`,
    );
  });

  it('writes article tags and JSON-LD, and removes them on the next route', () => {
    seo.resetForRoute('სტატია — Epoch', '/articles/a');
    seo.update({
      title: 'A </script> — Epoch',
      description: 'Excerpt',
      image: 'https://img/a.png',
      article: {
        publishedAt: '2026-10-01T00:00:00Z',
        modifiedAt: '2026-10-02T00:00:00Z',
        author: 'writer',
        section: 'History',
        tags: ['one', 'two'],
      },
    });

    expect(meta('property="og:type"')).toBe('article');
    expect(meta('name="twitter:card"')).toBe('summary_large_image');
    expect(doc.head.querySelectorAll('meta[property="article:tag"]').length).toBe(2);
    const script = doc.getElementById('seo-json-ld');
    expect(script?.textContent).not.toContain('</script>');
    expect(JSON.parse(script?.textContent ?? '{}')).toMatchObject({
      '@type': 'Article',
      headline: 'A </script>',
      author: { name: 'writer' },
    });

    seo.resetForRoute('Epoch', '/');
    expect(meta('property="og:type"')).toBe('website');
    expect(meta('property="og:image"')).toBeUndefined();
    expect(doc.head.querySelectorAll('meta[property^="article:"]').length).toBe(0);
    expect(doc.getElementById('seo-json-ld')).toBeNull();
  });
});
