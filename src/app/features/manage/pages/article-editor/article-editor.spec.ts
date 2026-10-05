import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ArticlesApi } from '../../../../core/api/articles/articles-api';
import { Article, UpdateArticleRequest } from '../../../../core/api/articles/articles.models';
import { Category } from '../../../../core/api/categories/categories.models';
import { CategoriesStore } from '../../../../core/services/categories-store';
import { RichTextEditor } from '../../components/rich-text-editor/rich-text-editor';
import { ArticleEditor } from './article-editor';

/** Replaces the Quill editor (dynamic import, real DOM APIs) with a plain CVA. */
@Component({
  selector: 'app-rich-text-editor',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: StubRichTextEditor, multi: true }],
})
class StubRichTextEditor implements ControlValueAccessor {
  readonly label = input('');
  readonly placeholder = input('');
  readonly errorMessages = input<Partial<Record<string, string>>>({});
  writeValue(): void {}
  registerOnChange(): void {}
  registerOnTouched(): void {}
}

function category(id: string, subcategoryIds: string[]): Category {
  const summary = { id, name: id, slug: id };
  return {
    ...summary,
    parent: null,
    articleCount: 0,
    createdAt: '',
    updatedAt: '',
    subcategories: subcategoryIds.map((subId) => ({
      id: subId,
      name: subId,
      slug: subId,
      parent: summary,
      articleCount: 0,
      createdAt: '',
      updatedAt: '',
    })),
  };
}

const TREE: Category[] = [category('c1', ['s1', 's2']), category('c2', ['s3'])];

const ARTICLE: Article = {
  id: 'a1',
  title: 'რომის იმპერია',
  slug: 'romis-imperia',
  excerpt: '',
  content: '<p>ტექსტი</p>',
  coverImage: { id: 'i1', url: 'https://example.com/i1.jpg' },
  category: { id: 'c1', name: 'c1', slug: 'c1' },
  subcategory: { id: 's1', name: 's1', slug: 's1' },
  tags: [],
  author: null,
  status: 'draft',
  publishedAt: null,
  createdAt: '',
  updatedAt: '',
};

async function setup() {
  const update = vi.fn((_id: string, _body: UpdateArticleRequest) => of(ARTICLE));
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ArticlesApi, useValue: { getManaged: () => of(ARTICLE), update } },
      {
        provide: CategoriesStore,
        useValue: {
          categories: signal(TREE),
          findTopLevelById: (id: string) => TREE.find((item) => item.id === id),
          reload: vi.fn(),
        },
      },
    ],
  });
  TestBed.overrideComponent(ArticleEditor, {
    remove: { imports: [RichTextEditor] },
    add: { imports: [StubRichTextEditor] },
  });
  const fixture = TestBed.createComponent(ArticleEditor);
  fixture.componentRef.setInput('id', 'a1');
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const selects = () =>
    Array.from(element.querySelectorAll<HTMLSelectElement>('.editor__categories select'));
  const pick = async (select: HTMLSelectElement, value: string) => {
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  const save = async () => {
    element.querySelector<HTMLFormElement>('form.editor')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };
  return { selects, pick, save, update };
}

describe('ArticleEditor category pickers', () => {
  it('keeps the prefilled subcategory when loading an existing article', async () => {
    const { selects } = await setup();

    const [categorySelect, subcategorySelect] = selects();
    expect(categorySelect.value).toBe('c1');
    expect(subcategorySelect.value).toBe('s1');
    expect(Array.from(subcategorySelect.options).map((option) => option.value)).toEqual([
      '',
      's1',
      's2',
    ]);
  });

  it('resets the subcategory when the user picks another category and sends both fields', async () => {
    const { selects, pick, save, update } = await setup();

    await pick(selects()[0], 'c2');
    const subcategorySelect = selects()[1];
    expect(subcategorySelect.value).toBe('');
    expect(Array.from(subcategorySelect.options).map((option) => option.value)).toEqual(['', 's3']);

    await save();
    expect(update).toHaveBeenCalledWith('a1', { categoryId: 'c2', subcategoryId: null });
  });

  it('sends subcategoryId: null when the user removes the subcategory', async () => {
    const { selects, pick, save, update } = await setup();

    await pick(selects()[1], '');
    await save();

    expect(update).toHaveBeenCalledWith('a1', { subcategoryId: null });
  });
});
