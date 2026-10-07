import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { WhatWhereWhenApi } from '../../../../core/api/what-where-when/what-where-when-api';
import { WhatWhereWhenCategoriesApi } from '../../../../core/api/what-where-when/what-where-when-categories-api';
import {
  CreateWhatWhereWhenRequest,
  UpdateWhatWhereWhenRequest,
  WhatWhereWhenCategory,
  WhatWhereWhenPackage,
} from '../../../../core/api/what-where-when/what-where-when.models';
import { RichTextEditor } from '../../components/rich-text-editor/rich-text-editor';
import { WwwQuestionCard } from '../../components/www-question-card/www-question-card';
import { WwwPackageEditor } from './www-package-editor';

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
  readonly focusOnInit = input(false);
  readonly errorMessages = input<Partial<Record<string, string>>>({});
  writeValue(): void {}
  registerOnChange(): void {}
  registerOnTouched(): void {}
}

function category(id: string, name: string): WhatWhereWhenCategory {
  return {
    id,
    name,
    description: '',
    packageCount: 1,
    createdAt: '2026-10-07T14:17:05.548Z',
    updatedAt: '2026-10-07T14:17:05.548Z',
  };
}

const AUTUMN = category('6ac654618280bf721188b701', 'Autumn cup');
const SPRING = category('6ac654618280bf721188b702', 'Spring cup');

const PACKAGE: WhatWhereWhenPackage = {
  id: '6ac64e4e592927df3acc336b',
  name: 'Autumn cup, round 1',
  authors: ['Giorgi', 'Nino'],
  category: null,
  date: '2026-10-07',
  questionCount: 2,
  createdAt: '2026-10-07T13:51:10.878Z',
  updatedAt: '2026-10-07T13:51:10.878Z',
  questions: [
    { question: '<p>First</p>', answer: 'One', comment: 'IV century' },
    { question: '<p>Second</p>', answer: 'Two', comment: '' },
  ],
};

interface SetupOptions {
  id?: string;
  categoryId?: string;
  pkg?: WhatWhereWhenPackage;
}

async function setup({ id, categoryId, pkg = PACKAGE }: SetupOptions = {}) {
  const update = vi.fn((_id: string, body: UpdateWhatWhereWhenRequest) =>
    of({ ...pkg, ...body, questions: pkg.questions }),
  );
  const create = vi.fn((body: CreateWhatWhereWhenRequest) =>
    of({ ...pkg, ...body, questions: pkg.questions }),
  );
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: WhatWhereWhenApi, useValue: { get: () => of(pkg), update, create } },
      { provide: WhatWhereWhenCategoriesApi, useValue: { list: () => of([AUTUMN, SPRING]) } },
    ],
  });
  TestBed.overrideComponent(WwwQuestionCard, {
    remove: { imports: [RichTextEditor] },
    add: { imports: [StubRichTextEditor] },
  });
  const fixture = TestBed.createComponent(WwwPackageEditor);
  if (id) {
    fixture.componentRef.setInput('id', id);
  }
  if (categoryId) {
    fixture.componentRef.setInput('categoryId', categoryId);
  }
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const titles = () =>
    Array.from(element.querySelectorAll('.card__title')).map((title) => title.textContent?.trim());
  const answers = () =>
    Array.from(element.querySelectorAll<HTMLTextAreaElement>('app-www-question-card textarea'))
      .filter((_, index) => index % 2 === 0)
      .map((textarea) => textarea.value);
  const categorySelect = () => {
    const select = element.querySelector<HTMLSelectElement>('.editor__category select');
    if (!select) {
      throw new Error('category select missing');
    }
    return select;
  };
  const click = async (selector: string, index = 0) => {
    element.querySelectorAll<HTMLButtonElement>(selector)[index]?.click();
    await fixture.whenStable();
  };
  const clickText = async (text: string) => {
    Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes(text))
      ?.click();
    await fixture.whenStable();
  };
  const save = async () => {
    element.querySelector<HTMLFormElement>('form.editor')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };
  return { element, titles, answers, categorySelect, click, clickText, save, update, create };
}

describe('WwwPackageEditor', () => {
  it('adds an empty question card', async () => {
    const { titles, answers, clickText } = await setup();
    expect(titles()).toEqual([]);

    await clickText('კითხვის დამატება');
    await clickText('კითხვის დამატება');

    expect(titles()).toEqual(['კითხვა 1', 'კითხვა 2']);
    expect(answers()).toEqual(['', '']);
  });

  it('prefills the questions and reorders them with move up / down', async () => {
    const { answers, click } = await setup({ id: PACKAGE.id });
    expect(answers()).toEqual(['One', 'Two']);

    await click('[aria-label="კითხვა 1: ქვემოთ ჩამოწევა"]');
    expect(answers()).toEqual(['Two', 'One']);

    await click('[aria-label="კითხვა 2: ზემოთ აწევა"]');
    expect(answers()).toEqual(['One', 'Two']);
  });

  it('sends the full, trimmed question list on update', async () => {
    const { element, save, update } = await setup({ id: PACKAGE.id });
    const answer = element.querySelector<HTMLTextAreaElement>('app-www-question-card textarea');
    if (!answer) {
      throw new Error('answer textarea missing');
    }
    answer.value = '  Changed  ';
    answer.dispatchEvent(new Event('input'));

    await save();

    expect(update).toHaveBeenCalledWith(PACKAGE.id, {
      name: 'Autumn cup, round 1',
      date: '2026-10-07',
      categoryId: null,
      authors: ['Giorgi', 'Nino'],
      questions: [
        { question: '<p>First</p>', answer: 'Changed', comment: 'IV century' },
        { question: '<p>Second</p>', answer: 'Two' },
      ],
    });
  });

  it('preselects the category of the edited package', async () => {
    const { categorySelect } = await setup({
      id: PACKAGE.id,
      pkg: { ...PACKAGE, category: { id: SPRING.id, name: SPRING.name } },
    });

    expect(categorySelect().value).toBe(SPRING.id);
  });

  it('sends categoryId: null after choosing "No category"', async () => {
    const { categorySelect, save, update } = await setup({
      id: PACKAGE.id,
      pkg: { ...PACKAGE, category: { id: AUTUMN.id, name: AUTUMN.name } },
    });
    const select = categorySelect();
    select.value = '';
    select.dispatchEvent(new Event('change'));

    await save();

    expect(update.mock.calls[0]?.[1].categoryId).toBeNull();
  });

  it('preselects ?categoryId= in create mode and sends it', async () => {
    const { element, categorySelect, save, create } = await setup({ categoryId: AUTUMN.id });
    expect(categorySelect().value).toBe(AUTUMN.id);

    const name = element.querySelector<HTMLInputElement>('.editor__name input');
    if (!name) {
      throw new Error('name input missing');
    }
    name.value = 'Round 2';
    name.dispatchEvent(new Event('input'));
    await save();

    expect(create.mock.calls[0]?.[0].categoryId).toBe(AUTUMN.id);
  });
});
