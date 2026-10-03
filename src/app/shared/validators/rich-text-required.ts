import { AbstractControl, ValidationErrors } from '@angular/forms';

/** True when the HTML has no visible text and no `<img>`. */
export function isRichTextEmpty(html: string): boolean {
  if (/<img[\s>]/i.test(html)) {
    return false;
  }
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .trim();
  return text.length === 0;
}

/** Like `Validators.required` for editor HTML (`<p><br></p>` counts as empty). */
export function richTextRequired(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return typeof value !== 'string' || isRichTextEmpty(value) ? { required: true } : null;
}
