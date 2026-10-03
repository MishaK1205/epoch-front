# Epoch Front — Project Guidelines

Source of truth for how this project is structured and how code is written.
Read this file **before every task**. If a task requires breaking a rule here, say so explicitly
and update this file in the same change.

## Stack

- Angular 21 (standalone, **zoneless** — there is no `zone.js`), TypeScript 5.9 strict mode
- RxJS 7.8, SCSS, Vitest (`ng test`), Prettier (`printWidth: 100`, single quotes)
- Component selector prefix: `app-` (directives: `app` camelCase attribute, e.g. `appAutofocus`)

---

## 1. Folder structure

```
src/
├── app/
│   ├── core/                     # App-wide singletons. Loaded once. Never imported by shared/.
│   │   ├── api/                  # ALL HTTP API services + DTOs, grouped by backend resource
│   │   │   └── users/
│   │   │       ├── users-api.ts
│   │   │       └── users.models.ts
│   │   ├── auth/                 # auth state service, auth guard, auth interceptor
│   │   ├── interceptors/         # functional HTTP interceptors (non-auth)
│   │   ├── guards/               # functional route guards used by more than one feature
│   │   ├── services/             # global app services (notifications, theme, storage, logger…)
│   │   ├── layout/               # app shell: header, sidebar, footer, main layout
│   │   └── tokens/               # InjectionTokens (API base URL, config…)
│   │
│   ├── shared/                   # Reusable, feature-agnostic building blocks. No business logic.
│   │   ├── ui/                   # presentational components (button, modal, table, spinner…)
│   │   │   └── button/
│   │   │       ├── button.ts
│   │   │       ├── button.html
│   │   │       ├── button.scss
│   │   │       └── button.spec.ts
│   │   ├── directives/
│   │   ├── pipes/
│   │   ├── validators/           # reusable form validators
│   │   ├── utils/                # pure functions (no Angular DI)
│   │   └── models/               # generic types (Pagination, ApiError, Nullable<T>…)
│   │
│   ├── features/                 # One folder per business domain / route area
│   │   └── <feature>/
│   │       ├── <feature>.routes.ts       # lazy-loaded routes for this feature
│   │       ├── pages/                    # routed (smart) components
│   │       │   └── <feature>-list/
│   │       ├── components/               # components used ONLY inside this feature
│   │       ├── services/                 # feature state / facade services
│   │       └── models/                   # feature-only view models & types
│   │
│   ├── app.ts / app.html / app.scss
│   ├── app.config.ts             # providers (router, http, interceptors…)
│   └── app.routes.ts             # top-level routes, lazy-loads features
├── environments/                 # create with `ng g environments` when needed
└── styles/                       # global SCSS partials (_variables, _mixins, _reset…) used by styles.scss
```

### Dependency rules (who may import whom)

| Layer      | May import from                                                   |
| ---------- | ----------------------------------------------------------------- |
| `features` | `core`, `shared`                                                  |
| `core`     | `shared`                                                          |
| `shared`   | nothing app-specific (only Angular/libs and other `shared` files) |

- A feature **must not** import from another feature. If two features need the same thing, move it
  to `shared/` (if generic UI/logic) or `core/` (if it's a singleton/service/API).
- Every feature is **lazy-loaded** via `loadChildren` / `loadComponent` in `app.routes.ts`.

---

## 2. Naming conventions (Angular 20+ style guide)

- Files: `kebab-case`. No `.component` / `.service` / `.directive` suffixes (CLI default since v20).
  - Component `UserCard` → `user-card.ts`, `user-card.html`, `user-card.scss`, `user-card.spec.ts`
  - Service → name the class by what it does: `Notifications` in `notifications.ts`
  - API service → `UsersApi` in `users-api.ts`
  - Directive `Autofocus` → `autofocus.ts`
  - Pipe `TimeAgoPipe` → `time-ago-pipe.ts`; guard `authGuard` → `auth-guard.ts`;
    interceptor `authInterceptor` → `auth-interceptor.ts`; models → `*.models.ts`
- Use the Angular CLI to generate (`ng g c`, `ng g s`, `ng g d`, `ng g p`, `ng g guard`,
  `ng g interceptor`) so naming stays consistent.
- One component / directive / pipe / service per file.
- Each component lives in its own folder with its template and styles as separate files
  (`templateUrl` / `styleUrl`). Inline templates are allowed only for trivial (< ~10 lines) components.

---

## 3. When to create what

### Shared component (`shared/ui/`)

Create one when **all** of these are true:

- The UI piece is used (or clearly will be used) in **2+ features**, or it's a design-system
  primitive (button, input, modal, card, table, badge, spinner, empty-state…).
- It is **presentational**: data in via `input()`, events out via `output()`. It does not inject
  API services, router state or feature services.
- It has no knowledge of business domain types (prefer generic inputs over `User`, `Order`…).

If it's used by one feature only → put it in `features/<feature>/components/`. Move it to `shared/`
only when a second feature needs it (don't predict reuse too early).

### Directive (`shared/directives/`)

Use a directive when you need to add **behavior to an existing element/component without its own
template**:

- DOM behavior: autofocus, click-outside, infinite scroll, intersection observer, drag handles
- Attribute/host manipulations: tooltips, permission-based hide/disable (`*appHasRole`)
- Input behavior: digits-only, mask, trim on blur

If it needs its own markup → it's a component, not a directive.

### Pipe (`shared/pipes/`)

Use a pipe for **pure, synchronous value transformation in templates**:

- formatting (dates/relative time, file size, currency variants, truncation, initials)
- mapping enums/codes to labels

Rules: pipes are `pure` (default) and stateless; no HTTP, no side effects. Don't create a pipe for
something only one component needs — use a `computed()` signal in that component instead.

### Service

- **API service** (`core/api/<resource>/<resource>-api.ts`): the _only_ place that uses `HttpClient`.
  One per backend resource. Thin: builds the request, returns `Observable<T>` (or an
  `httpResource`), maps DTOs if needed. No UI state, no toasts, no navigation.
- **Feature state / facade service** (`features/<feature>/services/`): holds feature state in
  signals, calls API services, exposes read-only signals + methods to components. Provide it in the
  feature route `providers` or the page component if state should be scoped/reset.
- **Global service** (`core/services/`): app-wide singletons (`providedIn: 'root'`) — auth state,
  notifications/toasts, theme, local storage wrapper, logger.
- Create a service when logic is shared by multiple components, holds state that outlives a
  component, or talks to the outside world (HTTP, storage, browser APIs). Otherwise keep the logic
  in the component.

### Epoch API client (already implemented — reuse it)

- Import from the barrel `core/api` (`import { ArticlesApi, Article } from '../core/api'`).
- API classes: `AuthApi`, `UsersApi`, `CategoriesApi`, `ImagesApi`, `ArticlesApi`, `TagsApi`.
- Auth state: `AuthService` (`core/auth/auth-service.ts`) — use it (not `AuthApi`) for login,
  register, logout, `currentUser` and role signals. Guards: `authGuard`, `guestGuard`, `roleGuard(...)`.
- Redirect URLs for guards / 401 handling: override the `AUTH_CONFIG` token (`core/tokens`).
- Show errors with `getApiErrorMessages(err)`; validate forms with `API_LIMITS`.
- URLs always come from `environment.apiUrl`; encode path segments with `encodeURIComponent`.
- Quill editor: use helpers from `core/editor/quill-image-handler.ts`; never enable the video
  button. Use the `RichTextEditor` CVA (`features/manage/components/rich-text-editor`), which
  loads Quill with a dynamic `import('quill')` inside `afterNextRender` (keep it a lazy chunk —
  only `import type Quill` at the top level). Quill's CSS is global (`angular.json` styles), and
  overrides live in `src/styles/_quill.scss` (not in component styles). Render stored article HTML
  inside `<div class="ql-editor">` so lists and content typography match the editor.

### Utils (`shared/utils/`)

Pure TypeScript functions with no DI and no Angular dependencies (date helpers, array helpers,
type guards). Prefer a util over a service when no state or injection is needed.

### Guards / Interceptors / Resolvers

Always **functional** (`CanActivateFn`, `HttpInterceptorFn`, `ResolveFn`). Never class-based.

---

## 4. Modern Angular syntax (mandatory)

### Components

```ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-user-card',
  imports: [TimeAgoPipe],
  templateUrl: './user-card.html',
  styleUrl: './user-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'user-card', '[class.active]': 'active()' },
})
export class UserCard {
  private readonly users = inject(UsersFacade);

  readonly user = input.required<User>();
  readonly active = input(false);
  readonly selected = output<User>();

  protected readonly fullName = computed(() => `${this.user().firstName} ${this.user().lastName}`);
}
```

- Standalone is the default — **do not** write `standalone: true`. No `NgModule`s.
- Always `changeDetection: ChangeDetectionStrategy.OnPush`.
- DI with `inject()` — **no constructor injection**.
- `input()`, `input.required()`, `output()`, `model()` — **no** `@Input()` / `@Output()` decorators.
- `viewChild()`, `viewChildren()`, `contentChild()`, `contentChildren()` — no decorator queries.
- Host bindings/listeners via the `host` object — **no** `@HostBinding` / `@HostListener`.
- Members used only in the template are `protected`; injected deps are `private readonly`;
  everything that doesn't get reassigned is `readonly`.
- Import only what the template uses in `imports: [...]` (not `CommonModule`).

### State: signals first

- Local state: `signal()`. Derived state: `computed()`. Derived-but-resettable: `linkedSignal()`.
- `effect()` only for side effects that must sync to the outside world (localStorage, logging,
  3rd-party DOM libs). **Never** use `effect()` to set other signals — use `computed`/`linkedSignal`.
- Update with `.set()` / `.update()`; never mutate arrays/objects inside a signal — create new ones.
- Services expose state as read-only: `readonly items = this._items.asReadonly();`.
- The app is **zoneless**: UI updates only on signal changes, template events, `async` pipe, or
  `markForCheck`. Mutating plain class fields from async code will NOT update the view — use signals.

### Async data

- Data loading into components: prefer `httpResource()` / `resource()` / `rxResource()`, or
  `toSignal()` on an observable. Avoid manual `subscribe()` in components.
- If you must subscribe, use `takeUntilDestroyed()` (inject `DestroyRef` outside injection context).
- RxJS is for streams/events composition (debounce search, websockets); signals for state.
- `HttpClient` is configured with `provideHttpClient(withInterceptors([...]))`. Do **not** add
  `withFetch()`: the fetch backend can't report upload progress (`ImagesApi.uploadWithProgress`).

### Templates

- Built-in control flow only: `@if`, `@else`, `@for (...; track item.id)`, `@empty`, `@switch`,
  `@defer`. **No** `*ngIf`, `*ngFor`, `*ngSwitch`.
- `track` must use a stable unique id (`track item.id`), not `$index`, unless the list is static.
- `@let` for local template variables.
- `[class.x]` / `[style.x]` bindings — **no** `ngClass` / `ngStyle`.
- No function calls in templates except signal reads; use `computed()` for derived values.
- Use `@defer` for heavy, below-the-fold or rarely shown UI.
- Use `NgOptimizedImage` (`ngSrc`) for static images. There is no image loader, so don't set
  `sizes` with pixel values — in dev mode that throws NG02952 and aborts rendering.
- Self-closing tags for components without content: `<app-spinner />`.

### Forms

- Reactive forms, strictly typed (`FormGroup<{...}>`, `NonNullableFormBuilder` via
  `inject(NonNullableFormBuilder)`). No template-driven `ngModel` forms for non-trivial forms.
- Reusable validators go to `shared/validators/`.

### Routing

- Lazy-load everything: `loadComponent: () => import('./pages/x/x').then(m => m.X)` or
  `loadChildren: () => import('./features/x/x.routes').then(m => m.X_ROUTES)`.
- Route params as inputs: enable `withComponentInputBinding()` and read params via `input()`.
- Functional guards/resolvers only.

### TypeScript

- Strict typing. **No `any`** — use `unknown` + narrowing, or proper types/generics.
- Use `interface` for object shapes (DTOs/models), `type` for unions/aliases.
- Prefer union string literal types or `as const` objects over `enum`.
- Use the `private` keyword for private members (not `#private` fields).
- No unused imports / variables. Keep functions small and single-purpose.

### Styles & design system (mandatory)

- **Design system file: `src/styles/_design-system.scss`.** It defines every color, font, font
  size, weight, line height, spacing step, radius, shadow, duration, z-index and breakpoint.
  Every component/page style must use these tokens — **no hard-coded colors, font sizes, spacing,
  radii or shadows**. If a value is missing, add a token there first.
  - Runtime tokens are CSS variables: `color: var(--color-ink); padding: var(--space-4);`
  - Prefer semantic tokens (`--color-text-muted`, `--color-accent`) over raw `--palette-*`.
  - The `:root` block is emitted once from `src/styles.scss` (`@include ds.tokens`).
- **Mixins: `src/styles/_mixins.scss`** — `up(md)` / `down(md)` media queries, `container()`,
  `display-text` (uppercase heading style), `focus-ring`, `visually-hidden`, `line-clamp(n)`,
  `reset-button`. Use in component SCSS with `@use 'mixins' as *;` (`src/styles` is on the Sass
  include path, so no relative paths).
- Global files: `_reset.scss` (CSS reset), `_base.scss` (body/heading/link defaults,
  `.visually-hidden`). Don't add component styles there.
- Fonts: `Google Sans` (UI, headings; weights 400–700, Georgian subset included, falls back to
  `Noto Sans Georgian`) and `Noto Serif Georgian` (long text, excerpts),
  loaded in `src/index.html`. UI language is **Georgian** — all user-facing text is Georgian.
- Visual style follows mentalfloss.com with modern product-UI polish: white header with uppercase
  logo casting a shadow onto a slim navy (`--color-accent`, `#071824`) strip, black (`--color-ink`) primary buttons with soft
  depth, uppercase display headings with a thick black underline, dark-slate footer
  (`--color-footer-*`) with a centered logo. Controls share `--radius-control`.
  Guest header auth is not buttons: small navy text links (`შესვლა | რეგისტრაცია`,
  `--color-accent`, `--text-sm`) with no filled background. Registration hides below the `sm`
  breakpoint.
- Static accent text and **text** hover/focus on light backgrounds (article titles, drawer links,
  kickers) use `--color-accent-text` (navy-700, `#1d5a87`, ~7.3:1 on white). Solid fills — the header
  strip, accent buttons, selection — use `--color-accent` (`#071824`). `#071824` is too close to black
  to read as a text hover, and too dark to show on the footer or auth panel, so those surfaces use
  `--color-accent-on-dark` (navy-400, `#7ba4c1`). Kicker links darken from `--color-accent-text` to
  `--color-accent` on hover.
- Focus: `--focus-ring` (white gap + ink ring) via the `focus-ring` mixin; `--focus-ring-inverse`
  on dark surfaces; inputs use `--focus-ring-accent` / `--focus-ring-danger`.
- Motion: wrap transforms/animations in `@include motion-ok { … }` (prefers-reduced-motion);
  use `--easing-out` for entrances and `--easing-spring` for pops.
- SCSS, component-scoped, mobile-first (`@include up(md)` for larger screens).
- Respect the component style budget (warning 4kB, error 8kB).
- No `::ng-deep`. Style children through their inputs/CSS variables instead.

### Shared UI kit (`shared/ui/`) — use these, don't re-implement

No third-party UI libraries. If a page needs a UI element that doesn't exist, create a custom
component (in `shared/ui/` if generic, else in the feature) that uses the design system.

| Component       | Usage                                                                                                                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`        | `<button appButton variant="primary\|accent\|outline\|ghost\|inverse\|danger\|danger-ghost" size="sm\|md\|lg" fullWidth pill [loading]>` — also on `<a appButton>`; icons via `<app-icon btnIconStart … />` / `btnIconEnd` |
| `InputField`    | `<app-input-field formControlName="x" label="…" type="text\|email\|password…" hint="…" [errorMessages]="{…}" />`                                                                                                           |
| `TextareaField` | `<app-textarea-field formControlName="x" label="…" [rows]="4" [maxlength]="500" showCount hint="…" [errorMessages]="{…}" />`                                                                                               |
| `Select`        | `<app-select formControlName="x" label="…" [options]="[{ value, label }]" placeholder="…" hideLabel hint="…" (selectionChange)="…" />`                                                                                     |
| `Checkbox`      | `<app-checkbox formControlName="x">label content</app-checkbox>`                                                                                                                                                           |
| `Alert`         | `<app-alert variant="error\|success\|info">…</app-alert>`                                                                                                                                                                  |
| `Badge`         | `<app-badge variant="neutral\|success\|accent\|info">text</app-badge>`                                                                                                                                                     |
| `EmptyState`    | `<app-empty-state icon="image" title="…" description="…">actions</app-empty-state>`                                                                                                                                        |
| `ConfirmDialog` | `<app-confirm-dialog #dlg title="…" message="…" confirmLabel="…" danger (confirmed) (cancelled) />` + `dlg.open()` (native `<dialog>`; Escape/backdrop/cancel → `cancelled`)                                               |
| `Spinner`       | `<app-spinner size="sm\|md\|lg" />`                                                                                                                                                                                        |
| `Pagination`    | `<app-pagination [page] [totalPages] (pageChange) />`                                                                                                                                                                      |
| `Icon`          | `<app-icon name="menu" [size]="20" />` — add new icons to `icon.html` + `IconName`                                                                                                                                         |

Auth-only components live in `features/auth/components/`: `AuthCard` (split-screen page shell),
`AuthBrand` (dark brand panel), `PasswordStrength` (`<app-password-strength [password] />`).

### Management area (`features/manage`) and article page (`features/articles`)

- `/manage` is guarded by `roleGuard('moderator', 'admin')`; `categories` and `users` add
  `roleGuard('admin')`. `ManageShell` renders the "მართვა" kicker, the h1 (route `title` without
  " — Epoch") and role-aware tabs. The server enforces permissions; the UI only hides/disables.
- Manage-only components (`RichTextEditor`, `CoverImagePicker`, `TagsInput`, `ArticleRow`,
  `CategoryForm`) live in `features/manage/components/`. List pages share
  `features/manage/manage-page.scss`.
- Show manage API errors with `getManageErrorMessages(err)` (`manage-errors.ts`) — it translates
  backend messages and falls back to `getApiErrorMessages`.
- Editors with unsaved state implement `HasUnsavedChanges.canDeactivate()` (return `true` or a
  `Promise<boolean>` resolved from a `ConfirmDialog`) and use `canDeactivate: [unsavedChangesGuard]`
  on the route, plus a `(window:beforeunload)` host listener.
- One-off messages after navigation (e.g. "created", "deleted") are passed through router
  navigation `state` and read once from `router.currentNavigation()` in the target component.
- `/articles/:slug` (`ArticleDetail`) renders content with `bypassSecurityTrustHtml` because
  Angular's sanitizer strips `data-list` (needed by Quill lists); the backend sanitizes the HTML.

Form controls (`InputField`, `Checkbox`) inject `NgControl` themselves and mirror the control
state into signals via `ControlState` (`shared/ui/form-control/control-state.ts`) — follow that
pattern for new form controls. Validation messages come from
`shared/validators/validation-messages.ts` (Georgian); override per field with `errorMessages`.

### Layout

- `core/layout/main-layout` wraps every page (header + `<main>` + footer). Add new routes as
  children of the `MainLayout` route in `app.routes.ts`.
- Category list for the drawer/footer comes from `CategoriesStore`
  (`core/services/categories-store.ts`). The drawer and the footer show **only categories** (no
  auth links). The accent strip under the header bar is decorative (no links).
- Category links always point to `/category/:slug` (`features/home/pages/category-articles`),
  never to `/?category=`. Public feed pages (home, category) share `features/home/feed-page.scss`
  (`.page-heading*`, `.feed-state`, `.teaser-grid`) via `styleUrls`. Parse `?page=` with
  `toPage()` from `shared/utils/page-param.ts`.
- Article teasers are `ArticleListItem` cards: a white (`--color-surface`) tile with
  `--radius-card`, a hairline border and `--shadow-card` (lifts to `--shadow-card-hover` with a
  small `translateY` under `motion-ok`), the image on top, and a body holding a soft navy pill
  chip (`--color-accent-soft` / `--color-accent-text`, uppercase, single line) and a bold serif
  title. `variant="card"` (default) is the small card — its size comes from the grid it sits in
  (`.teaser-grid`, 1/2/3 columns; the home `.latest__side` 2×2 block). `variant="lead"` is the
  large card (16:10 image, bigger title, excerpt, meta) shown next to that block on the home page.
- Route params and query params are bound to component `input()`s (`withComponentInputBinding()`).

### Testing

- Vitest via `ng test`. Spec file next to the source file (`x.spec.ts`).
- Test shared components/pipes/directives and services with logic. Mock API services, not HttpClient,
  in component tests; use `provideHttpClientTesting()` in API service tests.

---

## 5. General rules for the AI agent

- Follow existing patterns in the codebase before inventing new ones.
- Don't add new npm dependencies without asking first.
- Don't leave dead code, commented-out code, or `console.log`.
- Run `ng build` (and relevant tests) after changes to verify nothing is broken.
- After finishing a task, **append an entry to `docs/CHANGELOG.md`** (see format there).
