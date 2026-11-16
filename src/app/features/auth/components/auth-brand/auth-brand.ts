import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Paper brand panel beside the login form on large screens. */
@Component({
  selector: 'app-auth-brand',
  templateUrl: './auth-brand.html',
  styleUrl: './auth-brand.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthBrand {}
