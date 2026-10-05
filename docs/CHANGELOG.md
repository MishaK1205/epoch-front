# Epoch Front — Change Log

History of every change made to this project, newest entry at the top.
Read this file **before every task** to understand the current state of the project.
After finishing every task, **add a new entry at the top** using the template below.

## Entry template

```md
## YYYY-MM-DD — <short task title>

**Task:** <what the user asked for, 1–2 sentences>

**Changes:**

- Added `path/to/file.ts` — <what it is / why>
- Modified `path/to/file.ts` — <what changed>
- Removed `path/to/file.ts` — <why>

**Notes:** <decisions made, follow-ups, known limitations, new conventions — optional>
```

---

## 2026-10-05 — Fix: production served the empty client-side page instead of SSR

**Task:** Google showed epoch.ge as a bare "Epoch" result (no description, generic icon,
"translate this page"). Find out why.

**Changes:**

- Modified `src/server.ts` — `new AngularNodeAppEngine({ trustProxyHeaders: true })`.

**Notes:** Root cause: `@angular/ssr` 21 trusts only `X-Forwarded-Host` / `-Proto` by default;
any other `X-Forwarded-*` header makes `AngularAppEngine.handle` call `serveClientSidePage()`
(`deoptToCSR`) with just a console warning. Vercel adds `X-Forwarded-For` / `-Port` to every
request, so since the SSR deploy every URL returned `index.csr.html` (title "Epoch", no
canonical / OG tags, no articles), and Google indexed that. Reproduced locally: the built server
rendered 34 cards without the header and 0 with `X-Forwarded-For`; after the fix the home page
and articles are fully rendered with all four Vercel headers, and a foreign
`X-Forwarded-Host` still gets 400 (allowed-host check is unchanged). After deploying, request
re-indexing in Google Search Console; the result updates on Google's next crawl.

---

## 2026-10-05 — Composer articles as drafts + reusable article-drafts tool

**Task:** Write six articles (Monteverdi, Purcell, Vivaldi, Bach, Handel, Scarlatti) in the
style of the "რიჰარდ ვაგნერი" article, with a cover photo each, and save them as drafts in the
production database. Then keep the tooling so future articles can be added the same way.

**Changes:**

- Added `tools/articles/lib.py` — helpers (`P`, `H1`, `H2`, `H3`, `UL`, `OL`, `html`) that
  emit Quill-compatible HTML (`data-list` lists, `<p><br /></p>` spacers like the editor).
- Added `tools/articles/articles/_template.py` — skeleton of an article source (title,
  category, cover URL, alt, tags, content in the Wagner-article structure). The six composer
  sources were removed after upload: the database is the source of truth.
- Added `tools/articles/build.py` — validates against `API_LIMITS`, downloads covers, writes
  `build/payloads.json` and plain-text proofs for proofreading.
- Added `tools/articles/serve.py` — serves `build/` on `127.0.0.1:4399` with CORS for
  `http://localhost:4200`.
- Added `tools/articles/upload.js` — run in the logged-in dev app tab: uploads covers and
  creates drafts, skips existing titles, reports whether the server kept the content intact.
- Added `tools/articles/README.md` (workflow + article structure and writing rules) and
  `tools/articles/.gitignore` (`build/`).
- Modified `docs/PROJECT_GUIDELINES.md` — new "Content tooling" section.

**Notes:** Data change in production: six drafts in "კომპოზიტორები" by `master_elodin`, covers
from Wikimedia Commons (public domain); none published (public API returns 404 for them). The
upload runs inside the browser page so the access token never leaves it. Python 3 (system) is
used for the tool; no npm dependencies added.

---

## 2026-10-05 — `start:local` / `start:prod-api` scripts (dev server against either API)

**Task:** One command to run the app against the local API and another against the production
API.

**Changes:**

- Added `src/environments/environment.prod-api.ts` — `production: false`, `apiUrl:
  https://api.epoch.ge`, `siteUrl: http://localhost:4200`.
- Modified `angular.json` — `prod-api` configuration for `build` (same settings as
  `development`, but the file replacement points to `environment.prod-api.ts`) and for `serve`.
- Modified `package.json` — scripts `start:local` (`ng serve --configuration development`) and
  `start:prod-api` (`ng serve --configuration prod-api`). `npm start` is unchanged (= local).
- Modified `docs/PROJECT_GUIDELINES.md` — lists the three environment files and scripts.

**Notes:** A separate dev configuration was used instead of `ng serve --configuration
production` so the prod-API run keeps fast rebuilds, source maps and no budgets. Verified: the
`prod-api` build contains `api.epoch.ge` and no `localhost:3000`; the `development` build
contains `localhost:3000`.

---

## 2026-10-04 — Home: 5 latest articles, then a section per category; chip clipping fix

**Task:** "უახლესი სტატიები" should show only 5 articles with nothing below it; under it add one
section per category (e.g. ბერძნული მითოლოგია, პარადოქსები და ეფექტები) in the same lead + small
cards layout, each with a button next to the title that opens the category's full list. Also fix
the category chip ("პარადოქსები და ეფექტები") being cut off in small article cards.

**Changes:**

- Added `features/home/components/article-section/article-section.ts` / `.html` / `.scss` —
  `ArticleSection`: underlined section title with an optional "ყველა სტატია" outline pill button
  (`chevron-right` icon, `[link]` router commands), a `lead` card and a 2×2 block of small cards
  (first 5 of `[articles]`). It renders the `ReadingListToggle`s itself (injects `AuthService` /
  `ReadingListStore`), since projected per-item content can't come from the parent. The
  `.latest*` grid styles moved here from `home.scss` as `.section__grid` / `.section__side`.
- Added `features/home/components/category-section/category-section.ts` — `CategorySection`:
  takes a `Category`, loads its 5 newest articles with `listPublished({ category, limit: 5 })`
  via `rxResource`, and renders an `ArticleSection` titled with the category name linking to
  `/category/:slug`. The host is `[hidden]` while loading, on error, or when the category has no
  articles, so the parent's flex gap doesn't leave a blank step.
- Modified `features/home/pages/home/home.ts` / `.html` / `.scss` — the front page requests only
  6 articles (hero + 5 for the latest section) and has no pagination; after the latest section
  it loops over `CategoriesStore.categories()` rendering a `CategorySection` each. `?tag=` now
  shows a paginated `.teaser-grid` (12 per page, like the category page) instead of the old
  lead + rest layout. `.home` is a flex column with a `--space-12` gap between sections;
  `.section-title` / `.latest*` styles are gone.
- Modified `shared/ui/article-card/article-card.scss` — `.item__chip` no longer uses
  `white-space: nowrap` + `overflow: hidden` + `text-overflow: ellipsis` (`text-overflow` doesn't
  apply to flex boxes, so long names were just cut mid-word); the chip wraps onto a second line
  and stays left-aligned.
- Modified `docs/PROJECT_GUIDELINES.md` — card chip wraps instead of staying single-line; new
  "Home page" bullet describing `ArticleSection` / `CategorySection` and the tag feed.

**Notes:** A section is rendered for every category from the API (currently ბერძნული მითოლოგია,
ისტორიული პიროვნებები, კომპოზიტორები, პარადოქსები და ეფექტები) rather than hard-coding the two
named ones, so new categories appear automatically and empty ones are hidden. Each category
section is its own request (4 today); SSR waits for them and the hydration transfer cache
replays them in the browser. Articles may appear in both the latest section and their category
section — that duplication is expected on a front page. A category with a single article shows
only the lead card. Verified in the browser against the live API at 1280px and 390px: hero +
5 latest, four category sections with working "ყველა სტატია" links, wrapped chips fully
readable, `/?tag=მათემატიკა` renders the grid. `ng build` (no warnings) and `ng test` (63) pass.

---

## 2026-10-04 — Server-side rendering and SEO (articles indexable by Google)

**Task:** Google didn't show the articles in search. The live site sent every crawler the same
empty `<app-root>` shell titled "Epoch", with no description, and no robots.txt or sitemap
(both URLs returned `index.html`). Add SSR and the SEO pieces it needs.

**Changes:**

- Modified `package.json` / `package-lock.json` — `ng add @angular/ssr` added `@angular/ssr`,
  `@angular/platform-server`, `express`, `@types/express`, `@types/node`, and the
  `serve:ssr:epoch-front` script (approved by the user).
- Modified `angular.json` — `server`, `outputMode: "server"`, `ssr.entry`;
  `security.allowedHosts` = `epoch.ge`, `www.epoch.ge`, `*.vercel.app`.
- Modified `tsconfig.app.json` — `types: ["node"]` (from `ng add`).
- Added `src/main.server.ts`, `src/app/app.config.server.ts` (generated).
- Added `src/app/app.routes.server.ts` — Server rendering for home, category, article and the
  `**` 404 (status 404); Client rendering for login, register, `/manage`, `/me`.
- Modified `src/server.ts` — generated Express server plus `GET /sitemap.xml`; removed the
  example comment.
- Added `src/server/sitemap.ts` — builds the sitemap (home, categories, all published articles
  with `lastmod`, paging the API at 100) and caches it in memory for 1 h.
- Added `api/index.mjs` — Vercel function that forwards requests to the SSR `reqHandler`.
- Modified `vercel.json` — static files from `dist/epoch-front/browser`, function
  `includeFiles: dist/epoch-front/**`, all other paths (including `/`) rewritten to `/api`. The
  old SPA rewrite to `/index.html` is gone (with SSR there is no `index.html`, only
  `index.csr.html`, used internally for client-rendered routes).
- Modified `src/app/app.config.ts` — `provideClientHydration(withEventReplay())`;
  `TitleStrategy` → `SeoTitleStrategy`.
- Added `src/app/core/services/seo.ts` (+ spec) — `Seo`: title, description, canonical link,
  `og:*`, `twitter:*`, `article:*` tags and schema.org `Article` JSON-LD (`<` escaped).
- Added `src/app/core/services/seo-title-strategy.ts` — resets `Seo` to route defaults on every
  navigation.
- Modified `src/app/core/auth/auth-service.ts` — `localStorage` only in the browser; on the
  server the storage is `null`, so SSR always renders the guest view.
- Modified `features/articles/pages/article-detail/article-detail.ts` — uses `Seo` (excerpt,
  cover image, author, category, tags) instead of `Title`; missing slugs set response status 404.
- Modified `features/home/pages/category-articles/category-articles.ts` — page title and
  description from the category (the title used to stay "კატეგორია — Epoch").
- Modified `src/environments/environment*.ts` — `siteUrl` (`https://www.epoch.ge` /
  `http://localhost:4200`).
- Modified `src/index.html` — default `<meta name="description">`.
- Added `public/robots.txt` — disallows `/manage`, `/me`, `/login`, `/register`; points to the
  sitemap.
- Modified `docs/PROJECT_GUIDELINES.md` — new "Server-side rendering and SEO" section; article
  page note.

**Notes:** Verified with the production build served locally (`Host: www.epoch.ge`): the
Banach–Tarski article returns 200 with the real title, description, canonical, OG/Twitter image,
`article:*` tags, JSON-LD and the full article text in the HTML. A missing article and an unknown
URL return 404, `/sitemap.xml` lists the 4 categories and 3 articles, and `api/index.mjs` serves
the same through a plain Node server. In the browser the page hydrates (all 16 `ngh` markers
consumed), and client-side navigation updates the head. `ng build` (no warnings) and `ng test`
(63) pass. The Vercel deployment itself was not tested from here. HttpClient stays on XHR
(`xhr2` on the server), so upload progress is unaffected. Restart any running `ng serve` (the
tsconfig and angular.json changed). After deploying: add the site in Google Search Console,
submit `https://www.epoch.ge/sitemap.xml`, and request indexing for the article URLs.

---

## 2026-10-04 — Brand favicon instead of the Angular default

**Task:** Replace the Angular logo in the browser tab with an icon in the primary color.

**Changes:**

- Added `public/favicon.svg` — a bold white "E" (drawn from bars so it stays crisp at 16px) on a
  `--color-accent` (`#071824`) rounded square. Source of truth for the icon.
- Modified `public/favicon.ico` — regenerated from the SVG (16/32/48 px PNG frames) for browsers
  that don't take SVG icons; replaces the Angular default.
- Added `public/apple-touch-icon.png` — 180 px version for iOS home screens.
- Modified `src/index.html` — `<link rel="icon">` for the `.ico` and the SVG, the
  `apple-touch-icon` link, and `<meta name="theme-color" content="#071824">`.

**Notes:** Rasters were produced from the same shapes as the SVG with a throwaway script (not
committed). If the mark changes, edit `favicon.svg` and regenerate the `.ico` / touch icon.

---

## 2026-10-04 — Reading lists UI: save / mark-read toggles, library pages, header links

**Task:** Give users a way to save articles and mark them as read, with a polished UI: toggles
on cards and the article page, and pages listing the saved and read articles.

**Changes:**

- Added `core/reading-list/reading-list-toggle/reading-list-toggle.ts` / `.html` / `.scss` /
  `.spec.ts` — `ReadingListToggle`: one component for both actions (`kind="saved|read"`), two
  looks (`appearance="icon"` round corner button, default pill with label, `size="sm|md"`).
  Active saved = solid ink with a filled bookmark; active read = soft green check. Shows the
  store's error message under itself; guests are redirected to `/login?returnUrl=…`. Emits
  `changed` after the server confirms. Spec: guest redirect, optimistic save, 404 rollback+message.
- Added `shared/ui/article-card/article-card.ts` / `.html` / `.scss` — `ArticleCard`, the former
  `ArticleListItem` moved out of `features/home` so the library feature can reuse it. Now an
  `<article>` wrapping the link plus an `.item__action` slot (`<… cardAction />`) in the image
  corner, outside the link. New `read` input: green "წაკითხული" chip and a slightly desaturated
  image. Hover/focus styles moved to `:hover` / `:focus-within` on the wrapper.
- Removed `features/home/components/article-list-item/*` — replaced by `ArticleCard`.
- Moved `features/home/feed-page.scss` → `src/styles/_feed-page.scss`, consumed with
  `@use 'feed-page';` (home, category, library) instead of cross-feature `styleUrls`.
- Added `features/library/library.routes.ts` — `/me` (authGuard) → `/me/saved`, `/me/read`
  (`data.kind`).
- Added `features/library/pages/reading-list/reading-list.ts` / `.html` / `.scss` — `ReadingList`
  page: kicker "ჩემი ბიბლიოთეკა", segmented tabs (bookmark / book-open icons) with the item count,
  teaser grid of `ArticleCard`s, each with a meta row ("შენახულია / წაკითხულია <timeAgo>" and a
  small toggle to remove). Items vanish immediately on removal (filtered by the store's id set),
  the count decrements, an emptied page > 1 goes back a page, page 1 reloads if more exist.
  Empty state with a link to the home feed. On the read list the card corner also shows the
  save bookmark.
- Modified `features/home/pages/home/home.ts` / `.html` / `.scss`,
  `features/home/pages/category-articles/category-articles.ts` / `.html` / `.scss` — use
  `ArticleCard`, pass `[read]` from `ReadingListStore.readIds`, project the icon toggle when
  logged in; `@use 'feed-page'`.
- Modified `features/articles/pages/article-detail/article-detail.ts` / `.html` / `.scss` — save
  and mark-read pills under the meta line; an end-of-article card ("დაასრულეთ კითხვა?" → "სტატია
  წაკითხულია" with a link to `/me/read`; guests see a sign-in hint) with the read toggle.
- Modified `core/layout/site-header/site-header.html` / `.ts` / `.scss` — logged-in users get a
  bookmark icon link to `/me/saved` (filled when active) and a "ჩემი ბიბლიოთეკა" drawer section
  (saved / read links) above the categories.
- Modified `shared/ui/icon/icon.ts` / `.html` / `.scss` — new `bookmark` and `book-open` icons;
  `svg { fill: var(--icon-fill, none) }` so parents can fill an icon via a CSS variable.
- Modified `app.routes.ts` — lazy-loads `LIBRARY_ROUTES`.
- Modified `docs/PROJECT_GUIDELINES.md` — card renamed/moved, feed-page partial, toggle usage,
  library routes, `core/<topic>/` for smart app-wide widgets.

**Notes:** The card was moved to `shared/ui` rather than imported across features; it stays
presentational (type-only import of `ArticleSummary`) and receives the toggle by projection,
because `shared/` may not inject core stores. The toggle itself is a smart component in
`core/reading-list/`, next to the store it binds to. Cards only expose "save" (reading is marked
on the article page, where the backend expects an explicit action). Lists stay independent.
Verified in the browser against the local API as a test user: login loads both lists, the card
bookmark saves (PUT) and fills, article pills and the end card reflect state, `/me/saved` removal
empties the page and shows the empty state, `/me/read` lists the read article, logout hides the
card toggles, and a guest click on the article page redirects to `/login?returnUrl=…`.
`ng build` (no warnings) and `ng test` (61) pass.

---

## 2026-10-04 — Reading lists: typed client for saved / read articles

**Task:** Add the typed client layer for the new `/me/saved-articles` and `/me/read-articles`
endpoints (models, API service, client-side id store). No UI yet.

**Changes:**

- Added `core/api/reading-list/reading-list.models.ts` — `ReadingListItem` (`article:
  ArticleSummary`, `addedAt`) and `ReadingListQuery` (`page`, `limit`).
- Added `core/api/reading-list/reading-list-api.ts` — `ReadingListApi` with `listSaved`, `save`,
  `unsave`, `listRead`, `markRead`, `markUnread`. PUTs send a `null` body; ids are
  `encodeURIComponent`-ed; list queries go through `toHttpParams`.
- Added `core/api/reading-list/reading-list-api.spec.ts` — one test per method (method, URL,
  body, params).
- Added `core/services/reading-list-store.ts` — `ReadingListStore`: `savedIds` / `readIds`
  (`ReadonlySet<string>` signals), `loaded`, `isSaved` / `isRead`, `toggleSaved` / `toggleRead`
  (optimistic, rolled back on error, ignored while the same id is in flight, resolve with error
  messages; a 404 on add maps to `ARTICLE_UNAVAILABLE_MESSAGE`) and `reload`. An `effect` on
  `AuthService.currentUser` loads both lists (paging with `limit: 100` until `total`) when a user
  appears and clears everything on logout.
- Added `core/services/reading-list-store.spec.ts` — logged-out no-op, load on login / clear on
  logout, paging, optimistic add, rollback on 500, 404 message, in-flight de-duplication.
- Modified `core/api/index.ts` — exports the new API and models.
- Modified `app.config.ts` — `provideEnvironmentInitializer(() => inject(ReadingListStore))` so
  the store syncs with auth from app start instead of from its first injection.
- Modified `docs/PROJECT_GUIDELINES.md` — `ReadingListApi` in the API list; how to use
  `ReadingListStore`.

**Notes:** Project conventions were used instead of the prompt's defaults: the service is
`ReadingListApi` in `core/api/reading-list/` (not `core/services/reading-list.service.ts`), models
sit next to it as `reading-list.models.ts`, and everything is exported from the `core/api` barrel.
The existing `Paginated<T>`, `ArticleSummary`, `toHttpParams` and `getApiErrorMessages` are
reused. There is no toast service, so toggles return `Promise<string[]>` for the calling component
to display. Login and logout detection uses an `effect` (a network side effect, not signal-to-
signal), which is why the store needs the eager initializer. Lists are kept independent (marking
read does not unsave). `ng build` (no warnings) and `ng test` (58) pass.

---

## 2026-10-04 — Home hero: crop toward the top of the image

**Task:** A portrait cover image in the home hero showed only the middle of the face.

**Changes:**

- Modified `features/home/components/article-hero/article-hero.scss` — `.hero__image` uses
  `object-position: center 30%` instead of the default center, so the very wide hero crop keeps
  the upper part of the image where faces usually are.

**Notes:** The uploaded cover was a 4096×5295 portrait; the hero is roughly 3:1, so only about a
quarter of a portrait's height is visible. At 1665×560 the visible band is now 22–48% of the
image height (eyes to mouth) instead of 37–63% (nose to chin). Landscape 16:9 images barely move.
Verified against the live API with `ng serve --configuration production`.

---

## 2026-10-04 — Point the production build at https://api.epoch.ge; Vercel config

**Task:** The deployed app at `https://epoch.ge` failed every API call with
`net::ERR_NAME_NOT_RESOLVED`. Make the production build call the production API.

**Changes:**

- Modified `src/environments/environment.ts` — production `apiUrl` was the placeholder
  `https://api.example.com` (the root cause); now `https://api.epoch.ge`. This is the file used
  by the `production` configuration (`defaultConfiguration` of `build`); `development` swaps in
  `environment.development.ts` (`http://localhost:3000`, unchanged).
- Added `vercel.json` — build command `npm run build` (production configuration), output
  directory `dist/epoch-front/browser`, and an SPA rewrite to `/index.html` so deep links don't
  404 on refresh (the app is client-only, no SSR).

**Notes:** No other code needed changes: every API service and `authInterceptor` already use
`environment.apiUrl`, there are no relative/hardcoded API URLs, no `withCredentials`, no CSP, no
image loader, and cover/article image URLs are used as returned (absolute). Verified: production
`ng build` passes; `dist/` contains `api.epoch.ge` and no `localhost:3000` / `api.example.com`;
`ng test` (45) passes; the production build served locally requested
`https://api.epoch.ge/categories` (200 `[]`) and a wrong-credentials login returned
`401 Invalid credentials`.

---

## 2026-10-03 — Article cards: premium surface, soft chip, lift on hover

**Task:** The card colors felt off; make the cards look more premium.

**Changes:**

- Modified `src/styles/_design-system.scss` — tokens `--radius-card` (= `--radius-xl`, 14px),
  `--shadow-card` (soft resting shadow) and `--shadow-card-hover` (deeper lifted shadow).
- Modified `features/home/components/article-list-item/article-list-item.scss` — the card body
  is white (`--color-surface`) instead of the gray panel, with `--radius-card`, a hairline border
  and `--shadow-card`; a hairline separates image and body. Hover deepens the shadow, darkens the
  border to `--color-border-strong`, lifts the card 3px and zooms the image (both under
  `motion-ok`, with `--easing-out`). The category chip is a soft navy pill
  (`--color-accent-soft` background, `--color-accent-text` text, uppercase `--text-xs`, wide
  tracking, `--radius-full`) kept on one line with an ellipsis instead of the solid near-black
  block. Titles get `--letter-spacing-tight`; body padding grows to `--space-5` / `--space-6`
  (lead); the meta line is lighter (`--font-weight-medium`, `--color-text-subtle`).
- Modified `features/home/components/article-list-item/article-list-item.html` — meta separator
  is a middle dot instead of a pipe.
- Modified `features/home/pages/home/home.scss`, `features/home/feed-page.scss` — card grids use
  a `--space-6` gap so the shadows have room.
- Modified `docs/PROJECT_GUIDELINES.md` — teaser description updated.

**Notes:** The gray body plus the heavy solid chip and 4px corners read as flat; a white card
with depth, larger radius and a tinted chip is the usual "premium" editorial treatment and keeps
the navy accent. `--letter-spacing-wider` made Georgian chip text wrap in the 2×2 side cards, so
chips use `--letter-spacing-wide` and `white-space: nowrap`. Verified home and `/category/:slug`
at 1280px in the browser. `ng build` (no warnings) and `ng test` (45) pass.

---

## 2026-10-03 — All article teasers as HistoryExtra-style cards; home = big card + small cards

**Task:** Make every article card look like the reference screenshot (image on top, filled
category chip, bold serif title on a light panel). The home page keeps one big card with small
cards next to it; category pages show only small cards.

**Changes:**

- Modified `features/home/components/article-list-item/article-list-item.ts` / `.html` / `.scss`
  — the component is now always a card. Variants are `card` (default, small) and `lead` (big).
  Both share the bordered tile (`--radius-sm`, `--color-border`), a full-width image (3:2; 16:10
  for `lead`), and a `--color-surface-muted` body with a navy (`--color-accent`) chip showing the
  category name and a bold `--font-serif` title. `lead` adds the excerpt and the author/date meta,
  larger padding, and a bigger title. The small card has no meta, as in the reference. Hover:
  `--shadow-md`, slight image zoom (`motion-ok`), title in `--color-accent-text`; focus uses the
  `focus-ring` mixin. The host fills its grid cell so cards in a row share a height. The old
  `compact` (thumbnail-left) variant is gone.
- Modified `features/home/pages/home/home.scss` — `.latest` is the lead card plus
  `.latest__side`, a 2-column block of small cards (1 column below `sm`). On `lg` the side has
  two fixed rows so the small cards stay half the lead's height even when fewer than 4 exist.
- Modified `features/home/feed-page.scss` — `.teaser-grid` is 1 column, 2 from `sm`, 3 from
  `lg`, with a uniform `--space-5` gap (used by the home "rest" grid and the category page).
- Modified `src/styles/_design-system.scss` — removed the now-unused `--teaser-thumb-width`,
  `--teaser-thumb-width-md` and `--radius-media` tokens.
- Modified `docs/PROJECT_GUIDELINES.md` — teaser description updated to the two variants.

**Notes:** The previous "Article grid cards" entry below was reverted in the working tree before
this task (the repo has no commits yet), so the card variant was rebuilt here and extended to the
lead and side items, which the first attempt had left untouched. The side column is a 2×2 block
rather than a single column because four stacked vertical cards would be about three times the
lead's height. The reference's orange chip maps to the project's navy accent; there is no premium
concept. `home.html` and `category-articles.html` needed no change: they already use the default
variant for small items and `variant="lead"` for the big one. Verified in the browser at 1280px
(home and `/category/:slug`) and 390px. `ng build` (no warnings) and `ng test` (45) pass.

---

## 2026-10-03 — Article grid cards (HistoryExtra style)

**Task:** Restyle the article cards like the reference screenshot: image on top, a filled
category chip and a bold serif title on a light panel, in a card grid.

**Changes:**

- Modified `features/home/components/article-list-item/article-list-item.ts` / `.html` / `.scss`
  — new `card` variant. It has a bordered tile with `--radius-sm`, a full-width 3:2 image with no
  radius, and a body on `--color-surface-muted`. The body holds a navy (`--color-accent`) category
  chip with white text and a bold `--font-serif` title, clamped to 4 lines. There is no meta line.
  On hover the card gets `--shadow-md`, the image zooms slightly (only when motion is allowed),
  and the title turns `--color-accent-text`. The host fills the grid cell height so the cards in a
  row line up.
- Modified `features/home/feed-page.scss` — `.teaser-grid` has 1 column, 2 from `sm`, and 3
  from `lg`, with a `--space-5` gap.
- Modified `features/home/pages/home/home.html`,
  `features/home/pages/category-articles/category-articles.html` — grid items use
  `variant="card"`.
- Modified `docs/PROJECT_GUIDELINES.md` — documented the teaser variants.

**Notes:** The reference card colors (orange chip, navy "premium" card) were mapped to the
project's navy accent. There is no premium concept, so that variant was skipped. The compact side
column next to the lead card is unchanged. Verified on `/category/:slug` in the browser.
`ng build` passes.

---

## 2026-10-03 — Header sign-in: navy text, no filled background

**Task:** Drop the navy background behind the header sign-in links, color the text with that
navy, and make the type smaller.

**Changes:**

- Modified `core/layout/site-header/site-header.scss` — `.header__auth` is plain text in
  `--color-accent` at `--text-sm`; the filled bar, height, and horizontal padding are gone.
- Modified `docs/PROJECT_GUIDELINES.md` — guest header auth is small navy text, not a chip.

**Notes:** Registration still hides below `sm`.

---

## 2026-10-03 — Header sign-in is text links, not buttons

**Task:** Replace the header login and registration buttons with the dark-bar text treatment
(white "შესვლა | რეგისტრაცია"), without the person icon.

**Changes:**

- Modified `core/layout/site-header/site-header.html` — guest actions are two links in a navy
  bar separated by a pipe, instead of outline and solid buttons.
- Modified `core/layout/site-header/site-header.scss` — styles for `.header__auth`. Registration
  still hides below the `sm` breakpoint.
- Modified `docs/PROJECT_GUIDELINES.md` — guest header auth is text on a navy chip, not buttons.

**Notes:** Logged-in actions (მართვა, გასვლა) stay buttons. Verified in the browser: both links
navigate, the bar fits at 360px (sign-in only) and at 768px (both links).

---

## 2026-10-03 — Accent palette: coral → navy `#071824`

**Task:** Replace the orange accent, including the strip under the header, with a palette based
on `#071824`.

**Changes:**

- Modified `src/styles/_design-system.scss` — `--palette-coral-*` replaced by `--palette-navy-*`
  (`#e9f1f6`, `#c8d9e5`, `#7ba4c1`, `#071824`, `#102d42`, `#1d5a87`). `--color-accent` is
  `#071824` (header strip, solid buttons, selection). Solid hover lightens to `#102d42`. Text on
  white uses `#1d5a87`. Text on dark surfaces uses `#7ba4c1`. Glow, button shadows and the input
  focus ring updated to the same navy.
- Modified `features/home/components/article-list-item/article-list-item.scss` — title hover uses
  `--color-accent-text` (`#071824` is too close to black to read as a hover).
- Modified `core/layout/site-header/site-header.scss` — drawer link hover uses
  `--color-accent-text`.
- Modified `features/not-found/pages/not-found/not-found.scss` — the 404 uses
  `--color-accent-text`.
- Modified `features/auth/auth-form.scss` — link underline matches the navy text color.
- Modified `features/auth/components/auth-brand/auth-brand.scss` — wordmark rule uses
  `--color-accent-on-dark` so it stays visible on the dark panel.
- Modified `docs/PROJECT_GUIDELINES.md` — visual style describes the navy strip and which step
  is used on light text, solid fills, and dark surfaces.

**Notes:** `#071824` on white is ~18:1, so it works for the strip and for white text on accent
buttons. It does not work as a text hover (titles are already black) or on the footer / auth
panel (it is darker than those backgrounds). Those use `#1d5a87` (~7.3:1 on white) and
`#7ba4c1` (~4.7:1 on the footer). `ng build` passes. Verified the strip, title hover, drawer
hover, footer hover, article kicker, and the login brand panel in the browser.

---

## 2026-10-03 — All hover accent states use the primary coral

**Task:** Drawer category links (and anywhere else) hovered in a non-primary shade; make every
hover/interactive accent state use `--color-accent` (`#f16957`).

**Changes:**

- Modified `core/layout/site-header/site-header.scss` — drawer link hover/focus color →
  `--color-accent` (was `--color-accent-text`).
- Modified `src/styles/_design-system.scss` — `--color-footer-link-hover` and
  `--color-accent-on-dark` now alias `--color-accent` (were the lighter coral-400); removed the
  unused `--palette-coral-400`.
- Modified `features/articles/pages/article-detail/article-detail.scss` — category kicker link
  turns `--color-accent` on hover/focus (instead of underlining).
- Modified `docs/PROJECT_GUIDELINES.md` — rule: static accent text stays `--color-accent-text`
  (AA); all hover/focus accent states use `--color-accent`.

**Notes:** Static small accent text (page kickers "კატეგორია"/"თეგი", manage kicker, required
asterisks, badges, Quill active/link states, auth links) intentionally stays on the darker
`--color-accent-text` because `#f16957` on white is ≈3:1, below AA for normal-size text. Auth
form links hover to ink by design. `ng build` passes.

---

## 2026-10-03 — Coral back to `#f16957`; teaser titles hover in the primary accent

**Task:** Revert the lighter coral to `#F16957`; teaser titles should turn exactly the primary
color on hover (they were using the darker text shade).

**Changes:**

- Modified `src/styles/_design-system.scss` — `--palette-coral-500` back to `#f16957` and the
  derived `rgb()` literals back to `241 105 87`.
- Modified `features/home/components/article-list-item/article-list-item.scss` — title hover /
  focus color is `--color-accent` instead of `--color-accent-text`.
- Modified `docs/PROJECT_GUIDELINES.md` — documented the exception: transient hover/focus color
  of bold article titles may use `--color-accent`.

**Notes:** `--color-accent-text` (coral-700) exists because coral-500 is ≈3:1 on white, below
AA for static text; for a bold, transient hover state this is an accepted trade-off.

---

## 2026-10-03 — Hero without category chip; slightly lighter coral

**Task:** Remove the category name from the hero; make the primary orange a little lighter.

**Changes:**

- Modified `features/home/components/article-hero/article-hero.html` / `.scss` — removed the
  `.hero__kicker` category chip and its styles.
- Modified `src/styles/_design-system.scss` — `--palette-coral-500` `#f16957` → `#f37463`
  (≈5% lighter, same hue); the `rgb()` literals derived from it (`--gradient-brand` glow,
  `--shadow-btn-accent-hover`, `--focus-ring-accent`) updated to `243 116 99`.

**Notes:** Hover (`coral-600`) and accent text (`coral-700`) are unchanged, so contrast for text
stays the same. `ng build` passes.

---

## 2026-10-03 — Article teasers: no category kicker, accent-colored title on hover

**Task:** Remove the category name from the article teaser cards; on hover the title should
turn the primary (accent) color instead of being underlined.

**Changes:**

- Modified `features/home/components/article-list-item/article-list-item.html` — removed the
  `.item__kicker` (category name) from the lead variant.
- Modified `features/home/components/article-list-item/article-list-item.scss` — hover (and
  `:focus-visible`) sets `.item__title` color to `--color-accent-text` with a fast transition;
  removed the underline rules and the `.item__kicker` styles.

**Notes:** `--color-accent-text` (coral-700) is used rather than `--color-accent` because plain
coral fails AA for text on white (see guidelines). `ng build` passes.

---

## 2026-10-03 — UI font: Google Sans

**Task:** Use the same font as the `real-estate-ivestment` project (Google Sans) here.

**Changes:**

- Modified `src/index.html` — Google Fonts link now loads `Google Sans` (variable,
  `opsz 17..18`, `wght 400..700`, italic) plus `Noto Sans Georgian` 400–700 (fallback) and
  `Noto Serif Georgian` (unchanged).
- Modified `src/styles/_design-system.scss` — `--font-sans` starts with `'Google Sans'`, then
  `'Noto Sans Georgian'`; `--font-weight-black` lowered from 800 to 700 because Google Sans has
  no 800 and the browser would synthesize it.
- Modified `docs/PROJECT_GUIDELINES.md` — font note.

**Notes:** Verified that the Google Fonts CSS for Google Sans includes a `georgian` subset and
that `document.fonts.check()` resolves Georgian text to Google Sans in the browser. The serif
(`Noto Serif Georgian`) for excerpts/long text is unchanged; the other project has no serif.

---

## 2026-10-03 — Thin rule under "უახლესი სტატიები"

**Task:** Make the line under the "უახლესი სტატიები" section title really thin.

**Changes:**

- Modified `features/home/pages/home/home.scss` — `.section-title` underline is now
  `var(--border-width)` (1px) instead of a hard-coded 3px, and light gray (`--color-border`)
  instead of ink so it reads as a hairline divider.
- Modified `src/styles/_design-system.scss` — comment on `--border-width-heavy` no longer
  mentions the section title.

**Notes:** `ng build` passes.

---

## 2026-10-03 — Category pages on `/category/:slug`; header band without categories

**Task:** Categories must not be listed in the orange header band. Clicking a category should open
a dedicated route (not the home page with `?category=`) that shows only the article list and
pagination — no hero, no "უახლესი სტატიები".

**Changes:**

- Added `features/home/pages/category-articles/*` — `CategoryArticles`: heading (kicker
  "კატეგორია", category name from `CategoriesStore`, optional description), two-column grid of
  compact `ArticleListItem`s, empty state, `Pagination` via `?page=`. 12 per page.
- Added `features/home/feed-page.scss` — shared public-feed styles (`.page-heading*`,
  `.feed-state`, `.teaser-grid`) used by home and category pages through `styleUrls`.
- Added `shared/utils/page-param.ts` — `toPage()` (moved out of `home.ts`).
- Modified `app.routes.ts` — `category/:slug` route (title "კატეგორია — Epoch").
- Modified `features/home/pages/home/*` — removed the `category` input and category heading
  (`?tag=` still works); uses the shared feed styles (`.teaser-grid`, `.feed-state`).
- Modified `core/layout/site-header/*` — the band is now an empty decorative strip
  (`--accent-band-height`, 20px) shown at all sizes, so the bar shadow applies at all sizes;
  removed `.header__nav*` styles and `RouterLinkActive`. Drawer links → `/category/:slug`.
- Modified `core/layout/site-footer/site-footer.html`,
  `features/articles/pages/article-detail/article-detail.html` — category links →
  `/category/:slug`.
- Modified `src/styles/_design-system.scss` — `--nav-band-height` (48px) replaced by
  `--accent-band-height` (20px); `features/auth/components/auth-card/auth-card.scss` updated.
- Modified `docs/PROJECT_GUIDELINES.md` — category routing, shared feed styles, band description.

**Notes:** Read literally, "no categories in the orange line" leaves the strip empty; it was kept
(slim) because the header-bar shadow effect depends on it. Categories remain reachable from the
drawer, footer and article kickers. Alternatives if wanted: drop the strip entirely, or move the
category links into the white header bar as on mentalfloss. `ng build` and `ng test` (45) pass;
verified `/category/უილიამ-შექსპირი` in the browser.

---

## 2026-10-03 — "უახლესი სტატიები" as lead card + compact teaser column

**Task:** Lay out the latest-articles section like mentalfloss's "Latest Articles": one large
lead card on the left (image, uppercase title, excerpt, meta) and a column of compact teasers
(small thumbnail, bold title, meta) on the right, with slightly rounded images.

**Changes:**

- Modified `features/home/components/article-list-item/*` — new input
  `variant: 'lead' | 'compact'` (default `compact`). Compact: 112/140px thumbnail (3:2) +
  bold title + meta, no kicker/excerpt. Lead: stacked card, 16:10 image, uppercase display
  title, serif excerpt, kicker. Thumbnails use `--radius-media`.
- Modified `features/home/pages/home/home.ts` — `lead`, `sideItems` (next 4) and `restItems`
  computed from `listItems`; `SIDE_ITEMS` constant.
- Modified `features/home/pages/home/home.html` — `.latest` grid (lead + `.latest__side`) and a
  `.latest__rest` two-column grid for remaining items so pagination keeps working.
- Modified `features/home/pages/home/home.scss` — `.latest` (1.4fr / 1fr on `lg`),
  `.latest__side`, `.latest__rest`; removed `.home__list`.
- Modified `src/styles/_design-system.scss` — tokens `--teaser-thumb-width` (112px),
  `--teaser-thumb-width-md` (140px), `--radius-media` (= `--radius-md`, 6px).

**Notes:** The full-bleed hero above the section is unchanged; the lead card is the first item
after it. Only 3 published articles exist locally, so the side column was verified with 2 items
and the "rest" grid is untested with real data. `ng build` and `ng test` (45 tests) pass.

---

## 2026-10-03 — Accent color: revert to the original coral

**Task:** Revert the accent color experiments (violet, then dark green) back to the original
coral/orange.

**Changes:**

- Modified `src/styles/_design-system.scss` — restored the original `--palette-coral-*` scale
  (`#fde7e4`, `#f8c6be`, `#f58a7b`, `#f16957`, `#e0523f`, `#c2402e`) and all tokens/literals that
  were changed in the two previous entries (`--color-accent*`, `--color-input-border-focus`,
  `--color-footer-link-hover`, `--gradient-brand`, `--shadow-btn-accent(-hover)`,
  `--focus-ring-accent`).
- Modified `docs/PROJECT_GUIDELINES.md` — visual-style description says coral again.

**Notes:** The design system is back to exactly what it was before the violet change (the
`--color-footer-rule` token removed in the footer task stays removed). `ng build` passes.

---

## 2026-10-03 — Accent color: violet → dark cool green

**Task:** Change the accent from violet to a cool, slightly dark green.

**Changes:**

- Modified `src/styles/_design-system.scss` — `--palette-violet-*` replaced by
  `--palette-emerald-{100,200,400,500,600,700}` (`#e3f3ec`, `#b9e0cd`, `#4fb98a`, `#1f8a5e`,
  `#187550`, `#125c40`); accent semantic tokens, `--color-input-border-focus`,
  `--color-footer-link-hover`, the `--gradient-brand` glow, `--shadow-btn-accent(-hover)` and
  `--focus-ring-accent` updated accordingly.
- Modified `docs/PROJECT_GUIDELINES.md` — visual-style description says dark green.

**Notes:** The accent scale is named `emerald` to keep it distinct from the existing
`--palette-green-*` used for success states. White on emerald-500 ≈4.3:1; emerald-700 on white
≈7.9:1. `ng build` passes; verified in the browser.

---

## 2026-10-03 — Accent color: coral → violet

**Task:** Replace the primary orange (coral) accent with a cool violet.

**Changes:**

- Modified `src/styles/_design-system.scss` — the `--palette-coral-*` scale is replaced by
  `--palette-violet-{100,200,400,500,600,700}` (`#efeafd`, `#d9ccfb`, `#a78bfa`, `#7c5cf6`,
  `#6a46e8`, `#5633c9`); all semantic tokens that pointed at coral (`--color-accent*`,
  `--color-input-border-focus`, `--color-footer-link-hover`) now point at the violet steps.
  Raw `rgb()` literals derived from coral were updated too: `--gradient-brand` glow,
  `--shadow-btn-accent(-hover)`, `--focus-ring-accent`.
- Modified `core/layout/site-header/site-header.scss` — comment only.
- Modified `docs/PROJECT_GUIDELINES.md` — visual-style description says violet instead of coral.

**Notes:** No component touched a coral value directly — everything goes through tokens, so the
change is confined to the design system. Contrast improves: white text on violet-500 is ≈4.4:1
(coral-500 was ≈3:1) and violet-700 text on white is ≈7.7:1. `ng build` passes; verified the
nav band, hero kicker and auth brand panel in the browser.

---

## 2026-10-03 — Remove the "პოპულარული თეგები" sidebar from the home page

**Task:** Remove the popular-tags section from the home page.

**Changes:**

- Modified `features/home/pages/home/home.html` — removed the `<aside class="home__sidebar">`
  with the tag list.
- Modified `features/home/pages/home/home.ts` — removed the `TagsApi` injection, the `tags`
  `rxResource`, `sidebarTags`, `SIDEBAR_TAGS` and the now-unused `RouterLink` import.
- Modified `features/home/pages/home/home.scss` — `.home` is no longer a two-column grid on `lg`;
  removed `.home__sidebar`, `.home__tags`, `.home__tag` styles.

**Notes:** The `?tag=` filter (and its "თეგი" page heading) still works — only the sidebar entry
point was removed. The feed now spans the full container width. `ng build` passes.

---

## 2026-10-03 — Remove coral rules from the footer

**Task:** Remove the orange (coral) lines from the footer.

**Changes:**

- Modified `core/layout/site-footer/site-footer.scss` — removed the `::before`/`::after` rules
  flanking the logo (`.footer__brand` now just centers the logo) and the `border-top` above the
  copyright.
- Modified `src/styles/_design-system.scss` — removed the now-unused `--color-footer-rule` token.
- Modified `docs/PROJECT_GUIDELINES.md` — footer description no longer mentions the coral rule.

**Notes:** `ng build` passes; verified in the browser.

---

## 2026-10-03 — Header bar shadow onto the coral band

**Task:** Recreate the mentalfloss.com effect where the white header bar casts a shadow onto the
coral category band below it.

**Changes:**

- Modified `src/styles/_design-system.scss` — new token `--shadow-header-bar` (the bar's drop
  shadow onto the band).
- Modified `core/layout/site-header/site-header.html` — wrapped `.header__bar` in a new
  `.header__top` surface element.
- Modified `core/layout/site-header/site-header.scss` — the white background moved from `.header`
  to `.header__top`, which is `position: relative; z-index: 1` so its shadow paints over the band
  (`.header__band` is `position: relative` to join the same stacking order). The shadow is
  applied only on `md+`, where the band is visible; the whole header keeps `--shadow-header`
  toward the page content.

**Notes:** On mobile the band is hidden, so adding the bar shadow there would double up with the
header shadow — hence the `up(md)` guard. Verified in the browser at 1280px; `ng build` passes.

---

## 2026-10-02 — Management area (articles, categories, users) + public article page

**Task:** Build the "მართვა" area at `/manage` — article list/editor (Quill 2), categories and
users management — plus the public article page `/articles/:slug` and a header "მართვა" button.
Only `quill` may be added as a dependency; design tokens only; Georgian UI.

**Changes:**

- Modified `package.json` — added `quill` (^2.0.3), the only new dependency.
- Modified `angular.json` — `node_modules/quill/dist/quill.snow.css` in build `styles`;
  `allowedCommonJsDependencies: ["quill-delta"]` (Quill's CommonJS dependency).
- Added `src/styles/_quill.scss` (+ `@use` in `src/styles.scss`) — global Quill overrides:
  `.ql-frame` focus/invalid/disabled states, tokenized toolbar/pickers/tooltip, Georgian picker
  and tooltip labels (CSS `content`), shared `.ql-editor` content typography (headings, lists,
  links, blockquote, images) used by both the editor and the article page.
- Modified `src/styles/_design-system.scss` — tokens `--palette-coral-200`, `--palette-red-700`,
  `--color-surface-hover`, `--color-accent-border`, `--color-danger-hover`, `--container-dialog`,
  `--editor-sidebar-width`, `--border-width-heavy`, `--z-sticky`, `--chip-height`,
  `--progress-height`, `--table-row-min-height`, `--table-action-width`, `--thumb-width`,
  `--editor-min-height`, `--editor-picker-width`.
- Modified `shared/ui/icon/*` — icons `plus`, `edit`, `trash`, `upload`, `image`,
  `chevron-down`, `external-link`, `settings`, `search`.
- Modified `shared/ui/button/*` — variants `danger` and `danger-ghost` (ghost selectors merged to
  stay under the 4 kB style budget).
- Added `shared/ui/select/*` (+ spec) — `Select` CVA on a native `<select>`: `label`, `options`,
  `placeholder`, `hint`, `hideLabel`, `errorMessages`; output `selectionChange`.
- Added `shared/ui/textarea-field/*` — `TextareaField` CVA (InputField API + `rows`,
  `maxlength`, `showCount`).
- Added `shared/ui/badge/*` (+ spec) — `<app-badge variant="neutral|success|accent|info">`.
- Added `shared/ui/empty-state/*` — icon, title, description and projected actions.
- Added `shared/ui/confirm-dialog/*` (+ spec) — native `<dialog>` modal (`open()`/`close()`,
  `confirmed`/`cancelled`, `danger`). The result is settled synchronously (the native `close`
  event is async and could arrive after a reopen, blanking the dialog — found in browser testing).
- Added `shared/validators/tag-list.ts` (`tagListValidator`) and `rich-text-required.ts`
  (`isRichTextEmpty`, `richTextRequired`).
- Added `features/manage/manage.routes.ts` — `/manage` (moderator + admin) with `articles`,
  `articles/new`, `articles/:id` (both `canDeactivate: [unsavedChangesGuard]`), and admin-only
  `categories`, `users`.
- Added `features/manage/manage-errors.ts` (+ spec) — Georgian messages for backend manage
  errors (duplicate category, category in use, own role, image in use, not found, 403…).
- Added `features/manage/manage-labels.ts` — status/role labels and badge variants, `toPage()`,
  `ARTICLE_DELETED_STATE_KEY`.
- Added `features/manage/manage-page.scss` — shared page styles (toolbar, filter chips, list,
  states, alerts).
- Added `features/manage/unsaved-changes-guard.ts` — `HasUnsavedChanges` + `unsavedChangesGuard`.
- Added `features/manage/components/manage-shell/*` — "მართვა" kicker, h1 from the route title,
  role-aware tabs.
- Added `features/manage/components/rich-text-editor/*` — Quill 2 CVA, lazy-loaded in
  `afterNextRender`; image upload via toolbar/paste/drop (`core/editor` helpers), base64/blob
  images rejected with a message; Georgian toolbar aria-labels; textbox ARIA mirrored from the control.
- Added `features/manage/components/cover-image-picker/*` — cover upload (drag/drop or picker)
  with progress bar, preview, alt text saved on blur, replace/remove.
- Added `features/manage/components/tags-input/*` (+ spec) — chip input (`parseTags`, `mergeTags`).
- Added `features/manage/components/article-row/*` — list row with thumbnail, status badge and
  edit/publish/unpublish/delete actions.
- Added `features/manage/components/category-form/*` — create/edit category form.
- Added `features/manage/pages/manage-articles/*` — status filter, paginated list, row actions,
  delete confirmation, empty state.
- Added `features/manage/pages/article-editor/*` (+ `article-form.ts` / spec) — create/edit
  form; update sends only the diff; publish saves pending changes first; delete; leave prompt
  (`ConfirmDialog` + `beforeunload`).
- Added `features/manage/pages/manage-categories/*` — create, inline edit, delete (disabled
  while the category has published articles).
- Added `features/manage/pages/manage-users/*` — role filter, table (cards on mobile), role
  change with confirmation; own role is disabled.
- Added `features/articles/articles.routes.ts` and `pages/article-detail/*` — public article page.
- Modified `app.routes.ts` — `ARTICLES_ROUTES` and `MANAGE_ROUTES` before `**`.
- Modified `core/layout/site-header/*` — "მართვა" button for moderators/admins.
- Modified `features/home/components/article-list-item/article-list-item.html` — removed
  `sizes="(min-width: 768px) 240px, 120px"`: in dev mode `NgOptimizedImage` throws NG02952 for
  pixel `sizes`, so feed thumbnails were not rendered once a second article was published.
  Without an image loader there is no `srcset`, so `sizes` had no effect anyway.
- Modified `docs/PROJECT_GUIDELINES.md` — UI kit table, manage/articles features, Quill and
  unsaved-changes conventions.

**Notes:**

- Article HTML is rendered with `bypassSecurityTrustHtml`: Angular's sanitizer strips
  `data-list`, which Quill 2 lists need. The backend sanitizes content with an allowlist.
- Stored HTML is loaded into Quill with `clipboard.convert` + `setContents` (not
  `dangerouslyPasteHTML`, which moves focus into the editor).
- Guests opening `/manage` are sent to `/login?returnUrl=%2Fmanage%2Farticles` (the redirect
  resolves before the guard).
- The API has no user create/delete, so the users page only changes roles.
- A category's `articleCount` counts only published articles; deleting a category used only by
  drafts still returns 409, which is shown as a Georgian error.
- Test accounts `qa_admin`, `qa_moderator`, `qa_user` were created in the local DB for testing.
- A running `ng serve` must be restarted to pick up the `angular.json` changes.

---

## 2026-10-02 — UI modernization: buttons, inputs, auth pages, footer, drawer

**Task:** Make the UI feel more modern and polished (Linear/Vercel/Stripe-like details) while
keeping the editorial identity: restyle buttons, inputs, checkbox and alerts; turn login/register
into a split-screen product sign-in page; redesign the footer in the mentalfloss style (dark slate,
centered logo on a coral rule, uppercase link grid); strip auth links from the drawer and footer.

**Changes:**

- Modified `src/styles/_design-system.scss` — new tokens: palette (`gray-800/300/50`,
  `ink-900/800/700/400/200`, `slate-800`, `coral-400/700`, `blue-100/200`, `green-200`,
  `red-200`, `amber-500`); semantic (`--color-surface-muted`, `--color-surface-raised-hover`,
  `--color-accent-text` (AA coral for text), `--color-accent-on-dark`, `--color-info*`,
  `--color-danger-border`, `--color-success-border`, `--color-warning`, `--color-input-*`,
  `--color-footer-{bg,text,muted,heading,rule,link-hover}`); `--gradient-brand`,
  `--pattern-dots(-size)`, `--mask-fade-down`; type `--text-md` (15px), `--text-6xl`,
  `--letter-spacing-wider`; radii rescaled (`sm 4`, `md 6`, `lg 10`, new `xl 14`, `2xl 20`) +
  `--radius-control`; shadows `--shadow-xs/lg`, `--shadow-btn*`, softer `--shadow-md/header`;
  motion `--duration-slower`, `--easing-out`, `--easing-spring`; `--input-height`,
  `--checkbox-size`; focus rings (`--focus-ring` is now a white-gap + ink double ring,
  `--focus-ring-inverse/accent/danger`), `--shadow-autofill`; `--container-form` 480px;
  `--color-focus` → ink.
- Modified `src/styles/_mixins.scss` — added `motion-ok` (prefers-reduced-motion wrapper).
- Modified `shared/ui/button/*` — 10px radius, semibold 15px text, depth shadows with inner
  highlight on `primary`/`accent`, hover lift + pressed scale, ink focus ring, intentional
  `outline` (white + gray border) and `ghost` styles, elegant disabled, loading overlay that keeps
  the width (content fades, centered spinner). New optional input `pill`; icon slots
  `[btnIconStart]` / `[btnIconEnd]`.
- Modified `shared/ui/input-field/*` — label-above design, 48px field with light-gray bg that
  turns white on focus, coral border + soft glow on focus, red border + red glow + icon message on
  error, autofill fix (`:-webkit-autofill`), rounded hover/focus toggle button.
- Modified `shared/ui/checkbox/*` — 6px rounded box, spring scale/opacity check animation,
  ink fill, error state with soft red fill, error message with icon.
- Modified `shared/ui/alert/alert.scss` — rounded, soft background + 1px tinted border, info
  variant is now blue.
- Modified `shared/ui/pagination/pagination.scss` — 1px borders, 10px radius, hover fill, focus ring.
- Added `features/auth/components/auth-brand/*` — dark brand panel (gradient + dot pattern,
  large "EPOCH" wordmark, tagline, 3 feature bullets) shown on ≥1024px.
- Modified `features/auth/components/auth-card/*` — now the page shell: split screen on `lg`
  (brand 5fr / form 7fr), tinted form side, borderless-feeling card (20px radius, `--shadow-lg`),
  compact "Epoch" eyebrow on mobile, fade/slide-up entrance (`motion-ok`).
- Added `features/auth/components/password-strength/*` (+ spec) — 4-segment strength meter
  using `API_LIMITS.password` rules (`scorePassword`).
- Modified `features/auth/pages/register/*` — password strength under the password field
  (`toSignal` of the control's `valueChanges`), `.form__group` wrapper.
- Modified `features/auth/auth-form.scss` — accent link style, `.form__group`.
- Modified `core/layout/site-footer/*` — mentalfloss-style footer: dark slate surface, centered
  inverse logo sitting on a thin coral rule, centered uppercase category-link grid (only when
  categories exist), coral-ruled centered copyright. No tagline, no auth/nav links (navigation
  will be added with categories/articles).
- Modified `core/layout/site-header/*` — drawer: no border radius, auth buttons and "მთავარი"
  removed, shows only categories (with an empty state); rounded hover on menu button and drawer
  links; animated underline on nav-band links.
- Modified `core/layout/logo/logo.scss` — inverse focus ring on dark surfaces.
- Modified `features/home/pages/home/home.scss`, `components/article-list-item/*.scss` —
  kickers use `--color-accent-text`; tags use 1px borders.
- Modified `docs/PROJECT_GUIDELINES.md` — UI kit table (`pill`, icon slots,
  `PasswordStrength`), token/focus-ring conventions, footer/drawer description.

**Notes:**

- `ng build` (no budget warnings) and `ng test` (24 tests) pass. Verified in the browser at 1280px:
  split layout, error state, focus glow; the footer/drawer follow-up was done without screenshots
  at the user's request.
- Coral (`--color-accent`) fails AA for small text on white, so text uses `--color-accent-text`
  (coral-700); the input focus border uses coral-600 (≥3:1).
- The brand panel's feature bullets are generic marketing copy — adjust when real features exist.

---

## 2026-10-02 — Design system, custom UI kit, layout, home, login & register pages

**Task:** Build a mentalfloss.com-style design with შესვლა / რეგისტრაცია buttons in the header,
create the login and register pages, custom form components (no third-party libraries), and a
design system file whose variables every component uses.

**Changes:**

- Added `src/styles/_design-system.scss` — design tokens (palette + semantic colors, fonts, type
  scale, weights, line heights, spacing, layout sizes, radii, shadows, motion, z-index,
  control sizes) as CSS variables inside the `tokens` mixin, plus SCSS `$breakpoints`.
- Added `src/styles/_mixins.scss` (`up`, `down`, `container`, `display-text`, `focus-ring`,
  `visually-hidden`, `line-clamp`, `reset-button`), `_reset.scss`, `_base.scss`.
- Modified `src/styles.scss` — uses the design system, reset and base; emits the tokens.
- Modified `angular.json` — `stylePreprocessorOptions.includePaths: ["src/styles"]`.
- Modified `src/index.html` — `lang="ka"`, title "Epoch", Noto Sans/Serif Georgian fonts.
- Added shared UI kit in `src/app/shared/ui/`: `icon` (inline SVG set), `spinner`, `button`
  (`button[appButton], a[appButton]`), `input-field` (CVA, label/hint/error, password toggle),
  `checkbox` (CVA, projected label), `alert`, `pagination`, and `form-control/control-state.ts`.
- Added `src/app/shared/validators/validation-messages.ts` (Georgian messages) and
  `matches-control.ts` (confirm-password validator).
- Added `src/app/shared/pipes/time-ago-pipe.ts` — Georgian relative time ("3 საათის წინ").
- Added `src/app/core/services/categories-store.ts` — app-wide categories via `rxResource`.
- Added `src/app/core/layout/`: `logo`, `site-header` (sticky header, logo, შესვლა /
  რეგისტრაცია or username + გასვლა, coral category band on ≥768px, slide-in drawer menu),
  `site-footer` (black footer with categories), `main-layout`.
- Added `src/app/features/home/`: `pages/home` (hero for the newest article, "უახლესი სტატიები"
  list, popular tags sidebar, pagination; filters via `?category=`, `?tag=`, `?page=`),
  `components/article-hero`, `components/article-list-item`.
- Added `src/app/features/auth/`: `pages/login`, `pages/register`, `components/auth-card`,
  `auth-form.scss` (shared form styles), `auth-errors.ts` (Georgian server-error translations,
  `safeReturnUrl`), `auth.routes.ts` (`/login`, `/register`, both with `guestGuard`).
- Added `src/app/features/not-found/pages/not-found` — 404 page (wildcard route).
- Modified `src/app/app.routes.ts` — `MainLayout` with home, auth routes and 404 as children.
- Modified `src/app/app.config.ts` — `withComponentInputBinding()`,
  `withInMemoryScrolling({ scrollPositionRestoration: 'top' })`.
- Modified `src/app/app.ts` — inline `<router-outlet />`, OnPush; removed `app.html`, `app.scss`;
  updated `app.spec.ts`.
- Modified `core/api/api-error-messages.ts` and `core/api/images/image-file.ts` — generic and
  image-validation messages are now Georgian.
- Modified `docs/PROJECT_GUIDELINES.md` — design system rules, UI kit catalog, layout notes.

**Notes:**

- Verified in the browser: header, login/register forms, validation messages (incl. password
  mismatch and terms checkbox), checkbox states, mobile drawer. `ng build` (no budget warnings)
  and `ng test` (20 tests) pass.
- Article cards link to `/articles/:slug`, which doesn't exist yet (shows the 404 page) — the
  article page is the next natural task.
- The register page's terms checkbox has no terms page to link to yet.
- `ng serve` must be restarted after `angular.json` changes (new Sass include path).
- Fonts load from Google Fonts (a CDN stylesheet, not a JS library); change `--font-sans` /
  `--font-serif` and `index.html` to self-host if needed.

---

## 2026-10-01 — Typed client layer for the Epoch API

**Task:** Create TypeScript models, API services, auth state, auth interceptor, route guards,
helpers and a Quill image-upload helper for the NestJS "Epoch API" backend. No UI.

**Changes:**

- Added `src/environments/environment.ts` (production, placeholder `apiUrl`) and
  `environment.development.ts` (`apiUrl: 'http://localhost:3000'`) via `ng g environments`;
  `angular.json` got the matching `fileReplacements` for the development configuration.
- Added `src/app/shared/models/paginated.ts` (`Paginated<T>`) and `api-error.ts` (`ApiError`).
- Added `src/app/core/api/`:
  - `common.models.ts` — `Role`, `ROLES`, `ArticleStatus`, `ARTICLE_STATUSES`
  - `api-limits.ts` — `API_LIMITS` for forms
  - `http-params.ts` — `toHttpParams()` (skips `undefined` / `null` / `''`)
  - `client-validation-error.ts` — `ClientValidationError` (client-side rejections, no request sent)
  - `api-error-messages.ts` — `getApiErrorMessages()`, `isApiError()`
  - `auth/` (`AuthApi`, auth models), `users/` (`UsersApi`, `User`…), `categories/`, `images/`
    (`ImagesApi` + `image-file.ts` with `validateImageFile`, `IMAGE_FILE_ACCEPT`), `articles/`, `tags/`
  - `index.ts` — barrel export of all models, helpers and API services
- Added `src/app/core/auth/`: `auth-service.ts` (`AuthService`: token in `localStorage` under
  `epoch_access_token` + expiry under `epoch_access_token_expires_at`, auto-logout timer,
  `currentUser` signal, `isLoggedIn` / `isAdmin` / `isModerator` / `canWriteArticles`,
  `loadCurrentUser()`), `auth-interceptor.ts`, `auth-guard.ts`, `guest-guard.ts`, `role-guard.ts`.
- Added `src/app/core/tokens/auth-config.ts` — `AUTH_CONFIG` (`loginUrl`, `homeUrl`,
  `redirectToLoginOn401`, default `false`).
- Added `src/app/core/editor/quill-image-handler.ts` — `createQuillImageHandler`,
  `createQuillUploaderHandler` (Quill 2 drop/paste of files), `preventInlineImages` (strips
  `data:`/`blob:` images), with local minimal Quill types (Quill is not installed).
- Modified `src/app/app.config.ts` — `provideHttpClient(withInterceptors([authInterceptor]))` and
  `provideAppInitializer(() => inject(AuthService).loadCurrentUser())`.
- Added tests: `articles-api.spec.ts`, `images-api.spec.ts`, `api-error-messages.spec.ts`,
  `auth-interceptor.spec.ts`. `ng build` and `ng test` (21 tests) pass.
- Modified `docs/PROJECT_GUIDELINES.md` — documented the API client layer and removed the
  `withFetch()` recommendation.

**Notes:**

- Naming follows the project guidelines: API classes are `XxxApi` in `core/api/<resource>/xxx-api.ts`
  (instead of `XxxService` in `core/services/`). The auth state class keeps the name `AuthService`.
- `withFetch()` is intentionally not used: the fetch backend doesn't emit upload progress.
- Guards redirect to `/login` and `/` by default; those routes don't exist yet. Override
  `AUTH_CONFIG` when they are created.
- If `GET /auth/me` fails on app start with a non-401 error (e.g. network), the token is kept but
  `currentUser` stays `null`.

---

## 2026-10-01 — Project guidelines and change log

**Task:** Create project structure/coding guidelines and a change log that the AI agent must read
before every task and update after every task.

**Changes:**

- Added `docs/PROJECT_GUIDELINES.md` — folder structure (`core` / `shared` / `features`),
  dependency rules, naming conventions, when to create shared components / directives / pipes /
  services / API services / utils, and modern Angular 21 syntax rules (signals, `inject()`,
  `input()`/`output()`, control flow, OnPush, zoneless, functional guards/interceptors, typed forms).
- Added `docs/CHANGELOG.md` — this file.
- Added `.cursor/rules/project-workflow.mdc` — always-applied Cursor rule that makes the agent read
  both docs before each task and update this change log after each task.

**Notes:** Project state at this point is the fresh Angular 21 CLI scaffold (`App` root component,
empty `routes`, no features yet).
