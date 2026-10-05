import { describe, expect, it } from 'vitest';
import { ArticleFormValue, diffArticleForm, toCreateRequest } from './article-form';

const base: ArticleFormValue = {
  title: 'რომის იმპერია',
  categoryId: 'c1',
  subcategoryId: 's1',
  coverImageId: 'i1',
  tags: ['rome', 'history'],
  content: '<p>ტექსტი</p>',
};

describe('diffArticleForm', () => {
  it('returns an empty object when nothing changed (tag order ignored)', () => {
    expect(
      diffArticleForm(base, { ...base, title: ` ${base.title} `, tags: ['history', 'rome'] }),
    ).toEqual({});
  });

  it('returns only the changed fields', () => {
    expect(
      diffArticleForm(base, {
        ...base,
        coverImageId: 'i2',
        tags: ['rome'],
        content: '<p>ახალი</p>',
      }),
    ).toEqual({ coverImageId: 'i2', tags: ['rome'], content: '<p>ახალი</p>' });
  });

  it('sends the trimmed title', () => {
    expect(diffArticleForm(base, { ...base, title: '  ახალი სათაური ' })).toEqual({
      title: 'ახალი სათაური',
    });
  });

  it('sends subcategoryId: null (not "" and not omitted) when the subcategory is removed', () => {
    expect(diffArticleForm(base, { ...base, subcategoryId: '' })).toEqual({ subcategoryId: null });
  });

  it('sends only subcategoryId when just the subcategory changed', () => {
    expect(diffArticleForm(base, { ...base, subcategoryId: 's2' })).toEqual({
      subcategoryId: 's2',
    });
  });

  it('sends both fields when the category changes', () => {
    expect(diffArticleForm(base, { ...base, categoryId: 'c2', subcategoryId: '' })).toEqual({
      categoryId: 'c2',
      subcategoryId: null,
    });
    expect(diffArticleForm(base, { ...base, categoryId: 'c2', subcategoryId: 's9' })).toEqual({
      categoryId: 'c2',
      subcategoryId: 's9',
    });
  });
});

describe('toCreateRequest', () => {
  it('omits subcategoryId when none is chosen', () => {
    const body = toCreateRequest({ ...base, subcategoryId: '' });

    expect(body).toEqual({
      title: base.title,
      content: base.content,
      coverImageId: 'i1',
      categoryId: 'c1',
      tags: base.tags,
    });
    expect('subcategoryId' in body).toBe(false);
  });

  it('sends the chosen subcategory', () => {
    expect(toCreateRequest(base).subcategoryId).toBe('s1');
  });
});
