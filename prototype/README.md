# Invento V3 prototype

The application entry point is **`../index.html`**, not a separate prototype HTML file. Serve the repository root or open that file directly.

## Core walkthrough

1. Home → central Scan. Manual entry is above the centered scanner.
2. Choose Noodles (or scan/type a code). The Add item information screen shows a barcode/status card and a large bottom Push to Talk action above Type manually. Tap to start/stop recording; an alternate hold control and explicit sample phrase remain available.
3. Use the sample voice phrase → review. Retry preserves the code; Edit opens the full form.
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
