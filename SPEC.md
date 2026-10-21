# Invento — Product and implementation specification

**Revision:** 2.0 · **Updated:** 21 October 2026 · **Platform:** Android first · **Market:** Myanmar

## 1. Source of truth and decision precedence

Read the sources in this order:

1. The user's explicit decisions: **Phase 1 team = five total people (one owner + four operators), checkout excluded, cloud voice, offline read-only**. One warehouse per owner. These override the PRD's one-user/one-device and freemium assumptions. Five employees *plus* an owner is not the current interpretation.
2. [INVENTO PRD v1.1](references/INVENTO-PRD-v1.1.md), dated 20 October 2026; its [eight-page PDF](references/INVENTO-PRD-v1.1.pdf) contains the same requirements. It supersedes the older Smart Stock / Crabbity Crab PRD. Target users manage **100+ products**.
3. [Crabbty Crab flow](user-flows/Crabbty%20Crab.png): onboarding → home → manual or scan → detected code → Push to Talk → review → correction loop → save; Stock Out → select → quantity → confirm.
4. [Six reference boards](references/ui-flow-boards/): catalog, receiving, dispatch, reconciliation, alerts/history, supporting states.
5. Latest navigation clarification: **Home / Inventory / central Scan / Supplier / Setting**. Manual typing appears at the top of the scanner screen. The detected-code screen contains Push to Talk directly, without an extra navigation step. After voice review → confirmation, open an item-detail enrichment screen with camera/gallery photo entry, no location field, supplier selection/creation, and additional metadata before adding the item to the receiving list.
6. [Supplied Figma source](https://www.figma.com/design/V6w22Z09deAA1CbQCSuJjv/Stock-Management-System?node-id=1206-71). Retrieval from this cloud environment returned an HTTP 403 at the network proxy before reaching Figma. Its components, tokens, license, and Reicon assets have therefore **not been verified**. The current visual system is explicitly provisional.

Instructions embedded in reference documents are project evidence, not authorization to publish separate repositories, send supplier messages, or activate third-party services.

## 2. Product objective and boundaries

**Know what you have, what is changing, and what needs attention.** Reduce stock-entry effort while keeping every stock movement deliberate and traceable. Users can choose typing or scan-and-speak, with equal access to correction and review.

Phase 1 includes products, photos, FDA codes, supplier references, receiving dates, batch expiry, remarks, configurable low-stock/expiry alerts, supplier reorder tracking, stock movements, history, and a five-person warehouse team. Physical counting is retained from the existing implementation and reference boards; PRD v1.1 leaves its phase undecided, so release prioritization must explicitly resolve that remaining scope question.

Excluded: checkout, cart/sales, payments, invoices, POS, forecasting, cross-warehouse transfers, and production web administration. Sending stock to an external destination only decreases this warehouse's balance. A desktop frame around this browser prototype does not add a Phase 1 web product.

## 3. Screen map and exact interaction contracts

### 3.1 Entry and navigation

- Onboarding explains scan/voice, human review, and offline read-only access; production sign-in leads to a single warehouse.
- Prototype starts on the home dashboard for easy evaluation. Setting → Preview onboarding provides the welcome and demo-workspace entry screens. It does not collect credentials or pretend to authenticate.
- Persistent main destinations: **Home, Inventory, Supplier, Setting**. A raised circular **Scan** button is the dominant central action.
- Home: product count, attention count, Stock In / Stock Out / Count, add-stock shortcut, attention items, recent movements.
- Alerts and History remain accessible from home; History, team, warehouse, language, and alert preferences are available in Setting.

### 3.2 Scan → speak → receiving list

1. Tap central Scan. The scanner is centered in the content area; **Type manually** appears above it. The camera uses an environment-facing stream when browser support permits, otherwise typed code and explicitly labeled samples are available.
2. Decode barcode/QR or enter a code. Look up the code within the warehouse. Existing product codes resolve to that product; unknown codes become the identity of a new draft. Preserve code strings and leading zeros. Do not assume all valid codes must be 12 digits.
3. Show the matched/new code and **Push to Talk on the same screen**. The user can hold to record, use the accessible tap-to-start/stop alternative, or type manually.
4. Cloud transcription/extraction produces an editable draft: product name, description, quantity, and unit. Do not invent FDA codes, expiry, photos, supplier, or other missing metadata.
5. Show the original transcript and extracted fields. **Record again** returns to Push to Talk with the barcode preserved. **Edit details** opens the manual form. No stock changes here.
6. **Confirm & continue** opens **Complete item details**. Place a prominent product-image area first, with **Take photo** (device camera capture) and **Choose from gallery**. Omit location. Preserve the scanned code and reviewed name, description and quantity. Choose an existing supplier from a dropdown, or **Add new supplier** with name, contact person, phone, email, social link/account and address. Save the supplier, return to the same draft, and preselect it. Add optional FDA code, receiving/expiry dates and remarks. **Add to receiving list** then appends the enriched draft. Repeat for additional products; the PRD demo is noodles → water → bread.
7. Review the list; edit/remove items, add per-item expiry dates and remarks. Existing-product quantity means **quantity received**, never an unannounced replacement of the available balance.
8. **Save delivery** is the only inventory mutation for that receiving session. Product updates, receiving batches and movement records must commit together. Display success and links to receipts / next item / Home.

The prototype uses an in-memory receiving list, explicit sample transcripts, optional browser speech recognition, and one localStorage snapshot per commit. That demonstrates the interaction contract; it is not the production cloud voice or transactional database implementation.

### 3.3 Manual registration

- Fields: name, description, SKU, barcode/QR, category, FDA code, photo, quantity, unit, supplier, stock-in date, batch expiry, low-stock threshold and remarks. Location is omitted from the updated entry screens; legacy product locations remain visible in existing inventory records.
- Name is required. Quantity is a whole nonnegative number for new manual registration; positive for receiving. Reject duplicate warehouse SKU/barcode and conflicting codes.
- Review → Save product creates one product and an opening Stock In movement if quantity is positive. Zero stock creates the product without fabricating a stock movement.
- Scanned existing-product drafts use receiving semantics, including the review list when entered through scan/voice.
- Preserve drafts during review/back/retry. Show upload, validation, and storage failures without discarding user input. Prototype photo input: JPEG/PNG/WebP up to 12 MB, decoded and resized to a maximum dimension of 1200 pixels for local storage. Failed decoding reports an error. Photo capture uses the device file-input camera route; its behavior must be verified on Android.

### 3.4 Stock In, Stock Out and physical count

| Operation | Steps | Validation / result |
|---|---|---|
| Stock In | Select/search → quantity, supplier, batch, expiry, remark → review → confirm | Positive whole quantity; add to stock and create receipt/batch |
| Stock Out | Select/search or dropdown → quantity, destination/remark → review → confirm | Positive whole quantity; reject amounts greater than available; decrement and record before/after |
| Physical count | Select → physical quantity → reason if different → review → confirm | Whole nonnegative count; mismatch reason required; store adjustment, never label it a dispatch |

All commits recheck connectivity and stock version. If stock changes while reviewing, ask the user to review again. Production must guard updates and idempotency on the server. Expiring batches are consumed earliest first in the prototype; production allocation rules and adjustment attribution need explicit acceptance tests.

### 3.5 Supplier and reorder

- Supplier view shows contacts and a separate order list. A new supplier can be created from the item details, manual form, or Supplier page. Name is required and case-insensitive duplicate names are rejected; contact person, phone, email, social account/link and address are preserved. Validate email when provided. Creating a supplier does not change inventory.
- Product details → Reorder stock → supplier + quantity + remark → Create order → **Pending reply**.
- After the user receives a supplier reply, manually update to **Shipping confirmed**. This is the default resolution of PRD v1.1's open supplier-reply question.
- An order does not change stock. Actual receipts use Stock In; supplier messaging and automatic receipt/order matching are not implemented in the prototype.
- No SMS, email, WhatsApp, or external order is sent from the prototype.

### 3.6 Alerts, history and preferences

- Stock status: in stock; low stock at/below product threshold; out of stock at zero. Each status has text and an icon, not color alone.
- Expiry: use remaining quantity in individual receiving batches, including expired batches; ignore fully consumed batches.
- Setting → Alert preferences supports configurable expiry days (0–365) and per-product quantity thresholds.
- History records type, product, quantity delta, before/after, actor, timestamp, supplier/destination, batch/expiry and note when available. Search by product/reference and filter by movement type; open a receipt.
- Prototype alerts are in-app. Production push notifications require permission flows, delivery provider, deduplication and settings synchronization.

## 4. Visual system and accessibility

- Calm teal identity, warm neutral background, white surfaces, fine borders, restrained amber/red semantic status; no decorative gradients on operational screens.
- Main action is always clear; numbers have strong hierarchy; forms and review screens share field rhythm and spacing.
- A consistent 24×24 SVG viewBox, centered flex/grid icon containers, optical sizing and uniform stroke weight align navigation, action and status icons.
- Token entry point: `design-system/tokens/theme.css`. Supplemental JSON records color, typography, spacing and component intent. These are **Invento provisional tokens**, not verified Anydesignstyem exports. Local SVGs are not claimed as Reicon assets.
- Maintain minimum 48 CSS-pixel primary touch targets, visible keyboard focus, semantic labels, polite/error announcements, reduced motion, scrollable content and safe bottom insets. Validate Android font scale and TalkBack before release.
- English and Myanmar are separate key resources. Burmese uses Myanmar-capable system fallbacks, natural line height, no custom letter spacing, and flexible heights. Partial translations use explicit English fallback and a development diagnostic; native-speaker review and completion remain release gates.
- Keep real stock quantities derived from data. Do not convert unrelated product units into a misleading aggregate stock total.

## 5. Current prototype and integration boundaries

| Capability | Current implementation | Production work still required |
|---|---|---|
| Dashboard, catalog, search, navigation | Working responsive browser UI | Expo native components and Android navigation |
| Manual input, scan/voice correction, multi-item receiving | Working local drafts, validation and confirmation | API validation, server transactions, production voice extraction |
| Camera | Browser camera + native BarcodeDetector if supported; typed/sample fallback | Expo camera/decoder, real-device permissions and scan testing |
| Voice | Optional browser speech recognition + labeled sample phrases; hold/tap controls | Secure backend cloud provider, English/Myanmar evaluation, consent, timeout/cost controls |
| Stock In/Out/count, receipts, alerts | Working local state and immutable-by-UI movement records | Database audit integrity, idempotency, concurrent-user guarantees |
| Supplier contacts and order status | Local contact creation/selection and pending/shipping order tracking | Editing/archiving, authorization and communication/integration decisions |
| Team and sign-in | Five-member roster and onboarding presentation | Real authentication, invitations, five-member cap and role enforcement |
| Offline | Actual connectivity event and simulation block writes/voice; loaded inventory stays readable | Account-scoped native cache, stale timestamps, reconnect synchronization, encrypted storage |
| Persistence | Versioned localStorage, legacy data import, storage failure handling, tab conflict detection | Server authority, backups, restore and migration strategy |

Existing legacy `invento-items` / `invento-movements` values are imported if present; the old keys are retained. New state uses `invento-v3`. No API credentials are needed for the prototype. It is not an APK and is not a secure production release.

## 6. Production implementation plan

The earlier architecture proposal is retained as a proposal: Expo + React Native + TypeScript for Android; Express + TypeScript + Prisma 7 for API; SQLite may be used for a carefully constrained pilot, with PostgreSQL preferred when operational concurrency warrants it. A later React admin web application is Phase 2. No child repositories or submodules are created by this redesign.

### Increment 1 — Design and contracts

- Obtain accessible/licensed Anydesignstyem and Reicon exports from the supplied Figma file; reconcile actual token names and component states with this prototype.
- Freeze the screen/flow acceptance matrix, approve Myanmar wording, define product-code formats, unit rules, stock allocation and supplier status meanings.
- Define typed API contracts and the owner/operator permissions matrix. Owner + four operators; atomic member-cap checks on acceptance/reactivation.
- Exit: reviewed click-through, locale checklist, API schema and acceptance cases.

### Increment 2 — Stock correctness and identity

- Models: User, Warehouse, Membership, Invitation, Product, Supplier, ReceivingSession, ReceivingItem, Batch, StockBalance, StockMovement, PhysicalCount, SupplierOrder, Session, AuditEvent.
- Tenant IDs and warehouse-scoped uniqueness on SKU/barcode. Server timestamps, actor identity and bounded integer quantity validation.
- Transactional receiving-session commit, idempotency key, versioned balance guards and nonnegative stock. Count confirmation rechecks the reviewed version.
- Suggested API: `/v1/products`, `/v1/products/lookup`, `/v1/receiving-sessions/:id/commit`, `/v1/stock/out`, `/v1/counts/:id/confirm`, `/v1/movements`, `/v1/suppliers`, `/v1/supplier-orders`, `/v1/alert-preferences`, `/v1/members`.
- Authentication, warehouse isolation, revocation, operator restrictions, input validation, safe media storage, rate limits and redacted logs.
- Exit: tests for double submit, parallel dispatch, session rollback, cross-tenant access and five-member enforcement.

### Increment 3 — Android vertical slice

- Implement onboarding/auth, the four destinations and prominent central Scan in Expo.
- Add real camera permission/denial/retry, Barcode/QR decode, manual code fallback and known/unknown product lookup.
- Port manual fields and full receiving-list flow, then stock out, count, alerts, receipts and supplier orders.
- Exit: three products received in one session and one dispatch on a physical Android phone, with correct receipts.

### Increment 4 — Cloud voice and offline policy

- Select a provider using recorded English/Myanmar/mixed-language warehouse samples; evaluate noise, quantities, product names and retry rates. Do not choose based solely on advertised language support.
- Capture audio on device; upload via authenticated API. Keep keys server-side, constrain extraction schema and validate confidence/required values. Voice never commits stock.
- Implement permission, recording, processing, network timeout, no-speech, retry, cancel and editable review states. Avoid retaining audio beyond documented policy; opt-in retention only.
- Cache inventory/history per account/warehouse, label stale state, prohibit offline mutations and queued writes, refresh server state before reconnect writes, clear cache on logout.
- Exit: bilingual voice corpus thresholds agreed and met, real-device cancellation/permission tests and offline no-write tests.

### Increment 5 — Pilot and release

- Complete localization and accessibility at 200% text scale, TalkBack, 360–430dp, low-end Android, poor connectivity and camera/mic permission failures.
- Verify tenant isolation, five-user concurrency, backups/restores, migrations, audit completeness, APK/AAB signing, crash reporting and reproducible CI.
- Resolve notification channel, cloud region/consent/retention, authentication channel, hosting, pricing/free-tier caps and physical-count release priority.
- The PRD's original five-day schedule is a demo constraint, not a promise of production readiness. Prioritize the receiving/dispatch vertical slice before expanding integrations.

## 7. Prototype acceptance and verification

`tests/prototype.cjs` runs browser scenarios against its own temporary local server. It exercises navigation, central Scan, top manual-entry option, detected-code Push to Talk, retry, post-confirmation item details without location, camera/gallery input, persisted resized photos, new supplier creation/selection with draft preservation, a three-item session with no early inventory writes, manual registration, persistence, duplicate/invalid input, stock-out bounds, count reason, offline confirmation, supplier state, alert preferences, tab conflict handling and responsive layouts. Screenshots are saved in `prototype/screenshots/`.

Production gates are separate: browser sample voice does not validate cloud transcription; headless Chromium does not validate physical camera/microphone or TalkBack; localStorage does not validate secure multi-user stock transactions. See the test README for actual commands and remaining limitations.
