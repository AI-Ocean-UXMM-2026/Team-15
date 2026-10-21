import React, { useState } from "react";
import { Send, MessageCircle, Smartphone, Copy } from "lucide-react";
import { useT, messageLinks, shareText } from "../lib.jsx";

/** One-tap order message to the supplier through the apps Myanmar businesses actually use. */
export default function SupplierMessage({ text, phone, onSent }) {
  const t = useT();
  const [status, setStatus] = useState("");
  const links = messageLinks(phone, text);
  const done = (s) => { setStatus(s); onSent?.(); };
  return <div className="supplier-msg">
    <div className="msg-bubble">{text}</div>
    <div className="msg-actions">
      <button type="button" className="primary" onClick={async () => { const r = await shareText(text); if (r !== "cancelled") done(r); }}><Send size={15} />{t("shareOrder")}</button>
      <a className="secondary viber" href={links.viber} onClick={() => done("viber")}><MessageCircle size={15} />Viber</a>
      <a className="secondary telegram" href={links.telegram} target="_blank" rel="noreferrer" onClick={() => done("telegram")}><Send size={15} />Telegram</a>
      <a className="secondary" href={links.sms} onClick={() => done("sms")}><Smartphone size={15} />SMS</a>
      <button type="button" className="textbutton" onClick={async () => { try { await navigator.clipboard.writeText(text); setStatus("copied"); } catch { /* ignore */ } }}><Copy size={15} />{t("copyText")}</button>
    </div>
    {status === "copied" && <small className="fieldhint">{t("copiedHint")}</small>}
  </div>;
}
