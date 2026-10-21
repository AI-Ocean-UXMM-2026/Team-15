# Invento

An interactive Android-first inventory prototype for one warehouse and a five-person team. Scan a product, speak its details, review the receiving list, and save a traceable delivery.

## Try it

Open `index.html` directly in a modern browser, or serve this directory:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

There are no application dependencies or build steps. On small screens the app fills the viewport; desktop shows a phone preview and workflow notes.

Start with the central **Scan** button. **Type manually** is at the top of the scanner. Choose a sample product to see its barcode and Push to Talk on the same screen. Use the sample voice phrase, review, and confirm. The next screen adds a product photo (camera or gallery), supplier and extra details without a location field. Select a supplier or add one with name, contact person, phone, email, social account and address. Then add the item to the receiving list. Add noodles, water and bread, then **Save delivery**. Stock changes only at that final save.

Also try manual registration, Stock In, Stock Out, Count, Supplier orders, alert preferences and History. Setting contains language switching, an offline simulation, a five-member team preview and onboarding. Actual browser offline events also block stock writes.

## Project structure

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

## Test

Install Playwright in your development environment and its Chromium browser, then run:

```sh
node tests/prototype.cjs
```

The suite also supports a system browser using `CHROMIUM_PATH=/path/to/chromium`. See [test instructions](tests/README.md). Regenerate the locale bundle after editing JSON with `node scripts/build-locales.cjs`.

## Current boundaries

This is a working local UI prototype, not a production Android application. Data stays in browser storage. Browser camera scanning requires `BarcodeDetector` and a secure context; typed/sample codes are always available. Optional browser speech recognition is not the planned cloud voice service. The three sample phrases are explicitly demo inputs. Sign-in and the five-person roster are presentation screens, not authentication/authorization. Supplier status updates do not send messages.

The supplied [Figma file](https://www.figma.com/design/V6w22Z09deAA1CbQCSuJjv/Stock-Management-System?node-id=1206-71) could not be retrieved through this environment's network proxy. Tokens and local SVGs are provisional, not verified Anydesignstyem/Reicon assets. Myanmar strings require completion and native-speaker review.

Existing prototype data is imported from legacy keys when available. The new store is `invento-v3`; legacy keys remain intact. Clear that key in browser developer tools to start with fresh sample data.
