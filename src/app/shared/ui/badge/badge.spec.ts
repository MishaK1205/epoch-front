import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Badge } from './badge';

@Component({
  imports: [Badge],
  template: `<app-badge variant="success">გამოქვეყნებული</app-badge>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {}

describe('Badge', () => {
  it('renders projected text with the variant class', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const badge = (fixture.nativeElement as HTMLElement).querySelector('app-badge') as HTMLElement;

    expect(badge.textContent?.trim()).toBe('გამოქვეყნებული');
    expect(badge.classList).toContain('badge');
    expect(badge.classList).toContain('badge--success');
  });
});
