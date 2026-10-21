import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { LayoutDashboard, Home, Boxes, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Bell, History as HistoryIcon, RefreshCw, LogOut, Languages, Package, AlertTriangle, CheckCircle2, Warehouse, Mic, ScanLine, Settings as SettingsIcon, Truck, Plus, X } from "lucide-react";
import { I18n, AppCtx, useT, apiRequest, Input } from "./lib.jsx";
import { Dashboard, Inventory, ScanPage, StockMovement, Count, Orders, Alerts, History, Settings } from "./pages.jsx";
import PushToTalk from "./components/PushToTalk.jsx";
import ProductForm from "./components/ProductForm.jsx";
import ProductDetail from "./components/ProductDetail.jsx";
import ReorderDialog from "./components/ReorderDialog.jsx";
import "./style.css";
import "./features.css";

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } }
};

const NAV = [
  ["dashboard", LayoutDashboard], ["inventory", Boxes], ["ptt", Mic], ["receive", ArrowDownToLine], ["dispatch", ArrowUpFromLine],
  ["orders", Truck], ["alerts", Bell], ["history", HistoryIcon], ["count", ClipboardCheck]
];
const MOBILE_NAV = [["dashboard", Home, "home"], ["inventory", Boxes, "inventory"], ["scan", ScanLine, "scan"], ["alerts", Bell, "alerts"], ["history", HistoryIcon, "history"]];

function Root() {
  const [lang, setLangState] = useState(store.get("invento-lang") || "my");
  const setLang = (v) => { setLangState(v); store.set("invento-lang", v); document.documentElement.lang = v; };
  useEffect(() => { document.documentElement.lang = lang; }, []);
  return <I18n.Provider value={{ lang, setLang }}><App /></I18n.Provider>;
}

function LanguageButton({ className = "iconbutton" }) {
  const t = useT();
  const { setLang } = React.useContext(I18n);
  return <button type="button" className={className} title={t("changeLanguage")} onClick={() => setLang(t.lang === "en" ? "my" : "en")}><Languages size={16} />{t.lang === "en" ? "မြန်မာ" : "English"}</button>;
}

function Login({ onAuth }) {
  const t = useT();
  const [mode, setMode] = useState("login");
  const [login, setLogin] = useState({ email: "demo@invento.local", password: "InventoDemo!2026" });
  const [reg, setReg] = useState({ name: "", email: "", password: "", warehouseName: "", location: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await apiRequest(mode === "login" ? "/v1/auth/login" : "/v1/auth/register", { method: "POST", body: JSON.stringify(mode === "login" ? login : reg) });
      onAuth(r);
    } catch (err) { setError(t.err(err)); } finally { setBusy(false); }
  };
  const isLogin = mode === "login";
  return <div className="loginpage">
    <div className="login-art"><div className="logo"><span className="logoicon">in</span><span>INVENTO<small>{t("appTagline")}</small></span></div>
      <div className="loginheadline">{t("loginHeadline1")}<br /><em>{t("loginHeadline2")}</em></div><p>{t("loginIntro")}</p>
      <div className="artstats"><div><b>{t.num("05")}</b><span>{t("statDemoProducts")}</span></div><div><b>{t.num("01")}</b><span>{t("statWarehouse")}</span></div><div><b>24/7</b><span>{t("statVisibility")}</span></div></div>
      <div className="loginfoot">{t("loginFoot")}</div></div>
    <form className="loginbox" onSubmit={submit}>
      <LanguageButton className="language" />
      <div className="overline">{t("welcomeTo")}</div><h1>{isLogin ? t("signIn") : t("createAccount")}</h1>
      <p className="sub">{isLogin ? t("signInSub") : t("registerSub")}</p>
      <div className="auth-tabs"><button type="button" className={isLogin ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("login"); setError(""); }}>{t("tabLogin")}</button><button type="button" className={!isLogin ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("register"); setError(""); }}>{t("tabRegister")}</button></div>
      {error && <div className="errorbox">{error}</div>}
      {!isLogin && <>
        <Input label={t("fullName")} value={reg.name} onChange={(v) => setReg({ ...reg, name: v })} required autoComplete="name" placeholder={t("fullNamePh")} />
        <Input label={t("warehouseName")} value={reg.warehouseName} onChange={(v) => setReg({ ...reg, warehouseName: v })} required placeholder={t("warehouseNamePh")} />
        <Input label={t("warehouseLocation")} value={reg.location} onChange={(v) => setReg({ ...reg, location: v })} placeholder={t("locationPh")} />
      </>}
      <Input label={t("email")} value={isLogin ? login.email : reg.email} onChange={(v) => isLogin ? setLogin({ ...login, email: v }) : setReg({ ...reg, email: v })} type="email" required autoComplete="email" placeholder={t("emailPh")} />
      <Input label={t("password")} value={isLogin ? login.password : reg.password} onChange={(v) => isLogin ? setLogin({ ...login, password: v }) : setReg({ ...reg, password: v })} type="password" required minLength={isLogin ? undefined : 10} autoComplete={isLogin ? "current-password" : "new-password"} placeholder={isLogin ? t("passwordPh") : t("passwordMinPh")} />
      <button className="primary wide" disabled={busy}>{busy ? (isLogin ? t("signingIn") : t("creatingAccount")) : (isLogin ? t("signInBtn") : t("createAccountBtn"))}</button>
      {isLogin ? <><div className="demohint">{t("demo")}</div><div className="security"><span>🔒</span> {t("privateNote")}</div></> : <div className="security"><span>🔒</span> {t("registerNote")}</div>}
    </form>
  </div>;
}

function AddChoice({ onTyping, onPtt, onClose }) {
  const t = useT();
  return <div className="modal add-choice-modal">
    <div className="modalhead"><div><div className="overline">{t("catalog")}</div><h3>{t("addTitle")}</h3></div><button type="button" className="iconbutton" title={t("close")} onClick={onClose}><X /></button></div>
    <div className="modalbody"><h3 className="choice-title">{t("howAdd")}</h3><p className="choice-subtitle">{t("howAddSub")}</p>
      <button type="button" className="add-choice featured" onClick={onPtt}><span className="choice-icon"><Mic size={23} /></span><span><b>{t("ptt")} <em className="tag">{t("fastest")}</em></b><small>{t("choicePttSub")}</small></span><span className="choice-chevron">›</span></button>
      <button type="button" className="add-choice" onClick={onTyping}><span className="choice-icon"><Package size={23} /></span><span><b>{t("choiceTyping")}</b><small>{t("choiceTypingSub")}</small></span><span className="choice-chevron">›</span></button>
    </div>
  </div>;
}

function App() {
  const t = useT();
  const [token, setToken] = useState(store.get("invento-token") || "");
  const [user, setUser] = useState(null);
  const [warehouse, setWarehouse] = useState(null);
  const [page, setPageState] = useState("dashboard");
  const [data, setData] = useState({ products: [], dashboard: null, movements: [], alerts: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [add, setAdd] = useState(null); // null | { mode: "choice" | "manual", preset }
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [reorderFor, setReorderFor] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [pttCode, setPttCode] = useState("");
  const [pttRows, setPttRows] = useState([]);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const logout = () => { store.set("invento-token", null); setToken(""); setUser(null); setWarehouse(null); setPttRows([]); };
  const request = async (path, options = {}) => {
    try { return await apiRequest(path, { ...options, token }); }
    catch (e) { if (e.status === 401) logout(); throw e; }
  };
  const load = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const [me, products, dashboard, movements, alerts] = await Promise.all([
        request("/v1/me"), request("/v1/products"), request("/v1/dashboard"), request("/v1/movements"), request("/v1/alerts")
      ]);
      setUser(me.user); setWarehouse(me.warehouse);
      setData({ products: products.items || [], dashboard, movements: movements.items || [], alerts: alerts.items || [] });
    } catch (e) { setError(t.err(e)); } finally { setBusy(false); }
  };
  useEffect(() => { load(); }, [token]);

  const setPage = (p) => { setPageState(p); setError(""); setNotice(""); window.scrollTo?.(0, 0); };
  const notify = (msg) => { setNotice(msg); setError(""); };
  const ctx = useMemo(() => ({
    token, user, warehouse, setWarehouse, data, load, request, setPage, notify, setError, logout, prefill, setPrefill,
    pttRows, setPttRows, setPttCode,
    openAdd: (opts) => setAdd({ mode: opts?.mode || "choice", preset: opts?.barcode ? { barcode: opts.barcode } : null }),
    openProduct: (id) => setDetailId(id),
    openReorder: (p) => setReorderFor(p),
    openEdit: (p) => request(`/v1/products/${p.id}`).then(setEditing).catch((e) => setError(t.err(e)))
  }), [token, user, warehouse, data, prefill, pttRows, t.lang]);

  if (!token) return <Login onAuth={(r) => { store.set("invento-token", r.token); setToken(r.token); setUser(r.user); setWarehouse(r.warehouse); }} />;

  const title = page === "dashboard" ? t("welcome") : t(page);
  return <AppCtx.Provider value={ctx}>
    <div className={t.lang === "my" ? "app langmy" : "app"}>
      <aside className="sidebar">
        <div className="logo"><span className="logoicon">in</span><span>INVENTO<small>{t("appTagline")}</small></span></div>
        <div className="warehousepill"><Warehouse size={17} /><span><b>{warehouse?.name || "—"}</b><small>{warehouse?.location || "Myanmar"}</small></span></div>
        <button className="primary add-side" onClick={() => ctx.openAdd()}><Plus size={17} />{t("qaAdd")}</button>
        <div className="navlabel">{t("workspace")}</div>
        {NAV.map(([key, Icon]) => <button key={key} className={`navitem ${page === key ? "active" : ""}`} onClick={() => setPage(key)}><Icon size={18} /><span>{t(key)}</span>
          {key === "alerts" && data.alerts.length > 0 && <i>{t.num(data.alerts.length)}</i>}
          {key === "ptt" && pttRows.length > 0 && <i className="mint-i">{t.num(pttRows.length)}</i>}</button>)}
        <div className="sidebottom">
          <button className={`navitem ${page === "settings" ? "active" : ""}`} onClick={() => setPage("settings")}><SettingsIcon size={18} /><span>{t("settings")}</span></button>
          <div className="profile"><div className="avatar">{(user?.name || "O").slice(0, 1).toUpperCase()}</div><div className="profiletext"><b>{user?.name || "—"}</b><small>{t(`role_${user?.role || "OWNER"}`)}</small></div><button title={t("logout")} onClick={logout}><LogOut size={17} /></button></div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div><div className="breadcrumb">{t("breadcrumbWorkspace")} <span>/</span> {t(page)}</div><h2>{title}</h2></div>
          <div className="topactions">
            <span className={`live ${online ? "" : "off"}`}><i></i> {online ? t("connected") : t("offline")}</span>
            <LanguageButton />
            <button className="iconbutton" title={t("refresh")} onClick={load}><RefreshCw size={17} /></button>
            <button className="iconbutton mobile-only" title={t("settings")} onClick={() => setPage("settings")}><SettingsIcon size={17} /></button>
            <div className="avatar">{(user?.name || "O").slice(0, 1).toUpperCase()}</div>
          </div>
        </header>
        <section className="content">
          {error && <div className="errorbox"><AlertTriangle size={17} />{error}<button onClick={() => setError("")}>×</button></div>}
          {notice && <div className="successbox"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice("")}>×</button></div>}
          {busy && <div className="busyline"></div>}
          {page === "dashboard" && <Dashboard />}
          {page === "inventory" && <Inventory />}
          {page === "scan" && <ScanPage />}
          {page === "ptt" && <PushToTalk key={pttCode} initialCode={pttCode} />}
          {page === "receive" && <StockMovement type="in" key="in" />}
          {page === "dispatch" && <StockMovement type="out" key="out" />}
          {page === "count" && <Count />}
          {page === "orders" && <Orders />}
          {page === "alerts" && <Alerts />}
          {page === "history" && <History />}
          {page === "settings" && <Settings />}
        </section>
      </main>
      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        {MOBILE_NAV.slice(0, 2).map(([key, Icon, label]) => <MobileTab key={key} k={key} Icon={Icon} label={t(label)} page={page} setPage={setPage} />)}
        <button className="mobile-add" onClick={() => ctx.openAdd()} aria-label={t("qaAdd")}><Plus size={26} /></button>
        {MOBILE_NAV.slice(2).map(([key, Icon, label]) => <MobileTab key={key} k={key} Icon={Icon} label={t(label)} page={page} setPage={setPage} badge={key === "alerts" ? data.alerts.length : 0} />)}
      </nav>
      {add && <div className="modalback" onMouseDown={(e) => { if (e.target === e.currentTarget) setAdd(null); }}>
        {add.mode === "choice"
          ? <AddChoice onClose={() => setAdd(null)} onTyping={() => setAdd({ mode: "manual", preset: null })} onPtt={() => { setAdd(null); setPttCode(""); setPage("ptt"); }} />
          : <ProductForm preset={add.preset} onCancel={() => setAdd(add.preset ? null : { mode: "choice" })} onDone={(p) => { setAdd(null); setDetailId(p.id); }} />}
      </div>}
      {editing && <div className="modalback" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null); }}><ProductForm product={editing} onCancel={() => setEditing(null)} onDone={(p) => { setEditing(null); setDetailId(p.id); }} /></div>}
      {detailId && <ProductDetail key={detailId} id={detailId} onClose={() => setDetailId(null)} />}
      {reorderFor && <ReorderDialog product={reorderFor} onClose={() => setReorderFor(null)} />}
    </div>
  </AppCtx.Provider>;
}

function MobileTab({ k, Icon, label, page, setPage, badge }) {
  const t = useT();
  return <button className={`mobile-tab ${page === k ? "active" : ""}`} onClick={() => setPage(k)} aria-current={page === k ? "page" : undefined}>
    <Icon size={21} strokeWidth={page === k ? 2.4 : 1.8} /><span>{label}</span>{badge > 0 && <i>{t.num(badge)}</i>}</button>;
}

createRoot(document.getElementById("root")).render(<Root />);
