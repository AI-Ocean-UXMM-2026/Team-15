import React, { createContext, useContext } from "react";
import { translate, formatNumber, categoryKey } from "./text.ts";

// Same-origin by default: Vite proxies /v1 to the local API in dev, and Vercel rewrites it in production.
export const API = import.meta.env.VITE_API_URL || "";

export class ApiError extends Error {
  constructor(message, code, status) { super(message); this.code = code; this.status = status; }
}

export async function apiRequest(path, { token, ...options } = {}) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
    });
  } catch {
    throw new ApiError("Network error", "NETWORK", 0);
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.message || `Request failed (${res.status})`, body.error || "ERROR", res.status);
  return body;
}

// ---------- i18n ----------
export const I18n = createContext({ lang: "en", setLang: () => {} });

export function useT() {
  const { lang } = useContext(I18n);
  const t = (key, vars) => {
    if (!vars) return translate(lang, key);
    const v = {};
    for (const [k, val] of Object.entries(vars)) v[k] = typeof val === "number" ? formatNumber(lang, val) : val;
    return translate(lang, key, v);
  };
  t.lang = lang;
  t.num = (n) => formatNumber(lang, n);
  t.cat = (c) => { const k = categoryKey(c); const s = translate(lang, k); return s === k ? c : s; };
  // Prefer a translated message for known API error codes, otherwise show the server's message.
  t.err = (e) => {
    const key = `err_${e?.code}`;
    const s = translate(lang, key);
    return s !== key ? s : e?.message || translate(lang, "error");
  };
  t.date = (d) => (d ? new Date(d).toLocaleDateString(lang === "my" ? "my-MM" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
  t.dateTime = (d) => (d ? new Date(d).toLocaleString(lang === "my" ? "my-MM" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
  return t;
}

// ---------- shared app state ----------
export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

// ---------- small UI helpers ----------
export function Field({ label, children, hint }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small className="fieldhint">{hint}</small>}</label>;
}
export function Input({ label, value, onChange, hint, ...props }) {
  return <Field label={label} hint={hint}><input value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...props} /></Field>;
}

export function StatusBadge({ product }) {
  const t = useT();
  if (product.orderStatus) return <span className="badge blue">{t(`status_${product.orderStatus}`)}</span>;
  const cls = { IN_STOCK: "green", LOW_STOCK: "amber", OUT_OF_STOCK: "red" }[product.status] || "green";
  return <span className={`badge ${cls}`}>{t(`status_${product.status || "IN_STOCK"}`)}</span>;
}

export function expiryLabel(t, dateStr) {
  if (!dateStr) return "—";
  const days = Math.round((new Date(dateStr) - new Date(new Date().toISOString().slice(0, 10))) / 86_400_000);
  if (days < 0) return t("expiredAgo", { n: -days });
  if (days === 0) return t("expiresToday");
  return t("daysLeft", { n: days });
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Shrinks a photo in the browser so it fits comfortably in a MongoDB document. */
export function resizeImage(file, max = 1000, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
    img.src = url;
  });
}

export const CATEGORIES = ["Food & Beverage", "Household", "Personal Care", "Stationery", "Electronics", "Hardware", "Medical Supplies", "Packaging", "Agriculture", "Other"];
