import { inject, Injectable } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { DEFAULT_TITLE, Seo } from './seo';

/** Sets the route `title` and resets the SEO tags to route defaults on every navigation. */
@Injectable({ providedIn: 'root' })
export class SeoTitleStrategy extends TitleStrategy {
  private readonly seo = inject(Seo);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.seo.resetForRoute(this.buildTitle(snapshot) ?? DEFAULT_TITLE, snapshot.url);
  }
}
