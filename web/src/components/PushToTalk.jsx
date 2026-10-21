import React, { useEffect, useRef, useState } from "react";
import { Mic, ScanLine, RotateCcw, Check, Trash2, Save, Keyboard } from "lucide-react";
import { useT, useApp, Input } from "../lib.jsx";
import Scanner from "./Scanner.jsx";

const SpeechRecognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

/**
 * Feature B — push-to-talk stock in (PRD 5.2):
 * scan code → hold and speak → review transcript (retry if wrong) → confirm into the table →
 * add expiry / remarks in the table → save completes Stock In.
 */
export default function PushToTalk({ initialCode = "" }) {
  const t = useT();
  const { request, notify, setError, load, pttRows: rows, setPttRows: setRows } = useApp();
  const [code, setCode] = useState(initialCode);
  const [lookup, setLookup] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [voiceLang, setVoiceLang] = useState(t.lang === "my" ? "my-MM" : "en-US");
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [heard, setHeard] = useState("");
  const [typed, setTyped] = useState("");
  const [review, setReview] = useState(null);
  const [saving, setSaving] = useState(false);
  const recRef = useRef(null);
  const textRef = useRef("");

  useEffect(() => { if (initialCode) checkCode(initialCode); }, []);
  useEffect(() => {
    const warn = (e) => { if (rows.length) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [rows.length]);

  async function checkCode(value) {
    const c = value.trim();
    setCode(c);
    if (!c) { setLookup(null); return; }
    try { setLookup(await request(`/v1/products/lookup/${encodeURIComponent(c)}`)); } catch { setLookup(null); }
  }

  async function parse(text) {
    const clean = text.trim();
    if (!clean) { setError(t("noSpeech")); return; }
    setProcessing(true);
    try {
      const r = await request("/v1/voice/parse", { method: "POST", body: JSON.stringify({ text: clean }) });
      const existing = lookup?.found ? lookup.product : null;
      setReview({
        transcript: r.transcript, name: r.name || existing?.name || "", quantity: r.quantity ?? "",
        unit: r.unit || existing?.unit || "pcs", description: r.description || ""
      });
    } catch (e) { setError(t.err(e)); } finally { setProcessing(false); }
  }

  const startTalk = (e) => {
    e?.preventDefault?.();
    if (!SpeechRecognition || listening) return;
    e?.currentTarget?.setPointerCapture?.(e.pointerId);
    setError(""); setReview(null); setHeard(""); textRef.current = "";
    const rec = new SpeechRecognition();
    rec.lang = voiceLang;
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (ev) => {
      let finalText = "", interim = "";
      for (const r of ev.results) (r.isFinal ? (finalText += r[0].transcript + " ") : (interim += r[0].transcript));
      textRef.current = (finalText + interim).trim();
      setHeard(textRef.current);
    };
    rec.onerror = (ev) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") setError(t("micDenied"));
      else if (ev.error === "no-speech") setError(t("noSpeech"));
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      if (textRef.current) parse(textRef.current);
    };
    recRef.current = rec;
    try { rec.start(); setListening(true); navigator.vibrate?.(30); } catch { setListening(false); }
  };
  const stopTalk = () => { recRef.current?.stop(); };

  const confirm = () => {
    const qty = Number(review.quantity);
    if (!review.name.trim() || !Number.isInteger(qty) || qty < 1) { setError(t("qtyMissing")); return; }
    const existing = lookup?.found ? lookup.product : null;
    setRows((r) => [...r, {
      key: `${Date.now()}-${Math.random()}`, code, name: review.name.trim(), quantity: qty, unit: review.unit.trim(),
      description: review.description.trim(), expiryDate: "", remarks: "", existing: Boolean(existing)
    }]);
    setReview(null); setHeard(""); setTyped(""); setCode(""); setLookup(null); setError("");
  };

  const updateRow = (key, patch) => setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const saveAll = async () => {
    setSaving(true); setError("");
    try {
      const items = rows.map(({ code: c, name, quantity, unit, description, expiryDate, remarks }) => ({ code: c, name, quantity: Number(quantity), unit, description, expiryDate, remarks }));
      const r = await request("/v1/stock/in/batch", { method: "POST", body: JSON.stringify({ items }) });
      notify(t("pttSaved", { n: r.items.length }));
      setRows([]);
      await load();
    } catch (e) { setError(t.err(e)); } finally { setSaving(false); }
  };

  return <div className="ptt-page">
    <div className="scanhero"><span className="scanheroicon"><Mic size={25} /></span><div><div className="overline">{t("pttOverline")}</div><h1>{t("pttTitle")}</h1><p>{t("pttSub")}</p></div></div>

    <div className="ptt-grid">
      <div className="panel ptt-steps">
        <div className="ptt-step">
          <div className="stepnum">1</div>
          <div className="grow">
            <b>{t("step1")}</b>
            <div className="input-with-button">
              <input value={code} onChange={(e) => { setCode(e.target.value); setLookup(null); }} onBlur={(e) => checkCode(e.target.value)} placeholder={t("typeCodePh")} aria-label={t("codeLabel")} />
              <button type="button" className="secondary" onClick={() => setScanning(true)}><ScanLine size={16} />{t("scan")}</button>
            </div>
            <small className={`codestate ${lookup?.found ? "found" : code ? "new" : ""}`}>
              {!code ? t("noCode") : lookup?.found ? t("existingProduct", { name: lookup.product.name, qty: lookup.product.quantity, unit: lookup.product.unit }) : lookup ? t("newProduct") : "…"}
            </small>
          </div>
        </div>

        <div className="ptt-step">
          <div className="stepnum">2</div>
          <div className="grow">
            <b>{t("step2")}</b>
            <div className="voice-lang">
              <span>{t("voiceLang")}</span>
              <button type="button" className={voiceLang === "my-MM" ? "chip active" : "chip"} onClick={() => setVoiceLang("my-MM")}>မြန်မာ</button>
              <button type="button" className={voiceLang === "en-US" ? "chip active" : "chip"} onClick={() => setVoiceLang("en-US")}>English</button>
            </div>
            {SpeechRecognition ? <>
              <button type="button" className={`talk-button ${listening ? "on" : ""}`} disabled={processing}
                onPointerDown={startTalk} onPointerUp={stopTalk} onPointerCancel={stopTalk} onContextMenu={(e) => e.preventDefault()}
                onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) startTalk(e); }} onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") stopTalk(); }}>
                <Mic size={30} /><span>{processing ? t("processing") : listening ? t("listening") : t("holdToTalk")}</span>
              </button>
              <small className="muted center">{heard || t("speakExample")}</small>
            </> : <div className="hint">{t("speechUnsupported")}</div>}
            <form className="inline-form" onSubmit={(e) => { e.preventDefault(); parse(typed); }}>
              <span className="typed-icon"><Keyboard size={16} /></span>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t("typeInsteadPh")} aria-label={t("typeInstead")} />
              <button className="secondary" disabled={!typed.trim() || processing}>{t("readText")}</button>
            </form>
          </div>
        </div>

        <div className="ptt-step">
          <div className="stepnum">3</div>
          <div className="grow">
            <b>{t("step3")}</b>
            {review ? <div className="review-card">
              <div className="transcript"><small>{t("transcript")}</small>“{review.transcript}”</div>
              <small className="muted">{t("reviewHint")}</small>
              <Input label={t("name")} value={review.name} onChange={(v) => setReview({ ...review, name: v })} />
              <div className="formgrid three">
                <Input label={t("qty")} value={review.quantity} onChange={(v) => setReview({ ...review, quantity: v })} type="number" min={1} step={1} />
                <Input label={t("unit")} value={review.unit} onChange={(v) => setReview({ ...review, unit: v })} />
              </div>
              <Input label={t("description")} value={review.description} onChange={(v) => setReview({ ...review, description: v })} />
              <div className="formactions"><button type="button" className="secondary" onClick={() => { setReview(null); setHeard(""); }}><RotateCcw size={15} />{t("retry")}</button><button type="button" className="primary" onClick={confirm}><Check size={15} />{t("confirmItem")}</button></div>
            </div> : <div className="empty small">{t("speakExample")}</div>}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panelhead"><div><h3>{t("reviewTable")}</h3><p>{t("reviewTableSub")}</p></div></div>
        {rows.length ? <div className="tablewrap"><table className="edit-table">
          <thead><tr><th>{t("colCode")}</th><th>{t("colProduct")}</th><th>{t("colQty")}</th><th>{t("unit")}</th><th>{t("expiryDate")}</th><th>{t("remarks")}</th><th></th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.key}>
            <td><small>{r.code || "—"}</small><span className={`badge ${r.existing ? "blue" : "green"}`}>{t(r.existing ? "updateBadge" : "newBadge")}</span></td>
            <td><input value={r.name} onChange={(e) => updateRow(r.key, { name: e.target.value })} /></td>
            <td><input className="num" type="number" min={1} step={1} value={r.quantity} onChange={(e) => updateRow(r.key, { quantity: e.target.value })} /></td>
            <td><input className="short" value={r.unit} onChange={(e) => updateRow(r.key, { unit: e.target.value })} /></td>
            <td><input type="date" value={r.expiryDate} onChange={(e) => updateRow(r.key, { expiryDate: e.target.value })} /></td>
            <td><input value={r.remarks} onChange={(e) => updateRow(r.key, { remarks: e.target.value })} placeholder={t("remarksPh")} /></td>
            <td><button type="button" className="iconbutton" title={t("remove")} onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))}><Trash2 size={15} /></button></td>
          </tr>)}</tbody>
        </table></div> : <div className="empty">{t("tableEmpty")}</div>}
        <div className="modalfoot"><button type="button" className="primary" disabled={!rows.length || saving} onClick={saveAll}><Save size={16} />{saving ? t("saving") : t("saveAll", { n: rows.length })}</button></div>
      </div>
    </div>
    {scanning && <Scanner onDetected={(c) => { setScanning(false); checkCode(c); }} onClose={() => setScanning(false)} />}
  </div>;
}
