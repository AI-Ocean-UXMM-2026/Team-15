# Invento V3 prototype

The application entry point is **`../index.html`**, not a separate prototype HTML file. Serve the repository root or open that file directly.

## Core walkthrough

1. Home → central Scan. Manual entry is above the centered scanner.
2. Choose Noodles (or scan/type a code). The Add item information screen shows a barcode/status card and a large bottom Push to Talk action above Type manually. Tap to start/stop recording. Instructions, an alternate hold control, and a sample phrase are inside [?]. Language switching is available only in Setting.
3. Open [?] to use a sample phrase, or record speech → review immediately. Correct — continue opens the detail form; Wrong — record again returns to voice with the code preserved. Edit opens the full form.
4. Confirm → Complete item details. Add a camera/gallery photo, choose/create a supplier, and fill optional details. Location is omitted. Add to the receiving list; stock remains unchanged.
5. Add Water and Bread. Edit expiry/remarks, then Save delivery.
6. Open a receipt. Check Inventory and History to see the recorded stock changes.
7. Stock Out → select → quantity → review → confirm. Too much stock is blocked.
8. Count → physical quantity → discrepancy reason → review → confirm.
9. Product detail → Reorder → Pending reply; Supplier → Orders → Confirm shipping.
10. Setting → Alert preferences / language / offline / team / onboarding.

Screenshots in `screenshots/` are captured from the running app, not design mockups. The browser test suite refreshes them.

## Integration limits

Camera: browser `getUserMedia` + `BarcodeDetector`, where supported. Voice: optional browser speech recognition, with labeled sample phrases. Neither has been verified on physical Android hardware. Native camera, cloud transcription, authenticated team access and backend transactions are the next implementation stages described in SPEC.md. English fallback remains for untranslated Myanmar keys.

## Illustrated account entry

Open `index.html#signin`, or use Setting → Preview onboarding → Continue. The forest-green warehouse scene and overlapping white panel are the identity of this screen. `assets/warehouse-auth.svg` is a local original illustration. Login/Register tabs, keyboard controls, email/password validation, password visibility and language switching are interactive. There is no account backend or configured demo password; Open demo warehouse retains the existing password-free entry. No credentials are transmitted or persisted.
