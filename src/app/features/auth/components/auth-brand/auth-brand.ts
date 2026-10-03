import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';

/** Dark brand panel shown next to the login / register forms on large screens. */
@Component({
  selector: 'app-auth-brand',
  imports: [Icon],
  templateUrl: './auth-brand.html',
  styleUrl: './auth-brand.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthBrand {
  protected readonly year = new Date().getFullYear();
  protected readonly features = [
    'ყოველდღე ახალი სტატიები ისტორიასა და მეცნიერებაზე',
    'კატეგორიები და თეგები — იპოვეთ ის, რაც გაინტერესებთ',
    'შემოუერთდით მკითხველთა საზოგადოებას',
  ];
}
