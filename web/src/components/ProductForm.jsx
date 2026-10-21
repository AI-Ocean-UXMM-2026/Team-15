import React, { useState } from "react";
import { Camera, ScanLine, Trash2, X } from "lucide-react";
import { useT, useApp, Field, Input, resizeImage, todayISO, CATEGORIES } from "../lib.jsx";
import Scanner from "./Scanner.jsx";

const blank = (threshold) => ({
  name: "", description: "", sku: "", barcode: "", category: "Food & Beverage", unit: "pcs", fdaCode: "",
  supplier: "", supplierPhone: "", supplierEmail: "", lowStockThreshold: threshold, initialQuantity: 0,
  stockInDate: todayISO(), expiryDate: "", remarks: "", photos: []
});

/** Feature A — traditional (typing) input. Also used to edit an existing product. */
export default function ProductForm({ product, preset, onDone, onCancel }) {
  const t = useT();
  const { request, notify, setError, load, warehouse, openProduct } = useApp();
  const editing = Boolean(product?.id);
  const [form, setForm] = useState(() => editing ? { ...blank(5), ...product } : { ...blank(warehouse?.settings?.defaultLowStockThreshold ?? 5), ...(preset || {}) });
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const addPhotos = async (files) => {
    const room = 4 - form.photos.length;
    const list = await Promise.all([...files].slice(0, room).map((f) => resizeImage(f).catch(() => null)));
    setForm((f) => ({ ...f, photos: [...f.photos, ...list.filter(Boolean)].slice(0, 4) }));
  };

  const onScanned = async (code) => {
    setScanning(false);
    setForm((f) => ({ ...f, barcode: code }));
    if (editing) return;
    try {
      const r = await request(`/v1/products/lookup/${encodeURIComponent(code)}`);
      if (r.found) { notify(t("codeExists", { name: r.product.name })); onCancel(); openProduct(r.product.id); }
    } catch { /* lookup is only a convenience */ }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const body = { ...form, lowStockThreshold: Number(form.lowStockThreshold), initialQuantity: Number(form.initialQuantity) };
      const saved = editing
        ? await request(`/v1/products/${product.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await request("/v1/products", { method: "POST", body: JSON.stringify(body) });
      notify(t(editing ? "productUpdated" : "productCreated"));
      await load();
      onDone(saved);
    } catch (err) { setError(t.err(err)); } finally { setBusy(false); }
  };

  return <>
    <form className="modal wide-modal" onSubmit={submit}>
      <div className="modalhead"><div><div className="overline">{t("catalog")}</div><h3>{editing ? t("editProduct") : t("choiceTyping")}</h3></div><button type="button" className="iconbutton" title={t("close")} onClick={onCancel}><X /></button></div>
      <div className="modalbody">
        <h4 className="section-title">{t("productInfo")}</h4>
        <Input label={t("name")} value={form.name} onChange={set("name")} required placeholder={t("namePh")} />
        <Field label={t("description")}><textarea value={form.description} onChange={(e) => set("description")(e.target.value)} placeholder={t("descriptionPh")} /></Field>
        <Field label={t("barcode")}>
          <div className="input-with-button"><input value={form.barcode} onChange={(e) => set("barcode")(e.target.value)} placeholder={t("barcodePh")} /><button type="button" className="secondary" onClick={() => setScanning(true)}><ScanLine size={16} />{t("scan")}</button></div>
        </Field>
        <div className="formgrid">
          <Input label={t("sku")} value={form.sku} onChange={set("sku")} placeholder={t("skuPh")} />
          <Input label={t("fdaCode")} value={form.fdaCode} onChange={set("fdaCode")} placeholder={t("fdaPh")} />
        </div>
        <div className="formgrid">
          <Field label={t("category")}><select value={form.category} onChange={(e) => set("category")(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{t.cat(c)}</option>)}</select></Field>
          <Input label={t("unit")} value={form.unit} onChange={set("unit")} required placeholder={t("unitPh")} />
        </div>

        <h4 className="section-title">{t("photos")}</h4>
        <div className="photo-grid">
          {form.photos.map((p, i) => <div className="photo" key={i}><img src={p} alt="" /><button type="button" title={t("removePhoto")} onClick={() => setForm((f) => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}><Trash2 size={14} /></button></div>)}
          {form.photos.length < 4 && <label className="photo add-photo"><Camera size={20} /><span>{t("addPhoto")}</span><input type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} /></label>}
        </div>
        <small className="fieldhint">{t("photoLimit")}</small>

        <h4 className="section-title">{t("supplierInfo")}</h4>
        <Input label={t("supplier")} value={form.supplier} onChange={set("supplier")} />
        <div className="formgrid">
          <Input label={t("supplierPhone")} value={form.supplierPhone} onChange={set("supplierPhone")} type="tel" />
          <Input label={t("supplierEmail")} value={form.supplierEmail} onChange={set("supplierEmail")} type="email" />
        </div>

        <h4 className="section-title">{t("stockInfo")}</h4>
        <div className="formgrid">
          {!editing && <Input label={t("quantity")} value={form.initialQuantity} onChange={set("initialQuantity")} type="number" min={0} step={1} required />}
          <Input label={t("threshold")} value={form.lowStockThreshold} onChange={set("lowStockThreshold")} type="number" min={0} step={1} required />
        </div>
        {!editing && <div className="formgrid">
          <Input label={t("stockInDate")} value={form.stockInDate} onChange={set("stockInDate")} type="date" />
          <Input label={t("expiryDate")} value={form.expiryDate} onChange={set("expiryDate")} type="date" />
        </div>}
        <Field label={t("remarks")}><textarea value={form.remarks} onChange={(e) => set("remarks")(e.target.value)} placeholder={t("remarksPh")} /></Field>
        {!editing && <div className="hint">{t("openingHint")}</div>}
      </div>
      <div className="modalfoot"><button type="button" className="secondary" onClick={onCancel}>{editing ? t("cancel") : t("back")}</button><button type="submit" className="primary" disabled={busy}>{busy ? t("saving") : editing ? t("saveChanges") : t("save")}</button></div>
    </form>
    {scanning && <Scanner onDetected={onScanned} onClose={() => setScanning(false)} />}
  </>;
}
