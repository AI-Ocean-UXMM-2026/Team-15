import React, { useState } from "react";
import { useT, useApp, Input, Field } from "../lib.jsx";

export const blankSupplier = { name: "", contactPerson: "", phone: "", email: "", social: "", website: "", address: "", note: "" };

/** Add / edit supplier (fields from the designer's prototype). Calls onSaved(supplier) after saving. */
export default function SupplierForm({ supplier, onSaved, onCancel, onDeleted, compact }) {
  const t = useT();
  const { request, notify, setError, user } = useApp();
  const editing = Boolean(supplier?.id);
  const [f, setF] = useState({ ...blankSupplier, ...(supplier || {}) });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const save = async (e) => {
    e?.preventDefault();
    setBusy(true); setError("");
    try {
      const body = JSON.stringify(Object.fromEntries(Object.keys(blankSupplier).map((k) => [k, f[k] || ""])));
      const s = editing ? await request(`/v1/suppliers/${supplier.id}`, { method: "PATCH", body }) : await request("/v1/suppliers", { method: "POST", body });
      notify(t(editing ? "supplierUpdated" : "supplierAdded"));
      onSaved?.(s);
    } catch (err) { setError(t.err(err)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm(t("deleteSupplierConfirm", { name: supplier.name }))) return;
    try { await request(`/v1/suppliers/${supplier.id}`, { method: "DELETE" }); notify(t("supplierDeleted")); onDeleted?.(); }
    catch (err) { setError(t.err(err)); }
  };

  return <form className="supplier-form" onSubmit={save}>
    {!compact && <p className="choice-subtitle">{t("supplierFormHint")}</p>}
    <Input label={`${t("supplierName")} *`} value={f.name} onChange={set("name")} required autoFocus={!editing} />
    <Input label={t("contactPerson")} value={f.contactPerson} onChange={set("contactPerson")} />
    <div className="formgrid">
      <Input label={t("contactNumber")} value={f.phone} onChange={set("phone")} type="tel" placeholder="09 …" />
      <Input label={t("email")} value={f.email} onChange={set("email")} type="email" />
    </div>
    <Input label={t("socialLink")} value={f.social} onChange={set("social")} placeholder={t("socialPh")} />
    <Input label={t("website")} value={f.website} onChange={set("website")} placeholder="www.example.com" />
    <Field label={t("address")}><textarea value={f.address} onChange={(e) => set("address")(e.target.value)} /></Field>
    <div className="formactions">
      {editing && user?.role === "OWNER" && <button type="button" className="textbutton danger" onClick={remove}>{t("deleteSupplier")}</button>}
      {onCancel && <button type="button" className="secondary" onClick={onCancel}>{t("cancel")}</button>}
      <button className="primary" disabled={busy || !f.name.trim()}>{busy ? t("saving") : t("saveSupplier")}</button>
    </div>
  </form>;
}

/** Contact links for a supplier: call, email, Facebook/Viber page, website. */
export function supplierLinks(s) {
  const web = s.website ? (/^https?:\/\//i.test(s.website) ? s.website : `https://${s.website}`) : "";
  const social = s.social ? (/^https?:\/\//i.test(s.social) ? s.social : `https://facebook.com/${s.social.replace(/^@/, "")}`) : "";
  return { tel: s.phone ? `tel:${s.phone.replace(/[^\d+]/g, "")}` : "", mail: s.email ? `mailto:${s.email}` : "", social, web };
}
