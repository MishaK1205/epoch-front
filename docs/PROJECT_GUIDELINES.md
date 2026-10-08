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
- API classes: `AuthApi`, `UsersApi`, `CategoriesApi`, `ImagesApi`, `ArticlesApi`, `TagsApi`,
  `ReadingListApi` (the user's saved / read lists under `/me/...`), `WhatWhereWhenApi`
  (admin-only "რა? სად? როდის?" quiz packages), `WhatWhereWhenCategoriesApi` (their flat
  categories at `/what-where-when-categories` — unrelated to the article `CategoriesApi`; never
  mix the two).
- Saved / read toggles: use `ReadingListStore` (`core/services/reading-list-store.ts`), not
  `ReadingListApi` directly. It holds `savedIds` / `readIds` signals (filled on login, cleared on
  logout, instantiated eagerly in `app.config.ts`) and `toggleSaved(id)` / `toggleRead(id)`, which
  update optimistically, roll back on error, and resolve with error messages to show (`[]` on
  success). Only show the toggles when `AuthService.isLoggedIn()`.
- Auth state: `AuthService` (`core/auth/auth-service.ts`) — use it (not `AuthApi`) for login,
  register, logout, `currentUser` and role signals. Guards: `authGuard`, `guestGuard`, `roleGuard(...)`.
- Redirect URLs for guards / 401 handling: override the `AUTH_CONFIG` token (`core/tokens`).
- Show errors with `getApiErrorMessages(err)`; validate forms with `API_LIMITS`.
- Categories are a two-level tree: `GET /categories` returns only top-level `Category` items,
  each with `subcategories: CategoryBase[]` (a subcategory has `parent` set). Never search that
  array directly — use `flattenCategories` / `findCategoryById` / `findCategoryBySlug` /
  `isSubcategory` (`core/api/categories/categories.utils.ts`) or `CategoriesStore.findBySlug` /
  `findTopLevelById`. Articles have a top-level `category` and an optional `subcategory`.
  Requests never send `''` for ids: forms keep `''` for "not chosen", and request builders
  omit the field (create) or send `null` (PATCH `subcategoryId`).
- URLs always come from `environment.apiUrl`; encode path segments with `encodeURIComponent`.
  Three environments: `environment.ts` (production build: `https://api.epoch.ge`),
  `environment.development.ts` (`npm start` / `npm run start:local`: `http://localhost:3000`) and
  `environment.prod-api.ts` (`npm run start:prod-api`: dev build against `https://api.epoch.ge`).
  Add any new environment key to all three.
- Quill editor: use helpers from `core/editor/quill-image-handler.ts`; never enable the video
  button. Use the `RichTextEditor` CVA (`features/manage/components/rich-text-editor`), which
  loads Quill with a dynamic `import('quill')` inside `afterNextRender` (keep it a lazy chunk —
  only `import type Quill` at the top level). Quill's CSS is global (`angular.json` styles), and
  overrides live in `src/styles/_quill.scss` (not in component styles). Render stored article HTML
  inside `<div class="ql-editor">` so lists and content typography match the editor.

### Server-side rendering (SSR) and SEO

- The app is server-rendered with `@angular/ssr` (`outputMode: "server"`) so search engines get
  the full HTML. Render modes per route live in `app.routes.server.ts`: public pages (home,
  `category/:slug`, `articles/:slug`, `search`, 404) are `RenderMode.Server`; login, register, `/manage`,
  `/me` and `/what-where-when` are `RenderMode.Client`. Add every new route there.
- Code runs on the server too: never touch `window`, `document`, `localStorage`, `navigator` or
  timers that matter only in the browser at construction time. Guard with
  `isPlatformBrowser(inject(PLATFORM_ID))`, or run DOM code in `afterNextRender`. `AuthService`
  has no storage on the server, so the server always renders the guest view and the browser
  swaps in the logged-in UI after hydration. Keep user-dependent markup inside `@if` blocks.
- Head tags: use `Seo` (`core/services/seo.ts`), never `Title` / `Meta` directly.
  `SeoTitleStrategy` resets title, description, canonical URL and Open Graph tags from the route
  `title` on every navigation; a page with loaded data calls `seo.update({ title, description,
  image, article? })` from an `effect`. Canonical URLs come from `environment.siteUrl` and keep
  only `?page=` (when > 1).
- Real 404s: set `inject(RESPONSE_INIT, { optional: true }).status = 404` when an entity isn't
  found (see `ArticleDetail`); unknown routes get 404 from the server routes.
- `/sitemap.xml` is generated by the Express server (`src/server/sitemap.ts`) from the API and
  cached for an hour; `public/robots.txt` points to it. When a new public route type appears,
  add it to the sitemap.
- `angular.json` `security.allowedHosts` lists the hosts the SSR server answers
  (`epoch.ge`, `www.epoch.ge`, `*.vercel.app`); other hosts get 400. Locally, run the built
  server with `NG_ALLOWED_HOSTS=127.0.0.1 PORT=4310 npm run serve:ssr:epoch-front`.
- Copy protection: `CopyProtection` (`core/services/copy-protection.ts`, started eagerly in
  `app.config.ts`) cancels `copy`, `cut`, `contextmenu`, `dragstart` and `selectstart`, and
  `_base.scss` sets `user-select: none` on `body`. Inputs, textareas, `contenteditable` (Quill)
  and anything inside `[data-allow-copy]` (the `ManageShell` host) stay copyable. Keep the CSS
  exceptions in sync with `COPY_ALLOWED_SELECTOR`. It is only a deterrent: the SSR HTML stays
  fully readable for search engines.
- `AngularNodeAppEngine` is created with `trustProxyHeaders: true`: Vercel sends
  `X-Forwarded-For` / `-Port`, and any untrusted `X-Forwarded-*` header makes Angular silently
  serve the empty client-side page. To verify SSR, check for `ng-server-context` in the HTML of
  a request that carries those headers.
- Vercel: `api/index.mjs` forwards every non-static request to the SSR `reqHandler`;
  `vercel.json` serves `dist/epoch-front/browser` statically and rewrites everything else to it.

### Content tooling (`tools/articles/`)

- New articles written by the agent go through `tools/articles/` (see its `README.md`): one
  Python source per article in `articles/`, `build.py` → proofread → `serve.py` → `upload.js` in
  the logged-in `npm run start:prod-api` tab. It only creates **drafts**; publishing is manual.
- Follow the article structure and Georgian writing rules in that README. `build/` is generated
  and git-ignored. The folder is outside `src/` and not part of the Angular build.

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
  `withFetch()` there: the fetch backend can't report upload progress
  (`ImagesApi.uploadWithProgress`). Only the server uses fetch (`app.config.server.ts` overrides
  `HttpBackend` with `FetchBackend`), since `platform-server`'s XHR polyfill is deprecated.

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
  breakpoint. Logged-in header buttons ("მართვა", "გასვლა", class `header__action`) become
  square icon buttons below `md` (label hidden, name via `aria-label`), so the bar fits a phone;
  the logo never shrinks. Check new header items at 375–393 px width while logged in.
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
| `InputField`    | `<app-input-field formControlName="x" label="…" type="text\|email\|password\|date…" hint="…" [errorMessages]="{…}" />` (`date` value is `YYYY-MM-DD`)                                                                     |
| `TextareaField` | `<app-textarea-field formControlName="x" label="…" [rows]="4" [maxlength]="500" showCount hint="…" [errorMessages]="{…}" />`                                                                                               |
| `Select`        | `<app-select formControlName="x" label="…" [options]="[{ value, label } \| { group, options }]" placeholder="…" emptyLabel="…" hideLabel hint="…" (selectionChange)="…" />` — `emptyLabel` = selectable `''` option ("None"); `selectionChange` fires on user picks only |
| `Checkbox`      | `<app-checkbox formControlName="x">label content</app-checkbox>`                                                                                                                                                           |
| `Alert`         | `<app-alert variant="error\|success\|info">…</app-alert>`                                                                                                                                                                  |
| `Badge`         | `<app-badge variant="neutral\|success\|accent\|info">text</app-badge>`                                                                                                                                                     |
| `EmptyState`    | `<app-empty-state icon="image" title="…" description="…">actions</app-empty-state>`                                                                                                                                        |
| `ConfirmDialog` | `<app-confirm-dialog #dlg title="…" message="…" confirmLabel="…" danger (confirmed) (cancelled) />` + `dlg.open()` (native `<dialog>`; Escape/backdrop/cancel → `cancelled`)                                               |
| `Spinner`       | `<app-spinner size="sm\|md\|lg" />`                                                                                                                                                                                        |
| `Pagination`    | `<app-pagination [page] [totalPages] (pageChange) />`                                                                                                                                                                      |
| `Icon`          | `<app-icon name="menu" [size]="20" />` — add new icons to `icon.html` + `IconName`                                                                                                                                         |
| `HighlightText` | `<app-highlight-text [text]="title" [query]="q" />` — marks the search words with `<mark>`                                                                                                                                |
| `WwwQuestionList` | `<app-www-question-list [questions]="pkg.questions" />` — "რა? სად? როდის?" questions with collapsible answers (collapsed by default)                                                                                    |

Auth-only components live in `features/auth/components/`: `AuthCard` (split-screen page shell),
`AuthBrand` (dark brand panel), `PasswordStrength` (`<app-password-strength [password] />`).

### Management area (`features/manage`) and article page (`features/articles`)

- `/manage` is guarded by `roleGuard('moderator', 'admin')`; `categories` and `users` add
  `roleGuard('admin')`. `ManageShell` renders the "მართვა" kicker, the h1 (route `title` without
  " — Epoch") and role-aware tabs. The server enforces permissions; the UI only hides/disables.
- Manage-only components (`RichTextEditor`, `CoverImagePicker`, `TagsInput`, `ArticleRow`,
  `CategoryForm`, `CategoryRow`) live in `features/manage/components/`. List pages share
  `features/manage/manage-page.scss`.
- Show manage API errors with `getManageErrorMessages(err)` (`manage-errors.ts`) — it translates
  backend messages and falls back to `getApiErrorMessages`. To show known backend messages on a
  field, use `applyManageErrors(err, { 'backend message': 'field' }, form.controls)`: it sets a
  `server` error (rendered by every form control via `validation-messages.ts`) and returns the
  rest for the page alert.
- `/manage/categories` is a two-level tree (`CategoryRow` per row, inline `CategoryForm` for edit
  and "add subcategory"). The parent is chosen only on create; edit shows it read-only and never
  sends `parentId`. After every category mutation reload both the page list and
  `CategoriesStore`. `/manage/articles` accepts `?categoryId=` (category or subcategory).
- The article editor has two pickers: Category (top-level only) and Subcategory (children of the
  picked category, "None" first, hidden when there are none). Reset the subcategory from the
  Category select's `(selectionChange)` (user picks only), so prefilling an article keeps it.
- Editors with unsaved state implement `HasUnsavedChanges.canDeactivate()` (return `true` or a
  `Promise<boolean>` resolved from a `ConfirmDialog`) and use `canDeactivate: [unsavedChangesGuard]`
  on the route, plus a `(window:beforeunload)` host listener.
- One-off messages after navigation (e.g. "created", "deleted") are passed through router
  navigation `state` and read once from `router.currentNavigation()` in the target component.
- `/articles/:slug` (`ArticleDetail`) renders content with `bypassSecurityTrustHtml` because
  Angular's sanitizer strips `data-list` (needed by Quill lists); the backend sanitizes the HTML.
  It feeds `Seo` (excerpt, cover image, article tags, JSON-LD) and returns 404 for missing slugs.
- `/manage/what-where-when` (admin only, `roleGuard('admin')` + admin-only tab): `WwwPackages`
  (list, `?page=`), `WwwPackageEditor` (`new` and `:id/edit`), `WwwPackageView` (`:id`, read-only
  preview). Each question is a `WwwQuestionCard` with the shared
  `RichTextEditor` (same toolbar / image upload / inline-image protection as articles; editor
  height via `--question-editor-min-height`). Form helpers live in `www-package-form.ts`.
  `questions` in PATCH replaces the whole list, so the editor always sends every question and
  resets the form with the returned package. Question HTML is rendered like article content
  (`ql-editor` + `bypassSecurityTrustHtml`); answers / comments are plain text
  (`white-space: pre-line`). Backend errors that point at a question (`Question N cannot be
  empty`, 1-based; `questions.N.…`, 0-based) are set as a `server` error on that question.
- Question import: `WwwQuestionImport` (panel above the questions) reads a `.docx` with
  `readDocx` (`shared/utils/docx.ts`, on the dependency-free `openZip`), splits it with
  `splitQuestions` (`www-question-import.ts`), uploads question images and appends the questions.
  Labels: `პასუხი:`, `ჩათვლა:` / `არ ჩაითვლება:` (kept in the answer), `კომენტარი:`; `წყარო:` /
  `ავტორი:` / "შესვენება" end a question. Pages / `.doc` are not parsed (ask for a Word export).
- Package categories: `WwwCategories` (`/manage/what-where-when/categories`, declared before
  `:id`) with the inline `WwwCategoryForm`. A package has `category: { id, name } | null` and
  requests send `categoryId` (the editor always sends it; `null` = none / remove). The package
  list filters with `?categoryId=` (an unknown id is kept as an option with a "clear filter"
  action) and "New package" passes it on so the editor preselects it. Every page loads
  `WhatWhereWhenCategoriesApi.list()` itself (no store). Categories with `packageCount > 0` are
  never sent to DELETE; the page links to their packages instead.
- Questions are shown read-only with `WwwQuestionList` (`shared/ui/www-question-list`,
  `<app-www-question-list [questions] />`), used by `WwwPackageView` and `PackageQuestions`. Each
  answer (with its comment) is a toggle button (`aria-expanded`), collapsed by default, plus a
  "show / hide all answers" button; a new question list collapses them again. Don't re-render
  questions by hand.
- `/what-where-when` (`features/what-where-when`, `roleGuard('admin')`, client-rendered,
  `Disallow`ed in `robots.txt`) is the browsing area outside `/manage`: `PackageList` (cards,
  `?page=`, `?categoryId=` chips for categories that have packages) and `PackageQuestions`
  (`:id`, the package's questions + a link to the manage editor). The drawer shows its link
  ("თამაშები" section) only when `AuthService.isAdmin()`.
- `TagsInput` is the chip input for any `string[]` list: authors use it with `prefix=""`,
  `[lowercase]="false"`, their own `maxCount` / `maxLength` and accessible labels.
- Calendar dates (`YYYY-MM-DD`, no time) are parsed and formatted in local time with
  `shared/utils/local-date.ts` and shown with the `calendarDate` pipe — never `new Date('…')`
  or `toISOString()`, which are UTC and can shift the day. `realDate` / `notBlank` validators
  live in `shared/validators/`.

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
  never to `/?category=`. Subcategories use the same route with their own slug: the page shows a
  `parent › name` breadcrumb for them and "All + subcategory" chips for any category that has
  subcategories. The drawer list is `DrawerCategories` (`core/layout/drawer-categories`): a category with
  subcategories has a chevron toggle (collapsed by default) next to its link; the footer and the home
  sections list top-level categories only. Feed-style pages (home, category, library) share the
  `src/styles/_feed-page.scss` partial (`.page-heading*`, `.feed-state`, `.teaser-grid`) via
  `@use 'feed-page';` in their component SCSS. Parse `?page=` with `toPage()` from
  `shared/utils/page-param.ts`.
- Article teasers are `ArticleCard` (`shared/ui/article-card`, `<app-article-card>`): a white
  (`--color-surface`) tile with `--radius-card`, a hairline border and `--shadow-card` (lifts to
  `--shadow-card-hover` with a small `translateY` under `motion-ok`), the image on top, and a body
  holding a soft navy pill chip (`--color-accent-soft` / `--color-accent-text`, uppercase; long
  category names wrap onto a second line — never clip them) and a bold serif title.
  `variant="card"` (default) is the small card — its size comes from the grid it sits in
  (`.teaser-grid`, 1/2/3 columns; the `ArticleSection` 2×2 block). `variant="lead"` is the large
  card (16:10 image, bigger title, excerpt, meta) shown next to that block. `[read]="true"` adds
  a green "წაკითხული" chip. The card is
  presentational: it only imports the `ArticleSummary` DTO type from `core/api` (allowed for
  shared domain cards). Project a control into the image corner with `<… cardAction />` — it
  renders outside the link, so clicking it doesn't navigate.
- Home page (`features/home/pages/home`): hero (newest article), then stacked sections built from
  `ArticleSection` (`features/home/components/article-section`: underlined title, optional
  "ყველა სტატია" button, lead card + 2×2 small cards, max 5 articles, renders the save toggles
  itself). "უახლესი სტატიები" shows the next 5 articles (no pagination); below it one
  `CategorySection` (`features/home/components/category-section`) per category from
  `CategoriesStore` — each loads its own 5 newest articles, links to `/category/:slug`, and stays
  hidden while loading / on error / when empty. `/?tag=` switches the page to a paginated
  `.teaser-grid` like the category page.
- Saved / read UI: `ReadingListToggle` (`core/reading-list/reading-list-toggle`,
  `<app-reading-list-toggle [articleId] kind="saved|read" appearance="icon|button" size="sm|md">`)
  is the only control for saving / marking read. `appearance="icon"` is the round bookmark in card
  corners (only render it when `isLoggedIn()`); the default pill with label is used on the article
  page (header actions + the end-of-article "დაასრულეთ კითხვა?" card) and on the library pages.
  Guests who click it are sent to `/login?returnUrl=…`. Smart, app-wide widgets like this that bind
  to `core/services` stores live under `core/<topic>/` (like `core/layout`), not in `shared/`.
- The user's lists live at `/me/saved` and `/me/read` (`features/library`, `authGuard`), one
  `ReadingList` page whose `kind` input comes from route `data`. Header: logged-in users get a
  bookmark icon link to `/me/saved` and a "ჩემი ბიბლიოთეკა" section at the top of the drawer.
- Route params and query params are bound to component `input()`s (`withComponentInputBinding()`).

### Search

- Search boxes use `ArticlesApi.search()` (`GET /articles/search`: partial, case-insensitive,
  title + tags only, every word must match, newest first). `listPublished({ q })` is whole-word
  full-text over title + content — don't use it for search UI. Never send a blank `q`; normalize
  input with `normalizeSearchQuery` (`shared/utils/highlight.ts`) and cap it at
  `API_LIMITS.search.max`.
- Show why something matched without HTML strings: `<app-highlight-text [text] [query] />`
  (`shared/ui/highlight-text`, `<mark class="hit">`, `--color-search-hit`) and
  `matchingTags(tags, q)` / `containsAllTerms(text, q)`. `ArticleCard` takes
  `[highlightQuery]` and a `[cardFooter]` slot (outside the card link) for tag links.
- `SearchBox` (`core/search/search-box`, in the header between the logo and the actions): ARIA
  combobox, suggestions from 2 characters (300 ms debounce, `switchMap`, top 5 + "all results"),
  Enter / icon → `/search?q=`. Below `lg` it is an icon that expands the field over the header
  bar (`.header__bar` is `position: relative`). It mirrors `q` on `/search` and clears after any
  other navigation.
- `/search` (`features/search`, `SearchResults`) reads `q` / `page` from query-param inputs;
  blank `q` = start state with no request. Tag chips link to the tag feed (`/?tag=`). The route
  is `Disallow`ed in `robots.txt`.

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
