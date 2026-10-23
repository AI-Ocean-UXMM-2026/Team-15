# INVENTO— Product Requirements Document (PRD)

**Version:** 1.1\
**Date:** 20 October 2026\
**Domain:** Logistics\
**Scenario:** Warehouse Stock Blind Spots\
**Market:** Local Myanmar\
**Phase:** Phase 1 — Mobile-first MVP\
**Business model:** Freemium

*Version 1.1 is based on the latest confirmed meeting notes (INVENTO). It supersedes the earlier Smart Stock PRD; only still-relevant material from that draft is carried over.*

---

## 1. Product Overview

INVENTO is a mobile-first inventory app for small and mid-sized warehouses. It helps owners add stock quickly, see what is changing, and know which items need attention.

### Core idea

> **Know what you have, what is changing, and what needs attention.**

### Unique value proposition

**Push-to-talk stock entry.** Manually typing every product is slow. INVENTO lets the user scan a code and speak the product name, description and quantity, then review and confirm, so stock goes in far faster than typing.

## 2. Problem Statement

- Manual inventory counts are slow and error-prone.
- Stock movements get forgotten, so records are reactive instead of predictive.
- Owners find out about stockouts or overstock only when it is too late.
- Owners have little visibility into which items need attention.
- Adding stock manually takes a long time, which discourages keeping records current.

## 3. Target Audience

**Primary user:** the owner of a single warehouse (small or mid-sized business) who stocks **100+ items** and manages a small team of **two to five employees**.

**Phase 1 usage:** one user, on one device, manages one warehouse from a mobile phone. Stock comes in and goes out.

**Market:** local Myanmar.

## 4. Product Goals

1. Reduce the time and effort needed to add stock to the system.
2. Make Stock In and Stock Out quick to record.
3. Give timely alerts for low stock, out-of-stock and expiry.
4. Keep a traceable history of every movement and adjustment.
5. Make reordering from suppliers easy and track the order status.
6. Deliver a focused, usable mobile experience for a single warehouse.

## 5. Phase 1 Features

Given the five-day timeline, Phase 1 is deliberately reduced to a minimal code scope built around **two main input methods**: traditional (manual) input and push-to-talk input.

### 5.1 Feature A — Traditional (Manual) Input

To register a new product, the user taps **Add**, then chooses **Typing**. Products are added one item at a time. The product form captures:

- Product name and description
- FDA code, other related information, and supplier information
- QR code or barcode (scan)
- Product photos / images
- Expiry date
- Stock-in date
- Remarks (for example, "damaged when received")
- Stock quantity

### 5.2 Feature B — Push-to-Talk Input (Unique Value Proposition)

Push-to-talk is designed for adding **one product at a time** quickly, including in noisy warehouse environments.

**Flow**

1. The user scans the product's QR code, barcode or 12-digit code. The system uses it as the product's unique identifier. If the product already exists, its information is updated; if not, the code becomes the unique ID of a new product record.
2. The user presses and holds push-to-talk and speaks, for example: *"Instant noodle, 40 pack."*
3. The system records the voice and shows a **transcribed text version for review**. Review is required because background noise, pronunciation and language can cause errors.
4. If the text is wrong or unclear, the user can **retry** push-to-talk.
5. On **Confirm**, the item is added to a table list. The user can repeat this to add multiple items in the same session, one at a time.
6. In the table, the user can add extra information that voice does not capture, such as an **expiry date** (for example, noodles expiring in two months). A remark can also be added manually to each item if needed.
7. On **Save**, the Stock In process is complete.

**Data captured by push-to-talk (limited by design)**

| Source | Captured |
| --- | --- |
| QR / barcode scan | Unique product identification |
| Voice | Product name, description, product count |
| Not available by voice | Product images and other details (added manually, or in the review table, e.g. expiry date) |

**Demo scenario:** three products (for example instant noodles, bottled water, bread) added in one session, then saved.

### 5.3 Stock Out

1. The user **taps the Ship Out button (also called Stock Out in this PRD)**.
2. The user selects a product from a **dropdown, which may be filtered by category (to be confirmed)**.
3. The user enters the quantity.
4. The user confirms, and the recorded stock decreases.

### 5.4 Item Status and Supplier Reorder

Each item has a status for its stock and, after a reorder, for the supplier order.

- **In Stock** — available.
- **Out of Stock** — stock is empty; the user can **reorder from the supplier**.
- **Pending / Confirm Shipping** — after the supplier replies, the status is updated to show the order is awaiting shipping confirmation.

Supplier information is stored so the user can reorder easily.

### 5.5 Alerts and Alert Settings

The app alerts users to:

- Low stock
- Out-of-stock items
- Expiry dates (where an expiry date is set)

Users can configure alerts in a **Settings** section:

- **Expiry alerts:** how long before expiry to be reminded (for example three days, or four weeks).
- **Quantity alerts:** a stock-level threshold per product. For example, after stocking in 40 packs of instant noodles, the user can set a reminder when stock reaches 20.

### 5.6 History

Movement and adjustment history, so every change is traceable (Stock In, Stock Out, adjustments, with timestamps and quantities).

## 6. User Flow Summary

&#91;embedded content: user flow · add a product (typing or scan) and ship out\]

A new user signs in, lands on the home screen and adds a product by typing or by scan; push-to-talk is the highlighted step. Ship out is a short chain from the button to the count.

After registration and ship out, the rest of the journey is:

1. Add products via typing or push-to-talk (with scan).
2. Record Stock In (save from the review table) and Stock Out (dropdown + quantity).
3. Review stock status and alerts to see what needs attention.
4. Reorder from the supplier when stock is low or empty, and track order status.
5. Review history to see what changed and when.

## 7. Freemium Business Model

| Tier / phase | Access |
| --- | --- |
| **Phase 1 (free)** | One device, one user |
| **Phase 2** | Web app plus mobile, multiple users: the owner views live inventory on the web while employees scan, talk and update stock from their phones |
| **Phase 3** | Invoice feature, POS integration and payment integration |

The exact boundary between free and paid features is still to be defined.

## 8. Scope

### In Phase 1

- Manual (typing) product input with scan, photos, FDA code, expiry date, supplier info, remarks
- Push-to-talk input with transcript review, retry and a multi-item review table
- Stock In and Stock Out
- Item status (In Stock, Out of Stock, Pending / Confirm Shipping) and supplier information for reordering
- Low-stock, out-of-stock and expiry alerts with user-configurable settings
- Movement and adjustment history
- Onboarding and sign-in; single user, single device, single warehouse

### Out of Phase 1

- Multi-warehouse management
- Web app and multi-user access
- Invoice management, POS and payment integration
- Advanced forecasting

## 9. Roadmap

- **Phase 1 — Single-warehouse mobile MVP:** the features above; freemium with one user and one device.
- **Phase 2 — Multi-warehouse and web app:** multi-warehouse management, a web app for the owner, and multiple employee users on mobile.
- **Phase 3 — Invoice, POS and payments:** invoice management, POS integration and payment integration.

## 10. Project Timeline

The project runs five days. Day 2 is the current day, leaving three days of build time. The final day is reserved for presentation preparation and testing, so the build scope is kept to the minimum above.

## 11. Risks and Open Questions

- **Voice accuracy:** which languages and accents must push-to-talk support, and how well does transcription cope with warehouse noise? The review and retry step is the mitigation.
- **Stock Out beyond available stock:** should it be blocked, and how should the app handle it?
- **Supplier reply:** how does the supplier's reply reach the app, or does the user update the status manually?
- **Alert delivery:** which notification channels are practical?
- **Physical count:** the earlier draft included a physical count and discrepancy adjustment feature. It is not in the confirmed meeting notes; confirm whether it stays in Phase 1 or moves later.
- **Team size vs. single user:** the target owner has two to five employees, but Phase 1 allows one user on one device. Confirm how the owner and employees share the device, and that this is acceptable for the pitch.
- **Item count:** the earlier draft said 200+ items; the latest notes say 100+. This PRD uses 100+.
- **Free vs. paid limits:** what justifies upgrading to multi-user and web?
- **Product codes and ship-out filter:** confirm the format of the FDA code and the 12-digit code, and whether the ship-out dropdown filters by category.

## 12. Final Product Definition

**INVENTO is a mobile-first inventory app for small and mid-sized warehouse owners in Myanmar. In Phase 1, one user on one device manages one warehouse, adds stock quickly by typing or by push-to-talk, records Stock Out, tracks item and supplier-order status, and receives low-stock, out-of-stock and expiry alerts. Phase 2 adds multi-warehouse management, a web app and multiple users; Phase 3 adds invoicing, POS and payment integration.**
