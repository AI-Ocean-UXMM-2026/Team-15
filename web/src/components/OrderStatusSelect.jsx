import React, { useState } from "react";
import { useT, useApp } from "../lib.jsx";

// Allowed moves match the API's reorder flow: Pending → Confirm shipping → Received, or cancel.
const NEXT = { PENDING: ["CONFIRM_SHIPPING", "RECEIVED", "CANCELLED"], CONFIRM_SHIPPING: ["RECEIVED", "CANCELLED"] };

/**
 * Item status dropdown the owner updates after contacting the supplier.
 * With no open order, choosing "Pending" starts a reorder; otherwise it moves the open order along.
 */
export default function OrderStatusSelect({ product, order, onReorder, onReceive, onChanged }) {
  const t = useT();
  const { request, notify, setError, load } = useApp();
  const [busy, setBusy] = useState(false);
  const current = order?.status || "NONE";

  const change = async (status) => {
    if (status === current) return;
    if (!order) { if (status === "PENDING") onReorder?.(); return; }
    if (status === "RECEIVED" && onReceive) { onReceive(order); return; }
    if (status === "RECEIVED" && !window.confirm(t("receiveConfirm", { qty: order.quantity, unit: order.unit || product?.unit || "" }))) return;
    if (status === "CANCELLED" && !window.confirm(t("cancelOrderConfirm"))) return;
    setBusy(true); setError("");
    try {
      await request(`/v1/reorders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      notify(t("orderUpdated"));
      await load();
      onChanged?.();
    } catch (e) { setError(t.err(e)); } finally { setBusy(false); }
  };

  const stock = product ? t(`status_${product.status || "IN_STOCK"}`) : "";
  const allowed = order ? NEXT[order.status] || [] : ["PENDING"];
  const options = order
    ? [order.status, ...allowed]
    : ["NONE", "PENDING"];
  const label = (s) => ({
    NONE: t("optNoOrder", { stock }), PENDING: t("optPending"), CONFIRM_SHIPPING: t("optConfirmShipping"),
    RECEIVED: t("optReceived"), CANCELLED: t("optCancel")
  })[s];

  return <label className="status-select">
    <span>{t("itemStatus")}</span>
    <select value={current} disabled={busy} onChange={(e) => change(e.target.value)}>
      {options.map((s) => <option key={s} value={s}>{label(s)}</option>)}
    </select>
  </label>;
}
