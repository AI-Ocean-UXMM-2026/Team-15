# INVENTO — warehouse inventory MVP (PRD v1.1)

Mobile-first inventory app for small Myanmar warehouses: React + Vite frontend, Elysia API, **MongoDB** database.
Built against `references/INVENTO-PRD-v1.1.pdf`.

## Features (PRD Phase 1)
- **Typing input (5.1)** — name, description, FDA code, supplier name/phone/email, QR/barcode (camera scan), up to 4 photos, stock-in date, expiry date, remarks, quantity
- **Push-to-talk (5.2)** — scan code → hold button and speak (English or Burmese, browser speech recognition) → review transcript, retry → confirm into a review table → add expiry/remarks → save. Existing codes update the product; new codes become the product's unique ID. Typing the phrase works when speech is unavailable.
- **Ship out (5.3)** — category filter, product dropdown, quantity; cannot exceed stock (atomic check)
- **Item status & supplier reorder (5.4)** — In stock / Low / Out of stock / Pending / Confirm shipping; Received adds stock automatically
- **Alerts & settings (5.5)** — low stock, out of stock, expiry; configurable expiry reminder days and per-product thresholds
- **History (5.6)** — every movement with before/after quantities, actor and time
- **Smart restock forecast** — average daily ship-out over 30 days predicts "runs out in ~N days" and a suggested order quantity (3 weeks of cover); "Running out soon" alerts fire before stock hits the threshold
- **One-tap supplier order** — order message written in Burmese/English, sent through the phone's share sheet, Viber, Telegram or SMS
- **QR label printing** — sticker sheet for products without barcodes; scanning a label finds the product
- Physical count with required reason on variance
- `npm --prefix api run reset-demo` rebuilds only the demo account with 30 days of history (set `MONGODB_URI` to target Atlas)
- Full English / Burmese UI — all text lives in `web/src/text.ts` (`npm --prefix web run check` fails if a Burmese string is missing)

## Run locally (Windows)
MongoDB Server runs as the Windows service **MongoDB** (auto-start) at `mongodb://127.0.0.1:27017`, database `invento`.

The API uses Elysia 2 (`2.0.0-rc.0`) and needs Node.js 22.18+ for its Node adapter, or Bun 1.4+. Run the API with Bun instead of Node with `bun --watch api/server.js`.

```bash
npm run setup
```
```bash
npm run dev
```
Open http://localhost:5173 — demo login `demo@invento.local` / `InventoDemo!2026` (created automatically on an empty database).

`api/.env` (copy from `api/.env.example`): `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `WEB_ORIGIN`, `SEED_DEMO`; optional `LOG_LEVEL` and `SLOW_REQUEST_MS`.

Tests: `npm test` (voice parser, expiry parser, API route tests, and translation type check). Inspect data with `mongosh` → `use invento`.

## Logging
Every request logs one line with its status, duration and a request id. The same id is returned in the `X-Request-Id` response header, so a browser error can be matched to a server log.

- Locally the line is compact and colorized when the terminal supports it.
- On Vercel (or with `LOG_FORMAT=json`) each line is a JSON object for log drains.
- `LOG_LEVEL=debug|info|warn|error|silent` sets the minimum level (`info` by default).
- Requests slower than `SLOW_REQUEST_MS` (default `1000`; `0` disables) log at warn level and are tagged `SLOW`.
- Startup, database connection and graceful shutdown are logged too.
- MongoDB connection strings are redacted before they are logged.

## Deploy to Vercel
`vercel.json` builds `web/` as static files and serves the API from `api/index.js` as a serverless function.
Vercel cannot reach the MongoDB on your PC, so use a MongoDB Atlas cluster (free tier works) and allow access from `0.0.0.0/0` in Atlas Network Access.

```bash
vercel login
```
```bash
vercel link
```
Set environment variables (Production): `MONGODB_URI` (Atlas `mongodb+srv://…` string), `MONGODB_DB=invento`, `JWT_SECRET` (long random), `SEED_DEMO` (`true` for a demo, `false` for real use). Then:
```bash
vercel deploy --prod
```

## API
`GET /api/docs` lists every endpoint. Main ones: `/v1/auth/*`, `/v1/products`, `/v1/products/lookup/:code`, `/v1/stock/in`, `/v1/stock/in/batch` (push-to-talk save), `/v1/stock/out`, `/v1/stock/counts`, `/v1/voice/parse`, `/v1/reorders`, `/v1/alerts`, `/v1/movements`, `/v1/warehouse`.

## Known limits
- Elysia 2 is pinned at `2.0.0-rc.0`; review the release notes before upgrading to the final 2.0 release.
- Speech recognition uses the browser (best in Chrome/Android); Burmese accuracy depends on Google's `my-MM` model — the review step is the safeguard.
- Camera scanning needs HTTPS (Vercel) or localhost.
- Local MongoDB is standalone, so multi-document transactions only run on Atlas; locally writes are ordered and stock changes use atomic conditional updates.
- Local MongoDB has no authentication and only listens on 127.0.0.1.
- With `SEED_DEMO=true` the public demo password is known — turn it off before real data.
- No rate limiting or refresh-token rotation yet.

---

## Design prototype (static HTML)

An interactive Android-first inventory prototype for one warehouse and a five-person team. Scan a product, speak its details, review the receiving list, and save a traceable delivery.

### Try it

Open `index.html` in a modern browser, or serve this directory:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

For the illustrated account-entry screen, append `#signin` to the page URL. Login/Register tabs and validation work; real account access is explicitly unconnected. Use Open demo warehouse to explore without credentials.

No installation or build step is required. QR labels use a locally vendored MIT-licensed encoder; see `assets/vendor/README.md`. On small screens the app fills the viewport; desktop shows a phone preview and workflow notes.

Start with the central **Scan** button. **Type manually** is at the top of the scanner. Choose a sample product to see its barcode and Push to Talk on the same screen. Open [?] for guidance or the sample voice phrase. Recording opens a review immediately: choose Correct — continue or Wrong — record again. The next screen adds a product photo (camera or gallery), supplier and extra details without a location field. Select a supplier or add one with name, contact person, phone, email, social account and address. Then add the item to the receiving list. Add noodles, water and bread, then **Save delivery**. Stock changes only at that final save.

Also try manual registration, Stock In, Stock Out, Count, Supplier orders, alert preferences and History. Setting contains language switching, an offline simulation, a five-member team preview and onboarding. Actual browser offline events also block stock writes.

### Project structure

- `index.html` — application and desktop presentation shell
- `assets/app.js` — screen rendering, interaction, camera/voice adapters and local state
- `assets/styles.css` — responsive components and layout
- `locales/en.json`, `locales/my.json` — English and draft Myanmar strings
- `assets/locales.js` — generated locale bundle for direct file opening
- `design-system/tokens/` — provisional tokens; official Figma exports remain unverified
- `SPEC.md` — PRD reconciliation, screen contracts and implementation roadmap
- `references/INVENTO-PRD-v1.1.*` — current requirements
- `user-flows/Crabbty Crab.png` — original registration/dispatch flow
- `tests/prototype.cjs` — browser interaction checks
- `prototype/screenshots/` — captured home, scanner, voice, desktop and Myanmar views

### Test

Install Playwright in your development environment and its Chromium browser, then run:

```sh
node tests/prototype.cjs
```

The suite also supports a system browser using `CHROMIUM_PATH=/path/to/chromium`. See [test instructions](tests/README.md). Regenerate the locale bundle after editing JSON with `node scripts/build-locales.cjs`.

### Current boundaries

This is a working local UI prototype, not a production Android application. Data stays in browser storage. Browser camera scanning requires `BarcodeDetector` and a secure context; typed/sample codes are always available. Optional browser speech recognition is not the planned cloud voice service. The three sample phrases are explicitly demo inputs. The illustrated Login/Register forms provide local validation but do not send or store credentials; account submission reports the missing backend. The five-person roster is a presentation, not authorization. Supplier status updates do not send messages.

The supplied [Figma file](https://www.figma.com/design/V6w22Z09deAA1CbQCSuJjv/Stock-Management-System?node-id=1206-71) could not be retrieved through this environment's network proxy. Tokens and local SVGs are provisional, not verified Anydesignstyem/Reicon assets. Myanmar strings require completion and native-speaker review.

Existing prototype data is imported from legacy keys when available. The new store is `invento-v3`; legacy keys remain intact. Clear that key in browser developer tools to start with fresh sample data.

Product details has right-aligned Edit product / QR label / Archive chips. Editing changes metadata only; QR labels use the real product code; confirmed archival hides the product from active lists while preserving stock and history.
