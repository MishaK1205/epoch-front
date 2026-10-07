import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { WhatWhereWhenCategoriesApi } from '../../../../core/api/what-where-when/what-where-when-categories-api';
import { WhatWhereWhenCategory } from '../../../../core/api/what-where-when/what-where-when.models';
import { WwwCategories } from './www-categories';

const USED: WhatWhereWhenCategory = {
  id: '6ac654618280bf721188b701',
  name: 'Autumn cup',
  description: '',
  packageCount: 2,
  createdAt: '2026-10-07T14:17:05.548Z',
  updatedAt: '2026-10-07T14:17:05.548Z',
};

describe('WwwCategories', () => {
  it('does not call delete while the category has packages', async () => {
    const remove = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: WhatWhereWhenCategoriesApi,
          useValue: { list: () => of([USED]), delete: remove },
        },
      ],
    });
    const fixture = TestBed.createComponent(WwwCategories);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    element.querySelector<HTMLButtonElement>(`[aria-label="წაშლა: ${USED.name}"]`)?.click();
    await fixture.whenStable();

    expect(remove).not.toHaveBeenCalled();
    expect(element.querySelector('.alerts')?.textContent).toContain('2 პაკეტია');
    expect(element.querySelector('.alerts a')?.getAttribute('href')).toBe(
      `/manage/what-where-when?categoryId=${USED.id}`,
    );
  });
});
