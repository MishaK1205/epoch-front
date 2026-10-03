import { describe, expect, it } from 'vitest';
import { ArticleFormValue, diffArticleForm } from './article-form';

const base: ArticleFormValue = {
  title: 'რომის იმპერია',
  categoryId: 'c1',
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
});
