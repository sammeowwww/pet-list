# PetList

A practical daily planner with a pixel puppy cheering you on. The Figma TaskTails layout supplies the typography, cards, colors, and five-tab interface; the original application supplies tasks, rewards, backups, inventory, and the animated meadow. Built with React, TypeScript, Vite, and locally bundled fonts. Guest mode saves locally; Google accounts sync through Cloudflare Pages Functions and D1.

## Run locally

```sh
npm install
npx wrangler d1 migrations apply petlist --local
npm run build
npm run dev:api # separate terminal
npm run dev
```

Open http://127.0.0.1:5173. Navigation is **Today · Tasks · Home · Shop · Settings**, with Home centered and initially selected.

- **Today:** manage planned tasks, overdue carryovers, and flexible General tasks. Statuses are To do, In progress, and Completed.
- **Tasks:** General opens first as an undated scope. Use its dropdown for All categories or a named category, and combine it with All tasks or Completed. Unfinished tasks appear first; completed history is collapsed, searchable, and paginated.
- **Home:** Bob walks slowly and rests in the meadow. Completing a task triggers ten seconds of faster pacing, hops, and pixel flowers. Repeated completions extend the celebration; undo removes only that completion's contribution. Your selected tab stays open.
- **Shop:** adopt a black cat, white bunny, or hamster for 60 coins each, or buy the original six decorations and place or store them in Home's inventory.
- **Settings:** Google sign-in, sync status, conflict review, backup export/import, sample tasks, reset controls, and a synced default task category (Personal initially). The header settings button opens this page.

The minimal task form starts with name and category. Optional details reveal planning date, deadline, and notes. Every task displays its 5-coin reward. Planned days and deadlines remain separate. Dates use Asia/Singapore. A deadline time without a date resolves to today; a date without a time ends at 23:59:59.

Every new completion earns 5 coins, regardless of deadline or legacy effort. Historical and already-pending rewards retain their original value. A ten-second undo window precedes reward settlement and prevents shopping or bonus claims. A daily 10-coin bonus requires a nonempty Today list with all tasks finished and at least one completion today. It can be claimed once per day.

## Persistence and compatibility

The original `little-by-little:v1` storage key remains unchanged. Backups now use version 4; versions 1–3 migrate automatically with the six original category IDs and existing preferences. Missing preferences default to Personal and missing repeating definitions default to none. Existing tasks, category values, coins, purchases, and placements load directly. Health, Errand, and Home extend the category choices. Temporary meadow celebrations never enter saved progress.

Guest progress belongs to the browser and origin. Google account progress is stored in D1, with a separate per-account device cache and durable outbox. Actions sync on reconnect and every five seconds while visible. The server rebases individual actions against its latest revision; independent task-field edits merge, conflicting edits remain in Settings for review. Receipts and revision checks prevent duplicate rewards. Offline undo retains the original ten-second intent window. Feeding uses the action's original Singapore day, so reconnecting after midnight does not move yesterday's meal into today.

After signing in, use Settings → **Move this device’s progress online** from the device holding the desired planner. This explicit replacement checks the cloud revision and retains the original device copy. Export both versions before replacing meaningful cloud progress. Import validates the entire backup before confirming replacement. Corrupt stored data is preserved until explicitly reset or replaced with a valid backup. Offline reopening works after the production site has loaded and its service worker has cached the shell; account APIs are never cached.

## Checks

```sh
npm test
npm run build
npm run test:e2e
```

Domain tests cover rewards, Singapore dates, compatibility, history, safe walking routes, and celebration lifetime/undo. Browser tests cover desktop and phone layouts, forms, status changes, persistence, backups, shop placement, font loading, keyboard dialogs, visibility pauses, and reduced motion. Tests use installed Google Chrome; adjust `playwright.config.ts` if needed. Screenshots are saved under `screenshots/`.

## Structure

`src/domain` owns task/reward transitions, dates, validation, persistence, history, and pure movement/celebration rules. `src/hooks` connects persistence and dog motion to browser lifecycle. `MeadowScene`, `DogAnimation`, and `CelebrationFlowers` keep scene behavior separate from task rewards; scene styles live in `src/meadow.css`. Safe field routes avoid the house, trees, and placed decorations. Movement pauses while decorating or hidden. Reduced motion keeps Bob stationary with temporary static flowers.

Native modal dialogs contain keyboard focus and close with Escape. Inventory placement uses buttons rather than requiring dragging. Fonts are served locally. Vite binds to localhost without Figma's hosted development plugins.

The supplied ZIP and Figma component reference are retained in `reference/`; `reference/pre-figma/src` preserves the previous implementation.

## Art

`public/dog.png` was prepared with the built-in imagegen tool from `dog_pixelated.jpeg`: extract the sitting golden puppy from the top-left cell, preserving cream/gold fur, dark pixel outlines, and its sitting pose; remove the blue background/grid; transparent full-body cutout, small margin, no text or shadow.

`public/dog-walk.png` was prepared with the built-in imagegen tool using the resting dog and supplied walking reference. Prompt brief: create four phases of the same golden puppy walking right in a 2×2 sprite sheet; invisible grid, identical scale and appearance, aligned paws at an 88% baseline in each cell, transparent background, dark pixel outlines, no text or shadows. Generated transparency is preserved. `scripts/inspect-sprites.cjs` reads alpha bounds without editing pixels; `src/dog-walk.meta.json` supplies SVG clipping and baseline alignment for each frame. Meadow and decoration art are project-native SVGs.

Pets: Bob is free. Collect all four companions and keep up to three active. Feeding costs no coins and gives +3 once per pet per Singapore day, capped at three distinct gift recipients per day. Additional pets can still eat free after swapping. Missed meals leave pets hungry until fed; no penalties or backdated debt. Ownership, active roster and feeding history sync with the planner. Movement avoids other pets and decorations, and respects reduced motion. Pet purchases wait for pending task rewards to settle.

`public/cat.png`, `public/bunny.png`, and `public/hamster.png` were generated with the built-in imagegen tool using the puppy as a style reference. Prompt brief: four equal cells in a transparent 2×2 sheet, resting right, walking right step A, walking right step B, and happy resting right; consistent chunky pixels, dark outlines, same character design and scale, paws at an 88% baseline, no text, shadows or background. Species: charcoal black cat with golden eyes, cream-shaded white bunny with pink ears, and golden hamster with cream belly. Alpha metadata in `src/*.meta.json` aligns the frames without editing the generated pixels.

## General and repeating tasks

Home lists the first five unfinished General tasks. Its Add button creates an undated task; View all opens Tasks → General. Adding a planned date or deadline moves a task out of General. Today keeps its date selector and previous/next week controls. General tasks do not prevent the daily bonus.

Repeat is under optional details: Never, Daily, Weekdays, or Selected weekdays (at least one). A start date is required, defaulting to Singapore today; the first occurrence uses the first eligible day on or after it. Recurring deadlines are optional times on each planned day. Ordinary deadlines remain independent.

There is only one unfinished occurrence per series. Missed tasks stay overdue. After the ten-second undo window, the next occurrence uses the first eligible day after the actual completion date. Opening later leaves that single task overdue. Future occurrences cannot be completed early. Each occurrence earns five coins. Editing changes the definition and current unfinished task, preserving completed records. Turning Repeat off leaves an ordinary task. Deleting a current recurring task confirms that repetition will stop and retains completed records.

Client and server share recurrence calculations and deterministic occurrence IDs. The existing revision/receipt checks guard rewards and successor creation. A delayed offline undo removes a successor only if untouched; edits or status changes produce a review conflict rather than delete another device’s work.

## Interactive pets and Home Screen icon

Hungry pets sit and gently sway. A transparent pixel bone bubble from the supplied reference sits above each pet. Click, tap, or focus and press Enter/Space to feed; the existing feeding cards use the same action. Decorating disables direct feeding. Duplicate feeding cannot grant coins or restart reactions.

Successful local feeding displays an independent heart bubble for ten seconds and the existing brief happy reaction, then normal movement resumes. Heart timers are temporary and never synced or replayed. Task celebrations override hungry movement, while bubbles retain their own timing. Hidden pages, decorating and reduced motion pause movement. Timers still expire by wall-clock time.

`public/hunger-bubble.png` and `public/heart-bubble.png` were prepared with the built-in imagegen tool: extract only the cream pixel bone speech bubble from the supplied reference, removing the surrounding scene, character and text; then preserve the bubble’s outline and tail while replacing the bone with a red/pink pixel heart. Both use transparent alpha backgrounds.

The header’s gold paw logo is supplied as an opaque 180px Apple touch icon and 192px/512px manifest icons. Regenerate them with `node scripts/build-icons.mjs`. In iPhone Safari, open the live site, choose Share → Add to Home Screen, and keep Open as Web App enabled. The shortcut is named PetList. If an older shortcut has the wrong icon, add a fresh shortcut from the updated page. Physical iPhone installation requires checking on your device; automated checks verify the metadata, manifest and PNG assets.

Notifications, additional rooms, and more characters remain future work.

## Cloudflare deployment

Production: https://pixel-list.pages.dev/

```sh
npm run build
npx wrangler@4.147.0 pages deploy dist --project-name pixel-list --branch main
```

`wrangler.jsonc` configures production output, the D1 binding, and the public Google client ID. Deploy also compiles `functions/api/[[path]].ts` into a Pages worker. Only build assets and the compiled worker are uploaded; source references, test data, and local backups are excluded.

Browser storage belongs to each origin. To move existing localhost progress to the live site, export a backup from localhost Settings, then import it in live-site Settings. The schema and storage key remain compatible; the branding change does not alter saved data.

## Google account setup and API

The Web application Google client must authorise `https://pixel-list.pages.dev`. For local sign-in, authorise `http://127.0.0.1:5173` (or use localhost and authorise that exact origin). A Testing-mode consent screen must list the user as a test user. No client secret is used. See [Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) and [Cloudflare bindings](https://developers.cloudflare.com/pages/functions/bindings/).

The server verifies Google's signed ID token (issuer, audience, expiry, verified email, login nonce) and creates an HttpOnly, SameSite=Lax session cookie, Secure in production. Only SHA-256 token hashes are stored. Planner APIs require this session; writes require the same Origin. Each Google subject has its own planner and receipts. `/api/session`, `/api/login`, `/api/logout`, `/api/planner`, and `/api/sync` are the only API routes. D1 migrations are in `migrations/`. Before a production deployment, run `npx wrangler d1 migrations apply petlist --remote`.

Checks include SQL-backed concurrency/account-isolation tests and browser tests for two device contexts, offline queued edits, pet ownership/feeding, mobile input font size, and production offline shell reload. An actual Google account login must be completed by the user on the deployed origin; tests do not bypass authentication in production. The 16px mobile fix is browser-emulated, not a claim of physical iPhone Safari verification.

## Source repository

https://github.com/sammeowwww/pet-list (private). The repository contains app source, tests, deployment configuration, art assets, and retained Figma references. Device progress, Cloudflare sessions, caches, credentials and generated build output are excluded by `.gitignore`. Cloudflare deployment currently uses Wrangler; pushing GitHub does not automatically deploy.

## Editable categories, task views, and guide

Tasks opens on General → All tasks. General is the undated scope across categories; it also includes completed undated tasks. All categories and named categories include scheduled and unscheduled tasks. Category changes retain the status filter and search. All tasks places undated unfinished work first, then ascending planned/deadline dates, with completed records collapsed by default. Completed uses the last 30 Singapore calendar days (including today), or All time. Each section displays 25 records with independent Show more controls; display pagination never deletes records or changes the 10,000-task storage limit.

Settings manages stable category IDs, display names, and the default category. The original six IDs keep their badge palettes; new IDs use Personal styling. Removing a category atomically moves ordinary tasks, completed records, repeating definitions, and the default preference to an active replacement. Redirects remain in the synchronized catalog for stale offline task/preference commands. A moved repeating successor is marked touched, so delayed undo cannot discard it. Concurrent rejected category changes are retained in Settings for review. Backups now export version 4; versions 1–3 migrate with the six original categories and existing preferences.

The companion panel starts expanded. Its minimise choice is stored locally per device, retaining active count, hunger summary, and the shop link; direct meadow feeding remains available. The eight-step illustrated walkthrough uses inert examples and existing pet art without changing the selected tab or planner. Welcome dismissal/completion and companion collapse are local UI preferences, not synchronized planner fields. Settings offers Replay walkthrough. Native modal dialogs supply focus trapping and Escape dismissal; motion reduction applies to the guide and app.

Verification includes category migrations and redirect chains, SQL receipt contention, category replacement protecting recurring undo, all scope/status combinations, search, Singapore date boundaries, independent pagination, two-device offline category replacement and conflict review, backup import, guide completion/skip/replay/focus trapping, and companion collapse with meadow feeding. Desktop and phone captures are in `screenshots/petlist-v4-*`.

Dialogs explicitly mark the background inert and lock page scrolling, restoring the previous position on close. The walkthrough focuses its container on touch devices to avoid an automatic button focus ring; keyboard button focus remains visible. Form fields keep their ordinary border without a focus outline/glow, and interactive controls suppress the mobile tap overlay.
