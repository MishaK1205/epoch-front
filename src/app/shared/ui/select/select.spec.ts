import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Select, SelectOption } from './select';

@Component({
  imports: [ReactiveFormsModule, Select],
  template: `<app-select
    [formControl]="control"
    label="კატეგორია"
    placeholder="აირჩიეთ"
    [options]="options"
    [hideLabel]="hideLabel"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly control = new FormControl('b', { nonNullable: true, validators: Validators.required });
  readonly options: SelectOption[] = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ];
  hideLabel = false;
}

describe('Select', () => {
  async function setup(hideLabel = false) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.hideLabel = hideLabel;
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const select = element.querySelector('select') as HTMLSelectElement;
    const label = element.querySelector('label') as HTMLLabelElement;
    return { fixture, select, label };
  }

  it('renders the placeholder and options and links the label', async () => {
    const { select, label } = await setup();

    expect(select.options.length).toBe(3);
    expect(select.value).toBe('b');
    expect(label.htmlFor).toBe(select.id);
    expect(select.getAttribute('aria-required')).toBe('true');
  });

  it('writes the picked value to the form control', async () => {
    const { fixture, select } = await setup();

    select.value = 'a';
    select.dispatchEvent(new Event('change'));

    expect(fixture.componentInstance.control.value).toBe('a');
    expect(fixture.componentInstance.control.touched).toBe(true);
  });

  it('visually hides the label with hideLabel', async () => {
    const { label } = await setup(true);

    expect(label.classList).toContain('visually-hidden');
  });
});
