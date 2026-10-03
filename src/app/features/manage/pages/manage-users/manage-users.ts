import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { API_LIMITS } from '../../../../core/api/api-limits';
import { Role, ROLES } from '../../../../core/api/common.models';
import { UsersApi } from '../../../../core/api/users/users-api';
import { User } from '../../../../core/api/users/users.models';
import { AuthService } from '../../../../core/auth/auth-service';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago-pipe';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { getManageErrorMessages } from '../../manage-errors';
import { ROLE_BADGES, ROLE_LABELS, toPage } from '../../manage-labels';

const PAGE_SIZE = API_LIMITS.pagination.defaultLimit;

const ROLE_FILTERS: readonly { label: string; value: Role | null }[] = [
  { label: 'ყველა', value: null },
  { label: 'მომხმარებლები', value: 'user' },
  { label: 'მოდერატორები', value: 'moderator' },
  { label: 'ადმინები', value: 'admin' },
];

interface UserRow {
  user: User;
  self: boolean;
  control: FormControl<string>;
}

interface RoleChange {
  row: UserRow;
  role: Role;
}

function toRole(value: string | undefined): Role | undefined {
  return ROLES.find((role) => role === value);
}

/** `/manage/users?role=&page=` (admin): list users and change their roles. */
@Component({
  selector: 'app-manage-users',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TimeAgoPipe,
    Alert,
    Badge,
    ConfirmDialog,
    EmptyState,
    Pagination,
    Select,
    Spinner,
  ],
  templateUrl: './manage-users.html',
  styleUrls: ['../../manage-page.scss', './manage-users.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageUsers {
  private readonly usersApi = inject(UsersApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentUser = inject(AuthService).currentUser;
  private readonly roleDialog = viewChild.required<ConfirmDialog>('roleDialog');

  readonly page = input(1, { transform: toPage });
  readonly role = input(undefined, { transform: toRole });

  protected readonly filters = ROLE_FILTERS;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly roleBadges = ROLE_BADGES;
  protected readonly roleOptions: SelectOption[] = ROLES.map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
  }));

  protected readonly users = rxResource({
    params: () => ({ page: this.page(), role: this.role() }),
    stream: ({ params }) => this.usersApi.list({ ...params, limit: PAGE_SIZE }),
  });

  protected readonly change = signal<RoleChange | null>(null);
  protected readonly pendingId = signal<string | null>(null);
  protected readonly successMessage = signal('');
  protected readonly actionErrors = signal<string[]>([]);

  protected readonly rows = computed<UserRow[]>(() => {
    const users = this.users.hasValue() ? this.users.value().items : [];
    const currentId = this.currentUser()?.id;
    return users.map((user) => {
      const self = user.id === currentId;
      return {
        user,
        self,
        control: new FormControl(
          { value: user.role as string, disabled: self },
          {
            nonNullable: true,
          },
        ),
      };
    });
  });
  protected readonly totalPages = computed(() =>
    this.users.hasValue() ? Math.ceil(this.users.value().total / PAGE_SIZE) : 0,
  );
  protected readonly loadErrors = computed(() =>
    this.users.error() ? getManageErrorMessages(this.users.error()) : [],
  );
  protected readonly changeMessage = computed(() => {
    const change = this.change();
    return change
      ? `შევცვალოთ ${change.row.user.username}-ის როლი „${ROLE_LABELS[change.role]}“-ზე?`
      : '';
  });

  protected goToPage(page: number): void {
    void this.router.navigate([], { queryParams: { page }, queryParamsHandling: 'merge' });
  }

  protected onRoleSelected(row: UserRow, value: string): void {
    const role = toRole(value);
    if (!role || role === row.user.role) {
      return;
    }
    this.change.set({ row, role });
    this.roleDialog().open();
  }

  protected confirmChange(): void {
    const change = this.change();
    if (!change) {
      return;
    }
    const { row, role } = change;
    this.successMessage.set('');
    this.actionErrors.set([]);
    this.pendingId.set(row.user.id);
    row.control.disable();
    this.usersApi
      .updateRole(row.user.id, role)
      .pipe(
        finalize(() => this.pendingId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          this.successMessage.set(`${user.username}-ის როლი შეიცვალა: ${ROLE_LABELS[user.role]}.`);
          this.users.reload();
        },
        error: (err: unknown) => {
          row.control.enable();
          row.control.setValue(row.user.role);
          this.actionErrors.set(getManageErrorMessages(err));
        },
      });
  }

  protected cancelChange(): void {
    const change = this.change();
    change?.row.control.setValue(change.row.user.role);
  }
}
