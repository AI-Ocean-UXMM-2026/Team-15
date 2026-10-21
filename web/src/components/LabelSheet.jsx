import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { useT, useApp } from "../lib.jsx";

/**
 * Printable QR sticker sheet. Many local products have no barcode; a printed QR with the
 * product's code makes them scannable in Stock In / Ship Out / push-to-talk like any other item.
 */
export default function LabelSheet({ initialIds, onClose }) {
  const t = useT();
  const { data, warehouse } = useApp();
  const [selected, setSelected] = useState(() => new Set(initialIds?.length ? initialIds : data.products.map((p) => p.id)));
  const [copies, setCopies] = useState(initialIds?.length === 1 ? 6 : 1);
  const [qr, setQr] = useState({});

  useEffect(() => {
    let alive = true;
    import("qrcode").then(async ({ default: QRCode }) => {
      const out = {};
      for (const p of data.products) out[p.id] = await QRCode.toDataURL(p.barcode || p.sku, { margin: 1, width: 220, errorCorrectionLevel: "M" });
      if (alive) setQr(out);
    });
    return () => { alive = false; };
  }, [data.products]);

  const chosen = data.products.filter((p) => selected.has(p.id));
  const labels = chosen.flatMap((p) => Array.from({ length: Math.max(1, Math.min(50, Number(copies) || 1)) }, (_, i) => ({ p, key: `${p.id}-${i}` })));
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return <>
    <div className="modalback no-print" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal wide-modal">
        <div className="modalhead"><div><div className="overline">{t("catalog")}</div><h3>{t("labelsTitle")}</h3></div><button type="button" className="iconbutton" title={t("close")} onClick={onClose}><X /></button></div>
        <div className="modalbody">
          <p className="choice-subtitle">{t("labelsSub")}</p>
          <div className="row-gap label-tools">
            <button type="button" className="chip" onClick={() => setSelected(new Set(data.products.map((p) => p.id)))}>{t("selectAll")}</button>
            <button type="button" className="chip" onClick={() => setSelected(new Set())}>{t("selectNone")}</button>
            <label className="copies">{t("copiesEach")} <input className="num" type="number" min={1} max={50} value={copies} onChange={(e) => setCopies(e.target.value)} /></label>
          </div>
          <div className="label-pick">{data.products.map((p) => <label key={p.id} className={selected.has(p.id) ? "on" : ""}>
            <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /><span><b>{p.name}</b><small>{p.barcode || p.sku}</small></span></label>)}</div>
          <h4 className="section-title">{t("preview")}</h4>
          <div className="label-grid preview">{labels.slice(0, 8).map(({ p, key }) => <Label key={key} p={p} qr={qr[p.id]} warehouse={warehouse?.name} />)}</div>
        </div>
        <div className="modalfoot"><span className="muted">{t("labelCount", { n: labels.length })}</span><button type="button" className="secondary" onClick={onClose}>{t("cancel")}</button><button type="button" className="primary" disabled={!labels.length} onClick={() => window.print()}><Printer size={16} />{t("printLabels")}</button></div>
      </div>
    </div>
    {createPortal(<div className="print-only label-grid">{labels.map(({ p, key }) => <Label key={key} p={p} qr={qr[p.id]} warehouse={warehouse?.name} />)}</div>, document.body)}
  </>;
}

function Label({ p, qr, warehouse }) {
  return <div className="qr-label">
    {qr ? <img src={qr} alt="" /> : <div className="qr-wait" />}
    <div><b>{p.name}</b><code>{p.barcode || p.sku}</code><small>{p.unit} · {warehouse || "INVENTO"}</small></div>
  </div>;
}
