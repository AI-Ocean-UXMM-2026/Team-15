# Invento — Product and Engineering Specification

**Status:** Phase 1 decisions confirmed · Draft v1.3 · **Market:** Myanmar · **Platform:** Android-first · **Product category:** Inventory / logistics · **Architecture:** 3 independent repositories + parent orchestration repository

## 1. Sources and decision precedence

- Primary source: `references/Crabbity Crab - PRD v1.pdf` (16 pages). Its original demo name is **Smart Stock**; the product name is **Invento**.
- Flow source: `user-flows/Crabbty Crab.png` (onboarding → manual/scan registration → voice → review → save; ship-out).
- Visual references: six PNG files under `references/`, covering 30 proposed mobile screens plus implementation notes.
- This specification extends the source PRD with the user's later explicit requirements: Android, scan-first optional flow, AI Push to Talk, bilingual English/Burmese, up to five employees, freemium, and three repos.
- **Confirmed 2026-10-20:** Phase 1 supports one owner plus up to four employees (five total active members per warehouse); excludes checkout and sales; uses cloud AI voice with English/Burmese support as a launch acceptance requirement; supports offline read-only cached inventory with online-only mutations. External dispatch remains a recorded Stock Out with destination text, not a synchronized transfer. The original PRD differs on users and checkout; these newer decisions take precedence. The original five-day demo estimate is not a production release commitment.

## 2. Product goal and audience

Invento helps Myanmar warehouse operators handling 200+ SKUs know current stock, record receipts and dispatches, reconcile physical counts, and act on low-stock, out-of-stock, and optional batch-expiry alerts. Mobile workflows must remain usable for people of different ages and technical familiarity. One account owns one warehouse in Phase 1; team size is up to five active members. Core promise: **Know what you have, what is changing, and what needs attention.**

## 3. Functional requirements

### 3.1 Authentication and warehouse setup
- Email/password or phone-based login (method TBD); JWT access + rotating refresh tokens, server-side revocation, rate limiting; secure password hashing.
- Create one warehouse, name/location, preferred language, time zone `Asia/Yangon`; warehouse-scoped authorization on every API query.
- Phase 1 roles: Owner (warehouse settings, invite/deactivate employees, all inventory operations, audit) and Operator (products, receiving, dispatch, counting, alerts and history; no member or plan administration). One owner plus at most four active employees per warehouse, enforced atomically on invitation acceptance and reactivation. Invitations, member list, revocation, actor attribution and permission checks are required. No access across warehouse boundaries.

### 3.2 Products and identification
- Create/edit/archive, browse, search by name/SKU/barcode, category, photo, description, unit, optional FDA code, supplier and low-stock threshold.
- Optional barcode/QR camera scan with permission handling; manual SKU entry is always available. Unknown barcode retains detected value and opens new product registration.
- Prevent duplicate SKU/barcode within warehouse; allow products with no barcode.
- Register initial stock with a separate auditable OPENING movement (or register with zero and receive later); never silently modify stock.
- Unit per product for MVP; conversions and variants deferred unless confirmed.

### 3.3 AI-assisted Push to Talk
1. Choose Add Product → Scan or Type → capture barcode if available.
2. Push and hold (or accessible tap-to-record alternative) → explicit recording indicator, stop/cancel, and permission prompt.
3. Audio → speech recognition → constrained extraction of product name, description, quantity, unit and optional metadata; detect/choose `en` or `my`.
4. Render editable fields with source transcript, uncertain-field flags and clear error messages. Do not invent missing fields; ask user to fill them.
5. Review → **Edit manually**, **Record again** (preserve prior fields), or **Confirm**.
6. Confirmation creates product and, if requested, an explicit opening-stock transaction; success offers Scan Another or Inventory.
- AI never commits stock automatically. Validate quantities and product identity on server. AI provider is replaceable via adapter. Secrets remain API-side; audio retention opt-in/short-lived; no audio in logs. Handle poor connectivity, accent variance, Burmese numerals, mixed Burmese/English, background noise, denied mic permission, timeout and transcription failure.
- Cloud speech recognition and structured extraction are required; Burmese and English, including mixed-language utterances, must pass a representative field-test corpus before release. Provider selection, pricing, data processing region, consent wording, and latency targets remain to be finalized. Voice requires internet; manual typing remains available offline only for unsaved local drafts, never a queued stock mutation.

### 3.4 Stock In
- Find/scan product → enter positive quantity, supplier, batch/lot, optional expiry, reference and note → review before/after → confirm → receipt.
- Inventory update, batch update and immutable movement/audit entry must commit atomically.

### 3.5 Stock Out / dispatch
- Find/scan product → quantity → movement reason (transfer to external warehouse, damage, loss, expired, other) → destination/reference → review → confirm.
- Reject zero/negative quantities and stock-out exceeding available quantity. Phase 1 external destinations are free-text and do not create stock in another warehouse.

### 3.6 Physical count and reconciliation
- Select product → record physical quantity → show system quantity and variance → require reason for nonzero variance; optional photo → review → confirm.
- Confirmed adjustment sets stock to counted amount and preserves previous, counted, delta, reason, actor, timestamp and evidence reference.
- If quantity changes during review, require refresh/reconfirmation; never overwrite concurrent changes silently.

### 3.7 Checkout excluded from Phase 1
- No checkout, sales cart, sale completion, payment processing, invoice or POS screens/endpoints/models in Phase 1. All goods leaving inventory are recorded as Stock Out with a clear reason and audit trail. Reconsider checkout only through a future approved scope change.

### 3.8 Alerts, history and audit
- Dashboard totals, attention cards, stock status, quick actions, latest activity.
- Low stock at configured threshold; out-of-stock at zero; optional expiring batches (threshold configurable). Show actionable alerts and filters.
- Immutable movement timeline: opening, in, out, sale, adjustment; before/after, actor, reference, notes, date, product, batch if applicable. Pagination and filters.
- No predictive stockout promise in MVP: alerts are threshold/expiry rules, not forecasting.

### 3.9 Freemium
- Entitlement model in API, with free-tier defaults configurable; premium feature flags without hard-coded marketing claims. Pricing, limits, billing provider and enforcement are open decisions.

## 4. UX and visual direction

- Professional operational UI, calm neutral surfaces, navy text, restrained blue actions, semantic amber/red/green feedback; avoid decorative gradients and clutter. Use attached screens as layout inspiration, not as final design tokens.
- **Anydesignstyem** is authoritative for colors, typography and components once source assets are provided. **Reicon** is authoritative for icons once supplied. Current files in `design-system/` and `icons/` are placeholders, not verified library exports.
- Android: bottom navigation Home / Inventory / Scan / Alerts / History; primary actions prominent; no checkout navigation in Phase 1.
- Screens: onboarding/login, home, inventory, product detail, manual add, scan, unknown code, voice record/transcript, review, save success, receive, dispatch, physical count, adjustment reason, alerts, history, receipt, settings, error/empty/offline states.
- All destructive or stock-changing operations show a before/after review and a clear outcome; no optimistic final-stock display before server confirmation.
- 48dp minimum tap targets, semantic labels, focus order, text scaling, color contrast >=4.5:1 for normal text, screen-reader announcements, reduced-motion support; flexible card heights and text wrapping.
- Locale typography is selected by language. Burmese uses a Myanmar-capable font, normal letter spacing, `line-height: normal` or a separately tuned generous line height; do not reuse English fixed line heights. See `.agents/skills/invento-i18n/SKILL.md`.

## 5. Technical architecture

| Repository | Technology | Responsibility |
|---|---|---|
| `invento-app` | React + TypeScript + Vite, React Router, TanStack Query, shadcn/ui preset `beEhfqy2` | Admin/owner web interface and later expanded Phase 2 web capabilities; Phase 1 may be a functional management console |
| `invento-api` | Node.js + TypeScript + Express, SQLite, Prisma ORM **7**, JWT | Authentication, warehouse isolation, product catalog, movements, audit, alerts, AI voice orchestration, seeded demo data |
| `invento-mobile` | React Native + TypeScript + Expo | Android-first operator experience, camera, microphone, inventory operations |
| `invento` parent | Docs + Git submodules | SPEC, local skills, references, cross-project orchestration |

**Important:** The uploaded reference board suggests Next.js; user-selected React + React Router takes precedence. Prisma 7 adapter/driver and migrations must be implemented using Prisma 7 conventions and tested against the pinned runtime. SQLite is acceptable for a pilot with careful write serialization, transactions and backups; reassess for higher concurrency or multi-tenant scale.

### 5.1 API design (proposal)
- `/v1/auth/register`, `/login`, `/refresh`, `/logout`, `/me`
- `/v1/warehouses`, `/v1/members`, `/v1/members/invitations` (five-member cap enforced server-side)
- `/v1/products`, `/v1/products/:id`, `/v1/products/lookup?code=`
- `/v1/stock/in`, `/v1/stock/out`, `/v1/stock/counts`, `/v1/stock/counts/:id/confirm`
- `/v1/movements`, `/v1/alerts`, `/v1/batches`
- `/v1/voice/transcribe`, `/v1/voice/extract` (or combined endpoint), `/v1/entitlements`
- Consistent typed request/response contracts; Zod validation; pagination; request IDs; idempotency keys on writes; RFC-style error codes; OpenAPI documentation.

### 5.2 Data model
- `User`, `Warehouse`, `Membership`, `Session`, `Product`, `Category`, `Supplier`, `Batch`, `StockBalance`, `StockMovement`, `PhysicalCount`, `CountItem`, `Invitation`, `Alert`, `AuditEvent`, `VoiceDraft`, `Entitlement`.
- All tenant-owned rows carry warehouse ID; uniqueness on `(warehouseId, sku)` and non-null `(warehouseId, barcode)`; integer quantity for single-unit MVP; server UTC timestamps, client locale rendering.
- Every stock write runs in a database transaction and creates exactly one corresponding immutable movement per product change. Include before/after and actor. Use idempotency keys and guarded updates to prevent double submits/negative stock. Count confirmation checks stock version.
- Seed **at least 300 realistic sample products** across Myanmar-relevant categories, 1 demo warehouse, demo users, suppliers, receipts, dispatches, counts, expiry batches, alerts, and history; deterministic seed with no real personal data. Do not seed insecure demo credentials into production.

### 5.3 Security and reliability
- Password hashes using Argon2id or vetted equivalent, short-lived JWT access tokens, refresh rotation, secure mobile token storage, TLS, CORS allowlist, input/file validation, rate limits, secrets in environment, redacted logs.
- Permission-scoped camera/mic, explicit privacy disclosure, minimal audio retention. Backups and restore test, monitoring, error tracking, migration safety, CI lint/typecheck/tests.
- Offline policy is **read-only**: persist a bounded, encrypted-at-rest where supported, per-account/per-warehouse cache of last successfully synced product list, balances and recent history; show last-sync timestamp and prominent stale-data banner. Disable all mutations (including stock in/out/count confirmation, invitations and AI requests) while offline; do not queue or replay writes. On reconnect, revalidate session and refresh authoritative server state. Clear cache on logout, account switch or warehouse removal. Do not cache audio or secrets.

## 6. i18n acceptance criteria
- User preference `en` / `my`, persisted per account/device; no hardcoded user-facing strings.
- Burmese typography and English typography use different tokens; no custom `letter-spacing` for Burmese.
- Mixed-script terms (SKU, QR, Barcode, Stock In/Out, AI, FDA, Batch, Login, etc.) are retained in English when clearer; maintain reviewed glossary.
- Burmese Unicode input and rendering, dynamic text height, date/number/quantity formatting, plural/context-aware copy, accessibility labels, screenshots and regression tests at 200% font scale.
- Voice transcript remains in original language; extracted structured fields preserve brand and SKU spelling.

## 7. Release and QA gates
- Product CRUD, unknown-code fallback, AI voice failure/retry, stock in/out, employee invitations and permissions, physical reconciliation, alerts and history have end-to-end tests.
- Concurrent dispatches never produce negative stock; duplicate requests never double-book; audit records match balances.
- Test Burmese on real Android devices at 360–430dp widths, enlarged text, screen readers, slow network and camera/mic permission failures.
- API: unit/integration/security tests; mobile: interaction/e2e tests; web: route/form/e2e tests; all repos independently build and deploy.
- Publish repos only after confirming licenses, secrets scanning and approvals; parent repository references fixed submodule commits.

## 8. Roadmap
- **Phase 1:** Single warehouse, product management, barcode/manual input, AI voice-assisted registration, Stock In/Out, count/reconcile, alerts/history, English/Burmese, five-member team access, cloud AI voice, offline read-only cache, freemium foundation. Checkout excluded.
- **Phase 2:** Multi-warehouse management and expanded web app, advanced roles, internal transfer reconciliation, sync enhancements.
- **Phase 3:** Payment integration and/or invoice management; scope and regulatory/payment provider selection TBD.

## 9. Remaining implementation decisions
1. Confirm authentication channel: email/password plus emailed invitations (recommended) or phone/OTP; select email/SMS delivery provider.
2. Select cloud speech/transcription provider after Burmese and English field evaluation; agree on consent, retention, latency and spending limits.
3. Define free-tier quotas and paid-tier entitlements; billing is not part of Phase 1.
4. Confirm license (MIT proposed), public visibility of all four repositories, and GitHub account/organization. Do not publish without authorization.
5. Supply or confirm Anydesignstyem and Reicon exports/Figma references; placeholders must not be represented as official assets.
6. Confirm deployment hosting, backup target, and Android distribution route (internal test vs Play Store).
7. Confirm schedule and staffing; the source PDF's five-day MVP target is not assumed achievable for a production release.

## 9.1 Execution milestones and exit gates
| Milestone | Deliverables | Exit gate |
|---|---|---|
| M0 — Contracts | OpenAPI draft, domain glossary, UI tokens, role permission matrix, CI templates | Team reviews API contracts and screen inventory |
| M1 — API foundation | Prisma 7 migrations, JWT sessions, memberships/invitations, 300+ seeded products, tests | Cross-warehouse access denied; five-member limit enforced |
| M2 — Stock engine | Atomic opening/in/out/count movements, idempotency, optimistic concurrency, audit, alerts | Parallel dispatch and count tests preserve correct nonnegative stock |
| M3 — Mobile core | Auth, home, catalog, manual/scan, receiving, dispatch, count, alerts/history | Real Android device workflow and accessibility checks pass |
| M4 — AI and offline | Cloud Push to Talk, transcript review, locale-aware forms, read-only cache | Burmese/English voice evaluation and offline no-write tests pass |
| M5 — Web and release | React admin UI, documentation, smoke/e2e tests, backup/restore, release build | Security, localization, crash, and reproducible-build gates pass |

## 9.2 API and role acceptance scenarios
- Owner invites four operators; attempting a fifth active operator is rejected. A revoked operator cannot refresh or write; every movement stores actor identity.
- Operator cannot invite users, change entitlements or edit warehouse ownership; an owner can inspect all warehouse movements.
- When offline, users can inspect cached stock with its last-sync timestamp but cannot confirm any inventory operation; reconnect refreshes data before allowing writes.
- AI output never writes product or stock until a user explicitly confirms the editable review screen; unsupported/ambiguous Burmese quantities require correction.
- No sale, checkout, payment or invoice route appears in Phase 1 navigation or API.

## 10. Definition of done
A release is not production-ready merely because screens look complete: it must satisfy audited stock correctness, language QA, security checks, deterministic seeded demos, documented API contracts, tested mobile camera/mic paths, and independently reproducible builds.


## 9. Prototype redesign — corporate v2

- Browser prototype: `prototype/index.html` (interactive, locally persisted demo only). The design uses a restrained forest-green operational accent, warm gray surfaces, clearer data hierarchy, accessible focus states, and a desktop presentation frame around the Android-sized experience.
- Preserves the Crabbty Crab registration and dispatch flow; includes stock receipts, physical counts, alerts and history.
- Product design rules: action-first dashboard; clear stock quantities and statuses; review before every inventory mutation; accessible manual entry alongside scanning/voice; responsive touch targets and no checkout.
- English and Burmese are selected independently; Burmese avoids custom tracking and fixed text heights. Production translations still require native-speaker QA.
- **Prototype limitations:** scanner is simulated; browser speech recognition is not the required production cloud AI voice service; storage is browser localStorage rather than authenticated API persistence. Prototype is not an APK and does not demonstrate production offline cache/security or five-member authorization.
- Anydesignstyem and Reicon official assets were not supplied; current tokens/icons are provisional and must be replaced by licensed official assets before production sign-off.

### Next implementation sequence
1. Confirm source design tokens/icons, primary auth identifier (email vs phone), voice provider and hosting/privacy constraints.
2. Scaffold `invento-api` with Prisma 7 + SQLite, seed >=300 SKUs, enforce warehouse-scoped roles and five-member cap. Implement idempotent stock transactions and immutable movement history first.
3. Scaffold `invento-mobile` Expo screens from prototype, including camera permission, barcode scan, native mic controls, Burmese text metrics and offline read-only cache.
4. Implement secure cloud speech transcription/extraction via API; editable review is mandatory before stock mutation.
5. Scaffold `invento-app` management interface with React Router, TanStack Query and shadcn preset `beEhfqy2`; no checkout.
6. Run acceptance tests: concurrent stock out, duplicate barcode, physical-count conflict, role isolation, voice failure, Burmese mixed-script, large-font layouts, reconnect behavior.
7. Publish independent child repos with README/license, then parent repo using Git submodules after explicit GitHub authorization.

## 14. Reference screen integration — six uploaded UI boards (2026-10-20)

The six user-supplied boards are **screen-level design references**, not proof of implemented behavior. Adopt their information architecture, review-before-commit pattern, error states, and audit clarity while retaining Invento's Phase 1 decisions. Source boards are stored under `references/ui-flow-boards/`.

| Board | Screens to incorporate | Flow / acceptance requirement |
|---|---|---|
| 01 Know your stock | 01.1 Home overview; 01.2 Inventory; 01.3 Product details; 01.4 Add product; 01.5 Product saved | Home → Inventory → product details or add → save → inventory/scan another. Add a **Scan → Push to Talk → transcript/edit → review → confirm** branch from registration, required by the original Invento flow but not depicted in this board. |
| 02 Receive stock | 02.1 Scan product; 02.2 Product found; 02.3 Stock in; 02.4 Review stock in; 02.5 Receipt saved | Camera/typed SKU → identity confirmation → positive quantity, supplier, optional batch/expiry → before/after review → atomic commit → receipt/scan next. |
| 03 Send stock | 03.1 Choose product; 03.2 Stock out; 03.3 Review stock out; 03.4 Dispatch saved; 03.5 Check quantity | Search/scan → quantity, reason, optional external destination/reference → review → commit. Insufficient stock blocks submission and leaves quantity unchanged. |
| 04 Count, compare, reconcile | 04.1 Physical count; 04.2 Count product; 04.3 Explain difference; 04.4 Review adjustment; 04.5 Count saved | Select → enter physical quantity → show delta → mandatory reason for mismatch, optional evidence → review → atomic adjustment and immutable audit. |
| 05 Act early, trace every change | 05.1 Alerts; 05.2 Low-stock alert; 05.3 Expiring batches; 05.4 History; 05.5 Receipt details | Low/out/expiry states → relevant product/receipt → Stock In, Stock Out or Count; filter history and inspect actor, before/after, source reference. |
| 06 Supporting states | 06.1 Enter SKU; 06.2 New barcode; 06.3 Out-of-stock alert; 06.4 Adjustment audit; 06.5 My warehouse | Manual fallback, unknown code registration, zero-stock block, linked audit evidence, owner-only warehouse settings; add team management, offline cache banner, permission errors and voice failure states. |

### 14.1 Flow constraints and deviations

- **Phase 1 has five users** (one owner and four operators), not the board's “one operator” assumption. Surface member management under warehouse settings, including invite, active-member limit and attribution.
- **Phase 1 has one warehouse only.** A dispatch to another warehouse is an outbound movement with destination text, not a transfer that modifies another warehouse's inventory.
- **Checkout remains excluded.** No sale/checkout screens should be inferred from board examples.
- **Cloud voice is a first-class registration path.** The boards omit it; insert mic permission, recording, processing, editable transcript, review/correction loop and save. Recording requires connectivity; manual entry remains the fallback.
- **Offline means read-only cached data.** Clearly label last-synced time and disable receiving, dispatch, adjustment, product saving, and cloud voice when disconnected. Do not queue writes.
- **Expiry is per batch**, where enabled; product-level summary can show earliest upcoming batch. Avoid suggesting that a single expiry date represents all stock.
- The board's blue palette and sample identity “SMS” are reference-only; use **Invento** naming and approved design tokens. Do not hard-code sample dates, stock values, or staff identities in production screens.

### 14.2 Prototype route/state checklist

Implement navigation for `/home`, `/inventory`, `/products/:id`, `/products/new`, `/scan`, `/products/voice`, `/products/review`, `/products/saved`, `/stock-in/select`, `/stock-in/edit`, `/stock-in/review`, `/stock-in/saved`, `/stock-out/select`, `/stock-out/edit`, `/stock-out/review`, `/stock-out/saved`, `/counts`, `/counts/:productId`, `/counts/reason`, `/counts/review`, `/counts/saved`, `/alerts`, `/alerts/:id`, `/history`, `/history/:id`, `/warehouse`, `/warehouse/members`. Route names are conceptual; Expo Router or React Navigation mapping is an implementation decision.

For every stock-changing route: loading, empty, offline, permission denied, invalid input, concurrent update, request retry, and success states. Review must display quantities with unit and current server version. Success must link to the saved audit record. Ensure back navigation preserves unsaved form data without accidentally committing.

### 14.3 Design and acceptance priorities

1. Build the Home/Inventory/Product/Scan shell from board 01, with accessible EN/MY typography and 48dp controls.
2. Deliver the complete manual + scan + cloud voice product registration loop, including correction and unknown-code fallback.
3. Deliver Stock In and Stock Out using boards 02–03, with atomic API transactions and idempotency keys.
4. Deliver physical counting and reasoned reconciliation using board 04, with concurrency protection.
5. Deliver alerts, history, audit details and support states from boards 05–06.
6. Validate five-member permissions, offline read-only behavior, Burmese wrapping, Android screen reader and small-screen layouts before calling the prototype production-ready.


## 10. Interactive UI prototype handoff (v1.3)

- **Runnable prototype:** `prototype/index.html`. Open in a desktop browser or Android browser; narrow viewports use a full-screen phone layout. No build command is required.
- **Interactive paths:** Home → Inventory → Product details; Add product → Manual entry → Review → Save; Add product → Scan (simulated code) → Push to Talk (browser-dependent) → Review → Retry voice/Edit → Save → Add another; Stock In and Stock Out → Choose product → Quantity → Review → Confirm; Physical count → Reason → Review → Save; Alerts and History.
- **Offline read-only demonstration:** Toggle *Simulate offline* in the preview sidebar. Inventory browsing remains available from locally cached demo state, while product registration, stock changes, physical count and voice recording are blocked. In production, this behavior requires real connectivity detection and encrypted/local cache policy.
- **Integration boundaries:** Browser storage is for demonstration only. The camera scanner is a simulated scan; microphone recognition uses browser speech recognition where available and a demo phrase otherwise. Cloud AI voice, authenticated team permissions, real barcode camera decoding, server-side atomic inventory mutations, and device synchronization require the API and Expo implementations. Do not represent these as completed production integrations.
- **Source precedence:** The 16-page Crabbity Crab PRD specifies one operator and checkout (pp. 2, 5, 8, 11); the owner's later confirmed decisions supersede these with a five-person warehouse team and no checkout. Its core accuracy requirements—physical count separate from dispatch, immutable movement history and alerts—remain mandatory. The original flow diagram is authoritative for the registration correction loop and simple dispatch path. The six reference boards define visual and supporting UX states; where they differ, the confirmed scope and original flow take priority.

## 11. Recommended next implementation increments

1. **Contracts and design tokens:** Translate reference-board typography, spacing and component patterns into Expo components. Map Ant Design/Reicon-inspired icons to licensed assets; verify licensing before shipping. Define English and Myanmar typography independently; never apply custom letter spacing to Burmese.
2. **API foundation:** Express, SQLite and Prisma 7 schema/migrations; JWT refresh flow; warehouse-scoped permissions for one owner plus four operators; seeded products, batches and movement history; idempotent, transactional inventory writes.
3. **Expo core:** Authentication, warehouse setup, five-tab navigation, search, product detail, manual registration and barcode/QR scanning with manual fallback.
4. **Cloud voice:** Secure recording upload, server transcription and structured extraction for English/Burmese, explicit user confirmation, retry and edit, timeout/consent/cost controls; never persist an unconfirmed transcript as inventory.
5. **Stock accuracy:** Stock In/Out review screens, nonnegative quantity validation, cycle counts, discrepancy reasons, movement receipts, alerts and history.
6. **Offline and QA:** Cached read-only screens and clear offline banner, no queued mutations, accessibility and Burmese font testing, concurrent-stock tests, Android hardware camera/microphone testing, and 5-user authorization tests.
