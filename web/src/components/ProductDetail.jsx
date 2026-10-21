import React, { useEffect, useState } from "react";
import { X, ArrowDownToLine, ArrowUpFromLine, Truck, Pencil, Archive, Package, Sparkles, QrCode } from "lucide-react";
import { useT, useApp, StatusBadge, expiryLabel, runOutLabel } from "../lib.jsx";

export default function ProductDetail({ id, onClose }) {
  const t = useT();
  const { request, setPage, setPrefill, setError, notify, load, openReorder, openEdit, openLabels, user } = useApp();
  const [p, setP] = useState(null);
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    request(`/v1/products/${id}`).then(setP).catch((e) => { setError(t.err(e)); onClose(); });
  }, [id]);

  const go = (page) => { setPrefill({ productId: id }); onClose(); setPage(page); };
  const archive = async () => {
    if (!window.confirm(t("archiveConfirm", { name: p.name }))) return;
    try { await request(`/v1/products/${id}`, { method: "DELETE" }); notify(t("archived")); onClose(); await load(); }
    catch (e) { setError(t.err(e)); }
  };
  const row = (label, value) => <div className="settingsrow"><span>{label}</span><b>{value || "—"}</b></div>;

  return <div className="modalback" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal">
      <div className="modalhead"><div><div className="overline">{t("productDetails")}</div><h3>{p?.name || t("loading")}</h3></div><button className="iconbutton" title={t("close")} onClick={onClose}><X /></button></div>
      {p && <div className="modalbody">
        <div className="detail-photo">
          {p.photos?.length ? <><img src={p.photos[photo]} alt={p.name} />{p.photos.length > 1 && <div className="thumbs">{p.photos.map((src, i) => <button key={i} className={i === photo ? "active" : ""} onClick={() => setPhoto(i)}><img src={src} alt="" /></button>)}</div>}</>
            : <div className="nophoto"><Package size={30} /><small>{t("noPhotos")}</small></div>}
        </div>
        <div className="detail-qty"><div><small>{t("onHand")}</small><strong>{t.num(p.quantity)} <span>{p.unit}</span></strong></div><StatusBadge product={p} /></div>
        {p.dailyUsage > 0 && <div className={`forecast-card ${p.daysLeft <= 7 ? "urgent" : ""}`}>
          <Sparkles size={18} />
          <div><b>{runOutLabel(t, p)}</b><small>{t("usagePerDay", { n: p.dailyUsage, unit: p.unit })}{p.suggestedOrder > 0 ? ` · ${t("suggestOrder", { n: p.suggestedOrder, unit: p.unit })}` : ""}</small></div>
        </div>}
        {p.description && <p className="detail-desc">{p.description}</p>}
        {row(t("barcode"), p.barcode)}
        {row(t("sku"), p.sku)}
        {row(t("category"), t.cat(p.category))}
        {row(t("fdaCode"), p.fdaCode)}
        {row(t("threshold"), t.num(p.lowStockThreshold))}
        {row(t("supplier"), [p.supplier, p.supplierPhone, p.supplierEmail].filter(Boolean).join(" · "))}
        {row(t("remarks"), p.remarks)}
        {p.activeReorder && row(t("supplierOrder"), `${t(`status_${p.activeReorder.status}`)} · ${t.num(p.activeReorder.quantity)} ${p.unit}`)}
        <h4 className="section-title">{t("batches")}</h4>
        {p.batches?.filter((b) => b.expiryDate).length ? p.batches.filter((b) => b.expiryDate).map((b) => <div className="settingsrow" key={b.id}><span>{t.date(b.expiryDate)}{b.lotNumber ? ` · ${b.lotNumber}` : ""}</span><b>{t.num(b.quantity)} {p.unit} · {expiryLabel(t, b.expiryDate)}</b></div>) : <div className="empty small">{t("noBatches")}</div>}
        <div className="detail-actions">
          <button className="secondary" onClick={() => go("receive")}><ArrowDownToLine size={16} />{t("receive")}</button>
          <button className="primary" onClick={() => go("dispatch")} disabled={p.quantity <= 0}><ArrowUpFromLine size={16} />{t("dispatch")}</button>
          <button className="secondary" onClick={() => { onClose(); openReorder(p); }} disabled={Boolean(p.activeReorder)}><Truck size={16} />{t("reorder")}</button>
          <button className="secondary" onClick={() => { onClose(); openEdit(p); }}><Pencil size={16} />{t("editProduct")}</button>
          <button className="secondary" onClick={() => { onClose(); openLabels([p.id]); }}><QrCode size={16} />{t("printLabel")}</button>
          {user?.role === "OWNER" && <button className="textbutton danger" onClick={archive}><Archive size={16} />{t("archive")}</button>}
        </div>
      </div>}
    </div>
  </div>;
}
