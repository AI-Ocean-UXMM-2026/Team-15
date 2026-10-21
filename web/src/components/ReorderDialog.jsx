import React, { useState } from "react";
import { X, Sparkles, CheckCircle2 } from "lucide-react";
import { useT, useApp, Input, Field, orderMessage } from "../lib.jsx";
import SupplierMessage from "./SupplierMessage.jsx";
import OrderStatusSelect from "./OrderStatusSelect.jsx";

/** PRD 5.4 — reorder from the stored supplier; the order starts as Pending and can be sent by Viber/Telegram/SMS. */
export default function ReorderDialog({ product, onClose }) {
  const t = useT();
  const { request, notify, setError, load, warehouse } = useApp();
  const forecastQty = product.suggestedOrder > 0 ? product.suggestedOrder : null;
  const suggested = forecastQty ?? Math.max(product.lowStockThreshold * 2 - product.quantity, 1);
  const [form, setForm] = useState({ quantity: suggested, supplier: product.supplier || "", supplierPhone: product.supplierPhone || "", note: "" });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const message = orderMessage(t, { supplier: form.supplier, warehouse: warehouse?.name, product: product.name, quantity: Number(form.quantity) || 0, unit: product.unit });

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await request("/v1/reorders", { method: "POST", body: JSON.stringify({ productId: product.id, ...form, quantity: Number(form.quantity) }) });
      setCreated(r); notify(t("orderCreated")); load();
    } catch (err) { setError(t.err(err)); } finally { setBusy(false); }
  };

  return <div className="modalback" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <form className="modal" onSubmit={submit}>
      <div className="modalhead"><div><div className="overline">{t("orders").toUpperCase()}</div><h3>{created ? t("sendToSupplier") : t("reorderTitle")}</h3></div><button type="button" className="iconbutton" title={t("close")} onClick={onClose}><X /></button></div>
      {created ? <div className="modalbody">
        <div className="successbox"><CheckCircle2 size={17} />{t("orderCreated")}</div>
        <OrderStatusSelect product={{ ...product, orderStatus: created.status }} order={{ ...created, unit: product.unit }} onChanged={onClose} />
        <p className="choice-subtitle">{t("sendToSupplierSub")}</p>
        <SupplierMessage text={message} phone={form.supplierPhone} />
        <div className="modalfoot"><button type="button" className="primary" onClick={onClose}>{t("done")}</button></div>
      </div> : <>
        <div className="modalbody">
          <div className="settingsrow"><span>{t("colProduct")}</span><b>{product.name}</b></div>
          <div className="settingsrow"><span>{t("onHand")}</span><b>{t.num(product.quantity)} {product.unit}</b></div>
          {forecastQty && <div className="forecast-hint"><Sparkles size={16} /><span>{t("forecastSuggest", { use: product.dailyUsage, unit: product.unit, qty: forecastQty })}</span></div>}
          <Input label={`${t("orderQty")} (${product.unit})`} value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} type="number" min={1} step={1} required />
          <div className="formgrid">
            <Input label={t("supplier")} value={form.supplier} onChange={(v) => setForm({ ...form, supplier: v })} />
            <Input label={t("supplierPhone")} value={form.supplierPhone} onChange={(v) => setForm({ ...form, supplierPhone: v })} type="tel" />
          </div>
          {!form.supplier && <div className="hint">{t("noSupplier")}</div>}
          <Field label={t("orderNote")}><textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <small className="fieldhint">{t("messagePreview")}</small>
          <div className="msg-bubble">{message}</div>
          <div className="hint">{t("orderFlowHint")}</div>
        </div>
        <div className="modalfoot">
          <button type="button" className="secondary" onClick={onClose}>{t("cancel")}</button>
          <button className="primary" disabled={busy}>{busy ? t("saving") : t("orderAndSend")}</button>
        </div>
      </>}
    </form>
  </div>;
}
