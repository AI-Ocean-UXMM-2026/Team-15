# Implementation status

## Working in this starter
- API-backed login for the seeded demo owner
- Product list and search
- Create product with auditable opening movement
- Stock In with optional batch/expiry metadata
- Stock Out with reason/reference/note and insufficient-stock rejection
- Physical count with required reason when variance is non-zero
- Movement history with before/after quantities and actor
- Low-stock and out-of-stock alert list; expiry alert query
- Dashboard summary
- Warehouse-scoped database queries for the signed-in user's warehouse
- SQLite transaction for stock quantity + movement writes

## Partial / placeholder
- Registration creates an owner and one warehouse; email verification is not implemented
- Language switch covers common UI labels; not every table/status/error string is localized
- Expiry alerts use a 30-day default; user-configurable settings UI is not implemented
- Voice UI is a marked placeholder; no cloud speech provider is wired
- Lookup endpoint supports a typed SKU/barcode, but no camera scanner is wired
- Stock Out reason is free text, and destination is stored in note
- Batch quantity records receipt quantities, but there is no batch allocation on dispatch
- `DELETE /v1/products/:id` archives a product and is owner-only
- The supplied HTML prototype is preserved as a reference and is not the runtime frontend

## Not implemented
- Employee invitations, membership admin UI and hard five-member enforcement
- Production refresh token rotation/revocation
- File/photo upload
- Actual Expo Android client
- Offline cache and offline write blocking in a mobile client
- Push/email notifications
- Billing, payments, invoice, POS and checkout (excluded from Phase 1)
- Automated tests and CI pipeline
