import React, { useState } from "react";
import { X, Phone } from "lucide-react";
import { useT, useApp, Input, Field } from "../lib.jsx";

/** PRD 5.4 — reorder from the stored supplier; the order starts as Pending. */
export default function ReorderDialog({ product, onClose }) {
  const t = useT();
  const { request, notify, setError, load } = useApp();
  const suggested = Math.max(product.lowStockThreshold * 2 - product.quantity, 1);
  const [form, setForm] = useState({ quantity: suggested, supplier: product.supplier || "", supplierPhone: product.supplierPhone || "", note: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await request("/v1/reorders", { method: "POST", body: JSON.stringify({ productId: product.id, ...form, quantity: Number(form.quantity) }) });
      notify(t("orderCreated")); await load(); onClose();
    } catch (err) { setError(t.err(err)); } finally { setBusy(false); }
  };

  return <div className="modalback" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <form className="modal" onSubmit={submit}>
      <div className="modalhead"><div><div className="overline">{t("orders").toUpperCase()}</div><h3>{t("reorderTitle")}</h3></div><button type="button" className="iconbutton" title={t("close")} onClick={onClose}><X /></button></div>
      <div className="modalbody">
        <div className="settingsrow"><span>{t("colProduct")}</span><b>{product.name}</b></div>
        <div className="settingsrow"><span>{t("onHand")}</span><b>{t.num(product.quantity)} {product.unit}</b></div>
        <Input label={`${t("orderQty")} (${product.unit})`} value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} type="number" min={1} step={1} required />
        <div className="formgrid">
          <Input label={t("supplier")} value={form.supplier} onChange={(v) => setForm({ ...form, supplier: v })} />
          <Input label={t("supplierPhone")} value={form.supplierPhone} onChange={(v) => setForm({ ...form, supplierPhone: v })} type="tel" />
        </div>
        {!form.supplier && <div className="hint">{t("noSupplier")}</div>}
        <Field label={t("orderNote")}><textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        <div className="hint">{t("orderFlowHint")}</div>
      </div>
      <div className="modalfoot">
        {form.supplierPhone && <a className="secondary" href={`tel:${form.supplierPhone.replace(/\s+/g, "")}`}><Phone size={15} />{t("callSupplier")}</a>}
        <button type="button" className="secondary" onClick={onClose}>{t("cancel")}</button>
        <button className="primary" disabled={busy}>{busy ? t("saving") : t("reorder")}</button>
      </div>
    </form>
  </div>;
}
