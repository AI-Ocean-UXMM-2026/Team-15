import React, { useEffect, useMemo, useState } from "react";
import {
  Package, Home, Plus, Truck, Settings as SettingsIcon, Bell, ArrowLeft, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Mic,
  ChevronRight, MapPin, Check, AlertTriangle, Search, Sun, Sunset, Moon, Sparkles, Phone, MessageCircle, Send, Smartphone,
  Globe, History as HistoryIcon, Warehouse, Clock, QrCode, Pencil, Archive, Minus, LogOut, CalendarClock, Droplets, Wheat,
  Egg, Soup, Leaf, ShoppingBag, Apple, X
} from "lucide-react";
import { useT, useApp, AppCtx, ExpiryInput, expiryLabel, runOutLabel, todayISO, orderMessage, messageLinks, shareText, CATEGORIES } from "../lib.jsx";
import { I18n } from "../lib.jsx";
import PushToTalk from "../components/PushToTalk.jsx";
import OrderStatusSelect from "../components/OrderStatusSelect.jsx";
import { ScanPage } from "../pages.jsx";
import "./mobile.css";

const ROOTS = ["home", "inventory", "suppliers", "settings"];

// ---------- small building blocks (prototype markup) ----------
function art(p) {
  const n = `${p.name} ${p.category}`.toLowerCase();
  if (/oil|ဆီ/.test(n)) return ["oil", Droplets];
  if (/noodle|ခေါက်ဆွဲ/.test(n)) return ["noodles", Soup];
  if (/water|ရေ/.test(n)) return ["water", Droplets];
  if (/bread|ပေါင်မုန့်|cake/.test(n)) return ["bread", Wheat];
  if (/tea|လက်ဖက်/.test(n)) return ["tea", Leaf];
  if (/egg|ကြက်ဥ/.test(n)) return ["egg", Egg];
  if (/tomato|vegetable|fruit|agriculture|ခရမ်း/.test(n)) return ["veg", Apple];
  if (/rice|ဆန်|powder|bag/.test(n)) return ["", ShoppingBag];
  return ["", Package];
}
function Art({ p }) {
  const [cls, Icon] = art(p);
  return <span className={`m-art ${cls}`}>{p.photos?.[0] ? <img src={p.photos[0]} alt="" /> : <Icon size={25} strokeWidth={1.4} />}</span>;
}
function stateOf(p) {
  if (p.orderStatus) return ["m-violet", Truck, `status_${p.orderStatus}`];
  if (p.status === "OUT_OF_STOCK") return ["m-bad", AlertTriangle, "status_OUT_OF_STOCK"];
  if (p.status === "LOW_STOCK") return ["m-warning", AlertTriangle, "status_LOW_STOCK"];
  return ["m-good", Check, "status_IN_STOCK"];
}
function ProductCard({ p, onClick, extra }) {
  const t = useT();
  const [cls, Icon, key] = stateOf(p);
  return <button className="m-product" onClick={onClick}>
    <Art p={p} />
    <span className="m-grow"><h3>{p.name}</h3><span className="m-meta">{p.sku} · {t.cat(p.category)}</span>
      <span className={`m-state ${cls}`}><Icon size={11} />{t(key)}{extra ? <span className="m-violet"> · {extra}</span> : null}</span></span>
    <span className="m-stock"><strong>{t.num(p.quantity)}</strong><small>{p.unit}</small></span>
  </button>;
}
function Section({ title, badge, onAll }) {
  const t = useT();
  return <div className="m-section"><h3>{title}{badge !== undefined && <span className="m-count">{t.num(badge)}</span>}</h3>
    {onAll && <button className="m-text-btn" onClick={onAll}>{t("viewAll")}<ChevronRight size={15} /></button>}</div>;
}
function Heading({ title, desc }) {
  return <><h1 className="m-page-title">{title}</h1>{desc && <p className="m-page-desc">{desc}</p>}</>;
}
function Empty({ icon: Icon = Package, title, desc }) {
  return <div className="m-empty"><Icon size={43} strokeWidth={1.4} /><h3>{title}</h3>{desc && <p>{desc}</p>}</div>;
}
function Chips({ value, onChange, items }) {
  const t = useT();
  return <div className="m-chips">{items.map(([v, key]) => <button key={v} className={`m-chip ${value === v ? "active" : ""}`} onClick={() => onChange(v)}>{t(key)}</button>)}</div>;
}
function SearchBox({ value, onChange, placeholder }) {
  return <label className="m-search"><Search size={19} /><input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>;
}
const Kv = ({ label, value }) => <div className="m-kv"><span>{label}</span><strong>{value || "—"}</strong></div>;
function Activity({ m }) {
  const t = useT();
  const Icon = m.type === "OUT" ? ArrowUpFromLine : m.type === "COUNT_ADJUSTMENT" ? ClipboardCheck : ArrowDownToLine;
  return <div className="m-activity"><span className={`m-activity-icon ${m.type === "OUT" ? "out" : ""}`}><Icon size={18} /></span>
    <span className="m-grow"><strong>{m.productName}</strong><p>{t(`mv_${m.type}`)} · {t.dateTime(m.createdAt)}</p></span>
    <span className={`m-delta ${m.delta >= 0 ? "m-good" : "m-warning"}`}>{m.delta > 0 ? "+" : ""}{t.num(m.delta)}</span></div>;
}
function Greeting({ name }) {
  const t = useT();
  const h = new Date().getHours();
  const part = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const Icon = part === "morning" ? Sun : part === "afternoon" ? Sunset : Moon;
  return <h1 className="m-greeting">{t(`greet_${part}`, { name: (name || "").split(" ")[0] })}<span className="m-sun"><Icon size={20} /></span></h1>;
}

// ---------- screens ----------
function HomeScreen({ go }) {
  const t = useT();
  const { data, warehouse, user } = useApp();
  const attention = useMemo(() => {
    const ids = [...new Set(data.alerts.filter((a) => a.type !== "RUNNING_OUT").map((a) => a.productId))];
    return ids.map((id) => data.products.find((p) => p.id === id)).filter(Boolean);
  }, [data]);
  const forecast = data.dashboard?.runningOut || [];
  const date = new Date().toLocaleDateString(t.lang === "my" ? "my-MM" : "en-GB", { day: "numeric", month: "short" });
  return <>
    <div className="m-row m-between"><span className="m-overline">{t("readyToday")}</span><span className="m-date-pill">{date}</span></div>
    <Greeting name={user?.name} />
    <p className="m-subline"><MapPin size={13} />{warehouse?.name} · {(warehouse?.location || "").split(",")[0]}</p>
    <div className="m-stats">
      <button className="m-stat" onClick={() => go("inventory")}><div className="m-stat-top"><strong>{t.num(data.products.length)}</strong><Package size={18} /></div><span>{t("products")}</span></button>
      <button className="m-stat attention" onClick={() => go("alerts")}><div className="m-stat-top"><strong>{t.num(attention.length)}</strong><Bell size={18} /></div><span>{t("needAttention")}</span></button>
    </div>
    <div className="m-quick">
      <button onClick={() => go("movement", { mode: "in" })}><ArrowDownToLine size={21} />{t("qaReceive")}</button>
      <button onClick={() => go("movement", { mode: "out" })}><ArrowUpFromLine size={21} />{t("qaShip")}</button>
      <button onClick={() => go("movement", { mode: "count" })}><ClipboardCheck size={21} />{t("countShort")}</button>
    </div>
    <button className="m-promo" onClick={() => go("ptt")}><span className="icon-tile"><Mic size={22} /></span><span><strong>{t("voicePromo")}</strong><p>{t("voicePromoHint")}</p></span><ChevronRight size={16} /></button>
    {forecast.length > 0 && <button className="m-promo violet" onClick={() => go("alerts", { filter: "forecast" })}><span className="icon-tile"><Sparkles size={20} /></span><span><strong>{t("forecastTitle")}</strong><p>{t("forecastPromo", { n: forecast.length })}</p></span><ChevronRight size={16} /></button>}
    <Section title={t("needAttention")} badge={attention.length} onAll={() => go("alerts")} />
    <div className="m-list">{attention.slice(0, 2).map((p) => <ProductCard key={p.id} p={p} onClick={() => go("product", { id: p.id })} />)}
      {!attention.length && <Empty icon={Check} title={t("noAlerts")} desc={t("allGood")} />}</div>
    <Section title={t("recent")} onAll={() => go("history")} />
    <div className="m-activity-list">{data.movements.slice(0, 2).map((m) => <Activity key={m.id} m={m} />)}
      {!data.movements.length && <Empty icon={HistoryIcon} title={t("noMovements")} />}</div>
  </>;
}

function InventoryScreen({ go }) {
  const t = useT();
  const { data, warehouse } = useApp();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const soon = todayISO() && new Date(Date.now() + (warehouse?.settings?.expiryAlertDays ?? 30) * 86_400_000).toISOString().slice(0, 10);
  const items = data.products.filter((p) => `${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(q.toLowerCase())
    && (filter === "all" || (filter === "low" && p.status === "LOW_STOCK") || (filter === "out" && p.status === "OUT_OF_STOCK") || (filter === "expiry" && p.nextExpiry && p.nextExpiry <= soon)));
  return <>
    <Heading title={t("inventory")} desc={t("inventoryHintM")} />
    <SearchBox value={q} onChange={setQ} placeholder={t("search")} />
    <Chips value={filter} onChange={setFilter} items={[["all", "allItems"], ["low", "low"], ["out", "out"], ["expiry", "expiring"]]} />
    {items.length ? <div className="m-list">{items.map((p) => <ProductCard key={p.id} p={p} onClick={() => go("product", { id: p.id })} extra={p.daysLeft !== null && p.daysLeft <= 7 ? runOutLabel(t, p) : ""} />)}</div>
      : <Empty icon={Search} title={t("noProducts")} />}
    <p className="m-caption">{t("productCount", { n: data.products.length })}</p>
  </>;
}

function ProductScreen({ id, go, setFooter }) {
  const t = useT();
  const { request, setError, notify, load, openLabels, openEdit, user } = useApp();
  const [p, setP] = useState(null);
  const [editCat, setEditCat] = useState(false);
  const refresh = () => request(`/v1/products/${id}`).then(setP).catch((e) => setError(t.err(e)));
  useEffect(() => { refresh(); }, [id]);
  useEffect(() => {
    setFooter(<>
      <div className="m-two"><button className="m-btn primary full" onClick={() => go("movement", { mode: "in", productId: id })}><ArrowDownToLine size={19} />{t("qaReceive")}</button>
        <button className="m-btn secondary full" disabled={!p || p.quantity <= 0} onClick={() => go("movement", { mode: "out", productId: id })}><ArrowUpFromLine size={19} />{t("qaShip")}</button></div>
      <button className="m-btn soft full" onClick={() => go("movement", { mode: "count", productId: id })}><ClipboardCheck size={19} />{t("countShort")}</button>
    </>);
  }, [p, t.lang]);
  if (!p) return <p className="m-caption">{t("loading")}</p>;
  const saveCategory = async (category) => {
    setEditCat(false);
    if (category === p.category) return;
    try { await request(`/v1/products/${id}`, { method: "PATCH", body: JSON.stringify({ category }) }); notify(t("productUpdated")); refresh(); load(); }
    catch (e) { setError(t.err(e)); }
  };
  const archive = async () => {
    if (!window.confirm(t("archiveConfirm", { name: p.name }))) return;
    try { await request(`/v1/products/${id}`, { method: "DELETE" }); notify(t("archived")); await load(); go("inventory"); }
    catch (e) { setError(t.err(e)); }
  };
  const batches = (p.batches || []).filter((b) => b.quantity > 0);
  return <>
    <div className="m-list"><ProductCard p={p} onClick={() => {}} /></div>
    <div className="m-section"><h3>{t("allStock")}</h3>
      {editCat ? <select className="m-pill" autoFocus defaultValue={p.category} onChange={(e) => saveCategory(e.target.value)} onBlur={() => setEditCat(false)}>{CATEGORIES.map((c) => <option key={c} value={c}>{t.cat(c)}</option>)}</select>
        : <button className="m-pill" onClick={() => setEditCat(true)} title={t("changeCategory")}>{t.cat(p.category)}</button>}</div>
    <div className="m-card">
      <Kv label={t("availableStock")} value={`${t.num(p.quantity)} ${p.unit}`} />
      <Kv label={t("threshold")} value={`${t.num(p.lowStockThreshold)} ${p.unit}`} />
      <Kv label={t("barcode")} value={p.barcode} />
      <Kv label={t("supplier")} value={p.supplier} />
      <Kv label={t("description")} value={p.description} />
      {p.shelfLifeDays > 0 && <Kv label={t("shelfLife")} value={t("shelfLifeValue", { n: p.shelfLifeDays })} />}
      {p.fdaCode && <Kv label={t("fdaCode")} value={p.fdaCode} />}
      {p.remarks && <Kv label={t("remarks")} value={p.remarks} />}
    </div>
    {p.dailyUsage > 0 && <div className={`m-notice ${p.daysLeft <= 7 ? "warning" : ""}`}><Sparkles size={18} /><span><strong>{runOutLabel(t, p)}</strong><br />{t("usagePerDay", { n: p.dailyUsage, unit: p.unit })}{p.suggestedOrder > 0 ? ` · ${t("suggestOrder", { n: p.suggestedOrder, unit: p.unit })}` : ""}</span></div>}
    {batches.map((b) => <div className="m-card" key={b.id}><span className="m-pill">{t("batch")}{b.lotNumber ? ` · ${b.lotNumber}` : ""}</span>
      <Kv label={t("qty")} value={`${t.num(b.quantity)} ${p.unit}`} /><Kv label={t("expiryDate")} value={b.expiryDate ? `${t.date(b.expiryDate)} · ${expiryLabel(t, b.expiryDate)}` : "—"} /></div>)}
    <div className="m-status"><OrderStatusSelect product={p} order={p.activeReorder} onReorder={() => go("reorder", { id })} onChanged={refresh} /></div>
    <button className="m-btn secondary full" onClick={() => go("reorder", { id })}><Truck size={19} />{t("reorder")}</button>
    <div className="m-row m-between" style={{ marginTop: 6 }}>
      <button className="m-text-btn" onClick={() => openEdit(p)}><Pencil size={15} />{t("editProduct")}</button>
      <button className="m-text-btn" onClick={() => openLabels([p.id])}><QrCode size={15} />{t("printLabel")}</button>
      {user?.role === "OWNER" && <button className="m-text-btn m-bad" onClick={archive}><Archive size={15} />{t("archive")}</button>}
    </div>
  </>;
}

function ContactRows({ phone, text }) {
  const t = useT();
  const links = messageLinks(phone, text);
  const tel = (phone || "").replace(/[^\d+]/g, "");
  return <div>
    {phone && <a className="m-contact-row" href={`tel:${tel}`}><span className="m-contact-icon"><Phone size={18} /></span><span className="m-grow"><strong>{phone}</strong><small>{t("callToOrder")}</small></span><ChevronRight size={16} /></a>}
    <a className="m-contact-row" href={links.viber}><span className="m-contact-icon viber"><MessageCircle size={18} /></span><span className="m-grow"><strong>Viber</strong><small>{t("sendOrderMsg")}</small></span><ChevronRight size={16} /></a>
    <a className="m-contact-row" href={links.telegram} target="_blank" rel="noreferrer"><span className="m-contact-icon telegram"><Send size={18} /></span><span className="m-grow"><strong>Telegram</strong><small>{t("sendOrderMsg")}</small></span><ChevronRight size={16} /></a>
    <a className="m-contact-row" href={links.sms}><span className="m-contact-icon"><Smartphone size={18} /></span><span className="m-grow"><strong>SMS</strong><small>{t("sendOrderMsg")}</small></span><ChevronRight size={16} /></a>
    <button className="m-contact-row" onClick={() => shareText(text)}><span className="m-contact-icon"><Globe size={18} /></span><span className="m-grow"><strong>{t("shareOrder")}</strong><small>{t("shareOther")}</small></span><ChevronRight size={16} /></button>
  </div>;
}

function ReorderScreen({ id, go, setFooter }) {
  const t = useT();
  const { request, setError, notify, load, warehouse } = useApp();
  const [p, setP] = useState(null);
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => request(`/v1/products/${id}`).then((r) => { setP(r); setQty((q) => q || String(r.suggestedOrder > 0 ? r.suggestedOrder : Math.max(r.lowStockThreshold * 2 - r.quantity, 1))); }).catch((e) => setError(t.err(e)));
  useEffect(() => { refresh(); }, [id]);
  const order = p?.activeReorder;
  const create = async () => {
    setBusy(true); setError("");
    try {
      await request("/v1/reorders", { method: "POST", body: JSON.stringify({ productId: id, quantity: Number(qty), supplier: p.supplier, supplierPhone: p.supplierPhone }) });
      notify(t("orderCreated")); await refresh(); load();
    } catch (e) { setError(t.err(e)); } finally { setBusy(false); }
  };
  useEffect(() => {
    setFooter(p && !order ? <button className="m-btn primary full" disabled={busy || !(Number(qty) > 0)} onClick={create}><Truck size={19} />{busy ? t("saving") : t("orderAndSend")}</button> : null);
  }, [p, order, qty, busy, t.lang]);
  if (!p) return <p className="m-caption">{t("loading")}</p>;
  const message = orderMessage(t, { supplier: p.supplier, warehouse: warehouse?.name, product: p.name, quantity: order?.quantity || Number(qty) || 0, unit: p.unit });
  return <>
    <Heading title={t("reorderTitleM")} desc={t("reorderHintM")} />
    <div className="m-list"><ProductCard p={p} onClick={() => go("product", { id })} /></div>
    <div className="m-status"><OrderStatusSelect product={p} order={order} onReorder={create} onChanged={refresh} /></div>
    {!order && <>
      {p.suggestedOrder > 0 && <div className="m-notice" style={{ background: "#f6f1ff", color: "#6b3fa0" }}><Sparkles size={18} /><span>{t("forecastSuggest", { use: p.dailyUsage, unit: p.unit, qty: p.suggestedOrder })}</span></div>}
      <p className="m-field-heading">{t("orderQty")}</p>
      <Stepper value={qty} onChange={setQty} unit={p.unit} min={1} />
    </>}
    <div className="m-card" style={{ marginTop: 6 }}>
      <div className="m-supplier-heading"><span className="m-supplier-icon"><Truck size={22} /></span><div><h3>{p.supplier || t("noSupplierShort")}</h3><p>{p.supplierEmail || t("supplier")}</p></div></div>
      <ContactRows phone={p.supplierPhone} text={message} />
    </div>
    <div className="m-notice"><Check size={18} /><span>{t("orderHintM")}</span></div>
  </>;
}

function Stepper({ value, onChange, unit, min = 0 }) {
  const n = Number(value) || 0;
  return <div className="m-qty">
    <button type="button" onClick={() => onChange(String(Math.max(min, n - 1)))} aria-label="-"><Minus size={20} /></button>
    <div><input type="number" inputMode="numeric" min={min} value={value} onChange={(e) => onChange(e.target.value)} /><small>{unit}</small></div>
    <button type="button" onClick={() => onChange(String(n + 1))} aria-label="+"><Plus size={20} /></button>
  </div>;
}

function MovementScreen({ mode, productId, go, setFooter }) {
  const t = useT();
  const { data, request, setError, load } = useApp();
  const [pid, setPid] = useState(productId || "");
  const [q, setQ] = useState("");
  const p = data.products.find((x) => x.id === pid);
  const [f, setF] = useState({ qty: "1", reason: "", expiryDate: "", stockInDate: todayISO() });
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (p && mode === "count") setF((x) => ({ ...x, qty: String(p.quantity) })); }, [pid]);
  const qty = Number(f.qty);
  const over = mode === "out" && p && qty > p.quantity;
  const diff = mode === "count" && p ? qty - p.quantity : 0;
  const submit = async () => {
    setBusy(true); setError("");
    try {
      if (mode === "count") await request("/v1/stock/counts", { method: "POST", body: JSON.stringify({ productId: pid, countedQuantity: qty, reason: f.reason }) });
      else await request(`/v1/stock/${mode}`, { method: "POST", body: JSON.stringify({ productId: pid, quantity: qty, reason: f.reason, expiryDate: f.expiryDate, stockInDate: f.stockInDate }) });
      await load();
      setDone({ name: p.name, qty, unit: p.unit });
    } catch (e) { setError(t.err(e)); } finally { setBusy(false); }
  };
  useEffect(() => {
    if (done) setFooter(<><button className="m-btn primary full" onClick={() => go("home")}>{t("done")}</button><button className="m-btn secondary full" onClick={() => { setDone(null); setPid(""); setF({ qty: "1", reason: "", expiryDate: "", stockInDate: todayISO() }); }}>{t("anotherOne")}</button></>);
    else if (p) setFooter(<button className="m-btn primary full" disabled={busy || over || !(qty >= (mode === "count" ? 0 : 1)) || (mode === "count" && diff !== 0 && !f.reason.trim())} onClick={submit}><Check size={19} />{busy ? t("saving") : t("confirm")}</button>);
    else setFooter(null);
  }, [p, f, done, busy, t.lang]);

  const title = { in: "chooseIn", out: "chooseOut", count: "chooseCount" }[mode];
  if (done) return <div className="m-success"><span className="m-success-mark"><Check size={34} strokeWidth={2} /></span>
    <h2>{t(mode === "count" ? "countSaved" : "movementSaved")}</h2><p>{done.name} · {mode === "out" ? "-" : mode === "in" ? "+" : ""}{t.num(done.qty)} {done.unit}</p></div>;
  if (!p) {
    const list = data.products.filter((x) => `${x.name} ${x.sku} ${x.barcode}`.toLowerCase().includes(q.toLowerCase()) && (mode !== "out" || x.quantity > 0));
    return <>
      <Heading title={t(title)} desc={t("chooseHint")} />
      <SearchBox value={q} onChange={setQ} placeholder={t("search")} />
      <div className="m-list">{list.map((x) => <ProductCard key={x.id} p={x} onClick={() => setPid(x.id)} />)}</div>
      {!list.length && <Empty icon={Search} title={t("noProducts")} />}
    </>;
  }
  return <>
    <div className="m-list"><ProductCard p={p} onClick={() => setPid("")} /></div>
    <p className="m-field-heading">{t(mode === "out" ? "qtyOut" : mode === "count" ? "counted" : "qtyIn")}</p>
    <Stepper value={f.qty} onChange={(v) => setF({ ...f, qty: v })} unit={p.unit} min={mode === "count" ? 0 : 1} />
    {mode === "out" && <div className={`m-notice ${over ? "error" : ""}`}><AlertTriangle size={18} /><span>{over ? t("exceeds", { qty: p.quantity, unit: p.unit }) : t("available", { qty: p.quantity, unit: p.unit })}</span></div>}
    {mode === "count" && <div className={`m-notice ${diff ? "warning" : ""}`}><ClipboardCheck size={18} /><span>{t("systemQty")}: {t.num(p.quantity)} · {t("variance")}: {diff > 0 ? "+" : ""}{t.num(diff)}</span></div>}
    {mode === "in" && <div className="m-embed"><ExpiryInput label={t("expiryDate")} value={f.expiryDate} onChange={(v) => setF({ ...f, expiryDate: v })} base={f.stockInDate} shelfLifeDays={p.shelfLifeDays} /></div>}
    <label className="m-field"><span>{mode === "count" ? t("diffReason") : t("reason")}</span>
      <input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder={mode === "in" ? t("reasonInPh") : mode === "out" ? t("reasonOutPh") : t("diffReasonPh")} /></label>
  </>;
}

function SuppliersScreen({ go, initialTab = "contacts" }) {
  const t = useT();
  const { data, request, setError, warehouse } = useApp();
  const [tab, setTab] = useState(initialTab);
  const [only, setOnly] = useState("");
  const [orders, setOrders] = useState([]);
  const refresh = () => request("/v1/reorders").then((r) => setOrders(r.items)).catch((e) => setError(t.err(e)));
  useEffect(() => { refresh(); }, [data.dashboard]);
  // Suppliers are stored on products; group them into contact cards.
  const suppliers = useMemo(() => {
    const map = new Map();
    for (const p of data.products) {
      if (!p.supplier) continue;
      const s = map.get(p.supplier) || { name: p.supplier, phone: p.supplierPhone, email: p.supplierEmail, products: [] };
      s.phone ||= p.supplierPhone; s.email ||= p.supplierEmail; s.products.push(p);
      map.set(p.supplier, s);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data.products]);
  const shown = orders.filter((o) => !only || o.supplier === only);
  const cls = { PENDING: "warning", CONFIRM_SHIPPING: "blue", RECEIVED: "", CANCELLED: "bad" };
  return <>
    <Heading title={t("supplierTitle")} desc={t("supplierSub")} />
    <Chips value={tab} onChange={(v) => { setTab(v); setOnly(""); }} items={[["contacts", "contacts"], ["orders", "orders"]]} />
    {tab === "contacts" ? (suppliers.length ? suppliers.map((s) => <div className="m-card" key={s.name}>
      <div className="m-supplier-heading"><span className="m-supplier-icon"><Truck size={22} /></span><div><h3>{s.name}</h3><p>{t("supplierProducts", { n: s.products.length })}</p></div></div>
      <Kv label={t("contactNumber")} value={s.phone} />
      {s.email && <Kv label={t("email")} value={s.email} />}
      <Kv label={t("products")} value={s.products.map((p) => p.name).join(", ")} />
      <button className="m-text-btn" onClick={() => { setTab("orders"); setOnly(s.name); }}>{t("orders")}<ChevronRight size={15} /></button>
    </div>) : <Empty icon={Truck} title={t("noSuppliers")} desc={t("noSuppliersHint")} />)
      : (shown.length ? shown.map((o) => {
        const p = data.products.find((x) => x.id === o.productId);
        return <div className="m-card" key={o.id}>
          <div className="m-row m-between"><strong>{o.supplier || "—"}</strong><span className={`m-pill ${cls[o.status]}`}>{t(`status_${o.status}`)}</span></div>
          <div className="m-order"><h3>{o.productName}</h3><p>{t.num(o.quantity)} {o.unit} · {t.dateTime(o.createdAt)}</p>{o.note && <p>{o.note}</p>}
            {["PENDING", "CONFIRM_SHIPPING"].includes(o.status) && <>
              <div className="m-status"><OrderStatusSelect order={o} product={p} onChanged={refresh} /></div>
              <ContactRows phone={o.supplierPhone} text={orderMessage(t, { supplier: o.supplier, warehouse: warehouse?.name, product: o.productName, quantity: o.quantity, unit: o.unit })} />
            </>}
          </div></div>;
      }) : <Empty icon={Truck} title={t("noOrders")} desc={t("orderFlowHint")} />)}
  </>;
}

function SettingsScreen({ go }) {
  const t = useT();
  const { setLang } = React.useContext(I18n);
  const { logout, openLabels, data } = useApp();
  const Row = ({ icon: Icon, title, hint, onClick, danger }) => <button className={`m-settings-row ${danger ? "danger" : ""}`} onClick={onClick}>
    <span><Icon size={18} /></span><span className="m-grow"><strong>{title}</strong>{hint && <small>{hint}</small>}</span><ChevronRight size={16} /></button>;
  return <>
    <p className="m-field-heading" style={{ marginTop: 0 }}>{t("workspace")}</p>
    <div className="m-settings-card">
      <Row icon={Warehouse} title={t("myWarehouse")} hint={t("warehouseLocationHint")} onClick={() => go("warehouseSettings")} />
      <Row icon={HistoryIcon} title={t("history")} hint={t("historyRowHint")} onClick={() => go("history")} />
      <Row icon={QrCode} title={t("printLabels")} hint={t("labelsRowHint")} onClick={() => openLabels(data.products.map((p) => p.id))} />
    </div>
    <p className="m-field-heading">{t("preferences")}</p>
    <div className="m-settings-card">
      <Row icon={Globe} title={t("language")} hint="English / မြန်မာ" onClick={() => setLang(t.lang === "en" ? "my" : "en")} />
      <Row icon={Bell} title={t("alertPreferences")} hint={t("alertPreferencesHint")} onClick={() => go("alertSettings")} />
      <Row icon={CalendarClock} title={t("shelfLifeTitle")} hint={t("shelfLifeRowHint")} onClick={() => go("shelfLife")} />
    </div>
    <div className="m-settings-card"><Row icon={LogOut} title={t("logout")} onClick={logout} danger /></div>
    <p className="m-caption">Invento · v3.1</p>
  </>;
}

function WarehouseScreen({ go, setFooter }) {
  const t = useT();
  const { warehouse, setWarehouse, request, notify, setError, user } = useApp();
  const [w, setW] = useState({ name: warehouse?.name || "", location: warehouse?.location || "" });
  const save = async () => {
    try { const r = await request("/v1/warehouse", { method: "PATCH", body: JSON.stringify(w) }); setWarehouse(r); notify(t("settingsSaved")); go("settings"); }
    catch (e) { setError(t.err(e)); }
  };
  useEffect(() => { setFooter(<button className="m-btn primary full" disabled={user?.role !== "OWNER"} onClick={save}><Check size={19} />{t("saveSettings")}</button>); }, [w, t.lang]);
  return <>
    <Heading title={t("myWarehouse")} />
    <label className="m-field"><span>{t("warehouseName")}</span><input value={w.name} onChange={(e) => setW({ ...w, name: e.target.value })} /></label>
    <label className="m-field"><span>{t("location")}</span><input value={w.location} onChange={(e) => setW({ ...w, location: e.target.value })} /></label>
    <div className="m-notice"><Warehouse size={18} /><span>{t("phaseNote")}</span></div>
  </>;
}

function AlertSettingsScreen({ go, setFooter }) {
  const t = useT();
  const { warehouse, setWarehouse, data, request, notify, setError, load } = useApp();
  const [days, setDays] = useState(String(warehouse?.settings?.expiryAlertDays ?? 30));
  const [th, setTh] = useState({});
  const save = async () => {
    try {
      const r = await request("/v1/warehouse", { method: "PATCH", body: JSON.stringify({ settings: { expiryAlertDays: Number(days) } }) });
      const items = Object.entries(th).map(([id, v]) => ({ id, lowStockThreshold: Number(v) }));
      if (items.length) await request("/v1/products/thresholds", { method: "PATCH", body: JSON.stringify({ items }) });
      setWarehouse(r); notify(t("settingsSaved")); await load(); go("settings");
    } catch (e) { setError(t.err(e)); }
  };
  useEffect(() => { setFooter(<button className="m-btn primary full" onClick={save}><Check size={19} />{t("saveSettings")}</button>); }, [days, th, t.lang]);
  return <>
    <Heading title={t("alertPreferences")} desc={t("expiryDaysHint")} />
    <label className="m-field"><span>{t("expiryDays")} ({t("days")})</span><input type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} /></label>
    <div className="m-chips">{[3, 7, 14, 28, 30].map((d) => <button key={d} className={`m-chip ${Number(days) === d ? "active" : ""}`} onClick={() => setDays(String(d))}>{t.num(d)} {t("days")}</button>)}</div>
    <p className="m-field-heading">{t("productThresholds")}</p>
    <p className="m-page-desc">{t("productThresholdsSub")}</p>
    {data.products.map((p) => <label className="m-field" key={p.id}><span>{p.name} · {p.unit}</span>
      <input type="number" min={0} value={th[p.id] ?? p.lowStockThreshold} onChange={(e) => setTh({ ...th, [p.id]: e.target.value })} /></label>)}
  </>;
}

function ShelfLifeScreen({ go, setFooter }) {
  const t = useT();
  const { data, request, notify, setError, load } = useApp();
  const [v, setV] = useState({});
  const of = (p) => Number(v[p.id] ?? p.shelfLifeDays ?? 0) || 0;
  const save = async () => {
    try {
      const items = Object.entries(v).map(([id, d]) => ({ id, shelfLifeDays: Number(d) || 0 }));
      if (items.length) await request("/v1/products/thresholds", { method: "PATCH", body: JSON.stringify({ items }) });
      notify(t("settingsSaved")); await load(); go("settings");
    } catch (e) { setError(t.err(e)); }
  };
  useEffect(() => { setFooter(<button className="m-btn primary full" onClick={save}><Check size={19} />{t("saveSettings")}</button>); }, [v, t.lang]);
  return <>
    <Heading title={t("shelfLifeTitle")} desc={t("shelfLifeSub")} />
    <div className="m-notice"><CalendarClock size={18} /><span>{t("shelfLifeGuide")}</span></div>
    {data.products.map((p) => <div className="m-card" key={p.id}>
      <div className="m-row m-between"><strong style={{ fontSize: 13 }}>{p.name}</strong><span className={`m-pill ${of(p) ? "" : "blue"}`}>{of(p) ? t("shelfLifeValue", { n: of(p) }) : t("shelfNone")}</span></div>
      <div className="m-chips" style={{ margin: "10px 0 0" }}>{[0, 3, 7, 30, 180].map((d) => <button key={d} className={`m-chip ${of(p) === d ? "active" : ""}`} onClick={() => setV({ ...v, [p.id]: d })}>{d ? t("shelfLifeValue", { n: d }) : t("shelfNone")}</button>)}</div>
    </div>)}
  </>;
}

function AlertsScreen({ go, initialFilter = "all" }) {
  const t = useT();
  const { data } = useApp();
  const [filter, setFilter] = useState(initialFilter);
  const groups = useMemo(() => {
    const map = new Map();
    for (const a of data.alerts) {
      const kind = a.type === "RUNNING_OUT" ? "forecast" : a.type.startsWith("EXP") ? "expiry" : "stock";
      if (filter !== "all" && filter !== kind) continue;
      const g = map.get(a.productId) || { p: data.products.find((p) => p.id === a.productId), items: [] };
      g.items.push(a); map.set(a.productId, g);
    }
    return [...map.values()].filter((g) => g.p);
  }, [data, filter]);
  return <>
    <Heading title={t("alerts")} desc={t("alertsSub")} />
    <Chips value={filter} onChange={setFilter} items={[["all", "allOrders"], ["stock", "stockAlerts"], ["expiry", "expiryAlerts"], ["forecast", "forecastShort"]]} />
    {groups.map(({ p, items }) => <div className="m-card" key={p.id} style={{ padding: 0, overflow: "hidden" }}>
      <ProductCard p={p} onClick={() => go("product", { id: p.id })} />
      {items.filter((a) => a.type.startsWith("EXP") || a.type === "RUNNING_OUT").map((a, i) => <div key={i} className="m-notice warning" style={{ margin: 0, borderRadius: 0 }}>
        {a.type === "RUNNING_OUT" ? <Sparkles size={18} /> : <Clock size={18} />}
        <span>{a.type === "RUNNING_OUT" ? `${runOutLabel(t, a)} · ${t("usagePerDay", { n: a.dailyUsage, unit: a.unit })}` : `${t(`alert_${a.type}`)} · ${t.date(a.expiryDate)} · ${expiryLabel(t, a.expiryDate)}`}</span></div>)}
    </div>)}
    {!groups.length && <Empty icon={Check} title={t("noAlerts")} desc={t("allGood")} />}
    <button className="m-btn secondary full" onClick={() => go("alertSettings")}><SettingsIcon size={19} />{t("alertSettings")}</button>
  </>;
}

function HistoryScreen() {
  const t = useT();
  const { data } = useApp();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const rows = data.movements.filter((m) => `${m.productName} ${m.sku}`.toLowerCase().includes(q.toLowerCase())
    && (filter === "all" || m.type === filter || (filter === "IN" && m.type === "OPENING")));
  return <>
    <Heading title={t("history")} desc={t("historySub")} />
    <SearchBox value={q} onChange={setQ} placeholder={t("search")} />
    <Chips value={filter} onChange={setFilter} items={[["all", "allOrders"], ["IN", "mv_IN"], ["OUT", "mv_OUT"], ["COUNT_ADJUSTMENT", "countShort"]]} />
    {rows.length ? <div className="m-activity-list">{rows.map((m) => <Activity key={m.id} m={m} />)}</div> : <Empty icon={HistoryIcon} title={t("noMovements")} />}
  </>;
}

// ---------- shell ----------
export default function MobileApp() {
  const t = useT();
  const app = useApp();
  const { data, error, setError, notice, setNotice, openAdd, prefill, setPrefill, phoneNav, pttCode } = app;
  const [stack, setStack] = useState([{ screen: "home", params: {} }]);
  const [footer, setFooter] = useState(null);
  const top = stack[stack.length - 1];

  const go = (screen, params = {}) => {
    setError(""); setFooter(null);
    setStack((s) => (ROOTS.includes(screen) ? [{ screen, params }] : [...s, { screen, params }]));
  };
  const back = () => { setError(""); setFooter(null); setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)); };
  // Desktop page names used by shared components → phone screens.
  const page = (p) => {
    const productId = prefill?.productId;
    if (prefill) setPrefill(null);
    const map = {
      dashboard: ["home"], inventory: ["inventory"], settings: ["settings"], orders: ["suppliers", { tab: "orders" }], alerts: ["alerts"],
      history: ["history"], receive: ["movement", { mode: "in", productId }], dispatch: ["movement", { mode: "out", productId }],
      count: ["movement", { mode: "count", productId }], ptt: ["ptt"], scan: ["scan"]
    }[p] || ["home"];
    go(map[0], map[1]);
  };
  phoneNav.current = { go, page };
  useEffect(() => () => { phoneNav.current = null; }, []);
  useEffect(() => { document.querySelector(".m-screen")?.scrollTo(0, 0); }, [top]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(""), 3500); return () => clearTimeout(id); }, [notice]);

  const titles = {
    product: t("productDetailsT"), reorder: t("reorderStock"), movement: t({ in: "qaReceive", out: "qaShip", count: "countShort" }[top.params.mode] || "qaReceive"),
    alerts: t("alerts"), history: t("history"), ptt: t("ptt"), scan: t("scan"), warehouseSettings: t("myWarehouse"),
    alertSettings: t("alertPreferences"), shelfLife: t("shelfLifeTitle"), inventory: t("inventory"), suppliers: t("supplierNav"), settings: t("settings")
  };
  const isRoot = ROOTS.includes(top.screen);
  const hasAttention = data.alerts.length > 0;
  const k = `${stack.length}-${top.screen}-${top.params.id || ""}-${top.params.mode || ""}`;
  const props = { go, setFooter, ...top.params };

  return <AppCtx.Provider value={app}>
    <div className={`m-app ${t.lang === "my" ? "langmy" : ""}`} data-screen={top.screen}>
      <header className="m-header">
        {isRoot ? <span className="m-header-logo"><Package size={22} /></span> : <button className="m-icon-btn m-back" onClick={back} aria-label={t("back")}><ArrowLeft size={22} /></button>}
        <h2 className={top.screen === "home" ? "m-brand" : ""}>{top.screen === "home" ? <>invento<span className="dot">.</span></> : titles[top.screen]}</h2>
        {top.screen === "home" && <button className="m-icon-btn" onClick={() => go("alerts")} aria-label={t("alerts")}><Bell size={22} />{hasAttention && <span className="m-dot" />}</button>}
        {top.screen === "inventory" && <button className="m-icon-btn" onClick={() => openAdd()} aria-label={t("addTitle")}><Plus size={22} /></button>}
      </header>
      <main className="m-screen" key={k}>
        {error && <div className="m-error"><AlertTriangle size={16} /><span>{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
        {top.screen === "home" && <HomeScreen {...props} />}
        {top.screen === "inventory" && <InventoryScreen {...props} />}
        {top.screen === "product" && <ProductScreen {...props} />}
        {top.screen === "reorder" && <ReorderScreen {...props} />}
        {top.screen === "movement" && <MovementScreen {...props} />}
        {top.screen === "suppliers" && <SuppliersScreen {...props} initialTab={top.params.tab === "orders" ? "orders" : "contacts"} />}
        {top.screen === "settings" && <SettingsScreen {...props} />}
        {top.screen === "warehouseSettings" && <WarehouseScreen {...props} />}
        {top.screen === "alertSettings" && <AlertSettingsScreen {...props} />}
        {top.screen === "shelfLife" && <ShelfLifeScreen {...props} />}
        {top.screen === "alerts" && <AlertsScreen {...props} initialFilter={top.params.filter || "all"} />}
        {top.screen === "history" && <HistoryScreen {...props} />}
        {top.screen === "ptt" && <div className="m-embed"><PushToTalk key={pttCode} initialCode={pttCode} /></div>}
        {top.screen === "scan" && <div className="m-embed"><ScanPage /></div>}
      </main>
      {(footer || isRoot) && <footer className="m-footer">
        {footer && <div className="m-footer-actions">{footer}</div>}
        {isRoot && <nav className="m-nav" aria-label={t("home")}>
          {[["home", Home, "home"], ["inventory", Package, "inventory"]].map(([s, Icon, key]) => <button key={s} className={`m-nav-item ${top.screen === s ? "active" : ""}`} onClick={() => go(s)}><span><Icon size={22} /></span><span>{t(key)}</span></button>)}
          <button className="m-fab" onClick={() => openAdd()} aria-label={t("addTitle")}><Plus size={28} /></button>
          {[["suppliers", Truck, "supplierNav"], ["settings", SettingsIcon, "settingNav"]].map(([s, Icon, key]) => <button key={s} className={`m-nav-item ${top.screen === s ? "active" : ""}`} onClick={() => go(s)}><span><Icon size={22} /></span><span>{t(key)}</span></button>)}
        </nav>}
      </footer>}
      {notice && <div className="m-toast"><Check size={16} /><span>{notice}</span><button onClick={() => setNotice("")}><X size={14} /></button></div>}
    </div>
  </AppCtx.Provider>;
}
