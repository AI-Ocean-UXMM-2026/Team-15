---
name: invento-i18n
description: Project-local English/Burmese localization and typography conventions for Invento web and Expo mobile.
---

# Invento English / Burmese localization skill

Scope: **only the Invento project** and its three repositories. Do not install or apply globally.

## Mandatory rules
1. Use separate language-aware text styles, not one shared fixed typography rule. English (`en`) may use a tuned line height; Burmese (`my`) must use `line-height: normal` / platform-natural font metrics or a more generous **Burmese-only** line height verified on devices. Never clip stacked vowel marks or tone marks.
2. **Never set custom letter spacing/tracking on Burmese text** (CSS `letter-spacing: normal`; React Native `letterSpacing` omitted). Do not use uppercase transforms on Burmese. Do not set rigid text container heights.
3. Use a font with reliable Myanmar Unicode shaping (e.g. Noto Sans Myanmar or platform-provided Myanmar font) and distinct English font tokens. Check actual font licenses before bundling. Test mixed-script fallback.
4. Translate meaning, not individual English words. Preserve recognized technical/UI terms when users will understand them better: `SKU`, `QR`, `Barcode`, `Stock In`, `Stock Out`, `Batch`, `AI`, `FDA`, `Login`, `PIN`, `API`. Review terms with Myanmar speakers; don't indiscriminately preserve every English phrase.
5. Keep proper names, brands, product identifiers, SKU and barcode strings unchanged. Keep placeholders/variables semantic, never concatenate translated sentence fragments. Prefer concise natural Burmese phrasing.
6. Localize dates/numbers using locale-aware formatting, but preserve machine identifiers, codes and API fields exactly. Test Burmese numerals input and normalize quantities for validation without changing visible original input unexpectedly.
7. Use key-based resources (`en.json`, `my.json`) and a reviewed terminology glossary. No inline hardcoded user-facing strings. Support missing-key detection and English fallback with logging in development.
8. Set accessibility language where supported; provide full translated labels and error states. Verify wrap, truncation, 200% font scale, 360dp devices, and Android font rendering.
9. AI voice: support code-switching and keep transcripts in spoken language; never translate SKUs or brand names; show editable extracted fields and explicit confirmation.

## Web example
```css
:root:lang(en) { --body-line-height: 1.5; }
:root:lang(my) { --body-line-height: normal; }
:lang(en) { font-family: var(--font-en), sans-serif; line-height: var(--body-line-height); }
:lang(my) { font-family: var(--font-my), sans-serif; line-height: normal; letter-spacing: normal; }
```
Avoid assigning `height` to text wrappers; prefer min-height and padding. Ensure `lang` on root and on mixed-language spans where possible.

## React Native example
```tsx
const textStyle = locale === 'my'
  ? { fontFamily: 'NotoSansMyanmar', lineHeight: undefined, includeFontPadding: true }
  : { fontFamily: 'Inter', lineHeight: 24 };
// No letterSpacing property on Burmese styles.
```
On Android verify actual line metrics, `includeFontPadding`, wrapping and dynamic font scaling; tune Burmese-only line height if natural metrics are insufficient.

## Review checklist
- [ ] Burmese glyphs never overlap or clip
- [ ] No Burmese letter spacing override
- [ ] English and Burmese styles are distinct
- [ ] Technical terms follow glossary
- [ ] All success, failure, loading, camera/mic states localized
- [ ] Mixed-script product names and quantities render and parse correctly
- [ ] Native speakers review critical stock confirmation wording
