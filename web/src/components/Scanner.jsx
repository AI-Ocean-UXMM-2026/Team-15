import React, { useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";
import { useT } from "../lib.jsx";

/** Camera barcode / QR scanner in a modal, with manual code entry as a fallback. */
export default function Scanner({ onDetected, onClose }) {
  const t = useT();
  const videoRef = useRef(null);
  const [state, setState] = useState("starting");
  const [code, setCode] = useState("");

  useEffect(() => {
    let controls, cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera API");
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          videoRef.current,
          (result, _err, ctl) => {
            if (result && !cancelled) {
              cancelled = true;
              ctl.stop();
              navigator.vibrate?.(60);
              onDetected(result.getText().trim());
            }
          }
        );
        if (cancelled) controls.stop(); else setState("live");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();
    return () => { cancelled = true; controls?.stop(); };
  }, []);

  const submit = (e) => { e.preventDefault(); if (code.trim()) onDetected(code.trim()); };

  return <div className="modalback" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal">
      <div className="modalhead"><div><div className="overline">{t("scan").toUpperCase()}</div><h3>{t("scannerTitle")}</h3></div><button type="button" className="iconbutton" title={t("close")} onClick={onClose}><X /></button></div>
      <div className="modalbody">
        <p className="choice-subtitle">{t("scannerSub")}</p>
        <div className="scanner-frame live-frame">
          <video ref={videoRef} muted playsInline className={state === "live" ? "" : "hidden"} />
          {state !== "live" && <div className="scanner-corner"><ScanLine size={42} /><b>{state === "starting" ? t("cameraStarting") : t("cameraDenied")}</b></div>}
          {state === "live" && <div className="scan-guide" />}
        </div>
        <form className="inline-form" onSubmit={submit}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("typeCodePh")} inputMode="text" autoFocus={state === "denied"} />
          <button className="primary" disabled={!code.trim()}>{t("useCode")}</button>
        </form>
      </div>
    </div>
  </div>;
}
