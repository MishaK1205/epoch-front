import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhatWhereWhenQuestion } from '../../../core/api/what-where-when/what-where-when.models';
import { WwwQuestionList } from './www-question-list';

const QUESTIONS: WhatWhereWhenQuestion[] = [
  { question: '<p>პირველი</p>', answer: 'ერთი', comment: 'კომენტარი' },
  { question: '<p>მეორე</p>', answer: 'ორი', comment: '' },
];

@Component({
  imports: [WwwQuestionList],
  template: `<app-www-question-list [questions]="questions()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly questions = signal(QUESTIONS);
}

describe('WwwQuestionList', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;

  const answers = () => [...element.querySelectorAll<HTMLElement>('.question__answer')];
  const toggles = () => [...element.querySelectorAll<HTMLButtonElement>('.question__toggle')];
  const toggleAll = () => element.querySelector<HTMLButtonElement>('.toolbar button')!;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('renders every question with all answers collapsed', () => {
    expect(element.querySelectorAll('.question').length).toBe(2);
    expect(element.querySelector('.question__body')?.innerHTML).toContain('პირველი');
    expect(answers().every((answer) => answer.hidden)).toBe(true);
    expect(toggles().map((button) => button.getAttribute('aria-expanded'))).toEqual([
      'false',
      'false',
    ]);
  });

  it('opens and closes one answer', async () => {
    toggles()[1].click();
    await fixture.whenStable();

    expect(answers().map((answer) => answer.hidden)).toEqual([true, false]);
    expect(toggles()[1].getAttribute('aria-expanded')).toBe('true');
    expect(answers()[1].textContent).toContain('ორი');

    toggles()[1].click();
    await fixture.whenStable();
    expect(answers()[1].hidden).toBe(true);
  });

  it('opens all answers, then closes all', async () => {
    toggleAll().click();
    await fixture.whenStable();
    expect(answers().every((answer) => !answer.hidden)).toBe(true);
    expect(toggleAll().textContent).toContain('ყველა პასუხის დამალვა');

    toggleAll().click();
    await fixture.whenStable();
    expect(answers().every((answer) => answer.hidden)).toBe(true);
  });

  it('collapses the answers again for a new question list', async () => {
    toggleAll().click();
    await fixture.whenStable();

    fixture.componentInstance.questions.set([...QUESTIONS]);
    await fixture.whenStable();
    expect(answers().every((answer) => answer.hidden)).toBe(true);
  });
});
