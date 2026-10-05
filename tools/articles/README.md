# Article drafts tool

Writes articles as Python sources and uploads them to the production API as **drafts**
(never published). Start from `articles/_template.py`; for tone and depth, read an existing
article in the database (e.g. "რიჰარდ ვაგნერი" or the composer articles). Delete a source file
once its draft is uploaded — the database is the source of truth.

## Workflow

1. Write `articles/<name>.py` (copy `_template.py`). Fields:
   - `title` — 3–200 chars; `category` — category name or slug (must exist);
   - `image` — direct URL of the cover (JPEG/PNG/WebP, ≤ 5 MB; prefer public-domain
     Wikimedia Commons files, ~1600–1920 px wide); `alt` — Georgian description, ≤ 200 chars;
   - `tags` — max 10, each 1–30 chars; `content` — built with the helpers from `lib.py`.
2. `python3 tools/articles/build.py <name> [<name> ...]` — validates the limits, downloads the
   covers to `build/images/`, writes `build/payloads.json` and plain-text proofs to
   `build/proofs/`. Proofread the proofs and look at the images.
3. `python3 tools/articles/serve.py` (keep running).
4. `npm run start:prod-api`, log in at `http://localhost:4200` as a moderator/admin, then run
   `upload.js` in that tab (DevTools console, or an agent via CDP `Runtime.evaluate` with
   `awaitPromise: true`). The token never leaves the page. Existing titles are skipped.
5. Stop `serve.py`. Check the drafts in `/manage/articles` ("დრაფტები" filter); every line of
   the result should say `draft` and `content intact`.

## Article structure (same as "რიჰარდ ვაგნერი")

- Intro: `<strong>Name</strong> (Original Name, years)` + who they were; a paragraph listing the
  main works in bold „…“ quotes; a paragraph starting "მისი განსაკუთრებულობა იმაში
  მდგომარეობს, რომ …".
- `H2('მოკლე ბიოგრაფია')` with `H3` sub-periods.
- `H1` sections on the main works / ideas.
- `H1('საინტერესო ფაქტები <name-dative>ზე')` with numbered `H3('1. …')` facts.
- `H1('… მემკვიდრეობა')`: death date and place in bold, influence, a `UL` list, and a final
  bold sentence: "… მთავარი ისტორიული მნიშვნელობა შეიძლება ერთ წინადადებაში ასე
  ჩამოვაყალიბოთ: …".

Writing rules: literary Georgian, quotes „…“, em dash —, Roman numerals for centuries (XIX
საუკუნე), dates as "1685 წლის 21 მარტს". Mark legends and disputed claims as such
("ლეგენდის მიხედვით", "სავარაუდოდ").
