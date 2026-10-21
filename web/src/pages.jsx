import React, { useContext, useEffect, useMemo, useState } from "react";
import { Boxes, Package, AlertTriangle, Bell, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Plus, Mic, Search, RefreshCw, Truck, ScanLine, CalendarClock, Sparkles, QrCode, Send } from "lucide-react";
import { useT, useApp, I18n, Input, Field, ExpiryInput, StatusBadge, expiryLabel, runOutLabel, orderMessage, todayISO, CATEGORIES } from "./lib.jsx";
import Scanner from "./components/Scanner.jsx";
import SupplierMessage from "./components/SupplierMessage.jsx";

// ---------- restock forecast ----------
function ForecastPanel() {
  const t = useT();
  const { data, openProduct, openReorder, setPage } = useApp();
  const items = data.dashboard?.runningOut || [];
  return <div className="panel forecast-panel">
    <div className="panelhead"><div><h3><Sparkles size={16} className="inline-icon" /> {t("forecastTitle")}</h3><p>{t("forecastSub")}</p></div><span className="badge violet-badge">{t("smartBadge")}</span></div>
    {items.length ? items.map((p) => {
      const full = Math.min(100, Math.round((p.daysLeft / 14) * 100));
      return <div className="forecast-row" key={p.id}>
        <button className="grow forecast-main" onClick={() => openProduct(p.id)}>
          <b>{p.name}</b>
          <div className="runway"><span className={p.daysLeft <= 3 ? "red" : p.daysLeft <= 7 ? "amber" : "ok"} style={{ width: `${Math.max(4, full)}%` }} /></div>
          <small>{runOutLabel(t, p)} · {t("usagePerDay", { n: p.dailyUsage, unit: p.unit })} · {t.num(p.quantity)} {p.unit}</small>
        </button>
        {p.orderStatus ? <button className="secondary smallbtn" onClick={() => setPage("orders")}>{t(`status_${p.orderStatus}`)}</button>
          : p.suggestedOrder > 0 && <button className="primary smallbtn" onClick={() => openReorder(p)}>{t("orderN", { n: p.suggestedOrder, unit: p.unit })}</button>}
      </div>;
    }) : <div className="empty">{t("forecastEmpty")}</div>}
  </div>;
}

// ---------- shared ----------
export function MovementTable({ movements }) {
  const t = useT();
  if (!movements?.length) return <div className="empty">{t("noMovements")}</div>;
  const cls = { IN: "green", OPENING: "green", OUT: "blue", COUNT_ADJUSTMENT: "amber" };
  return <div className="tablewrap"><table><thead><tr><th>{t("colProduct")}</th><th>{t("colMovement")}</th><th>{t("colBefore")}</th><th>{t("colChange")}</th><th>{t("colAfter")}</th><th>{t("colActor")}</th></tr></thead>
    <tbody>{movements.map((m) => <tr key={m.id}>
      <td><b>{m.productName}</b><small>{m.sku}{m.reason ? ` · ${m.reason}` : ""}</small></td>
      <td><span className={`badge ${cls[m.type] || "amber"}`}>{t(`mv_${m.type}`)}</span></td>
      <td>{t.num(m.beforeQty)}</td>
      <td className={m.delta >= 0 ? "positive" : "negative"}>{m.delta > 0 ? "+" : ""}{t.num(m.delta)}</td>
      <td><b>{t.num(m.afterQty)}</b></td>
      <td><span>{m.actorName}</span><small>{t.dateTime(m.createdAt)}</small></td>
    </tr>)}</tbody></table></div>;
}

function AlertRow({ a, action }) {
  const t = useT();
  const icon = a.type === "OUT_OF_STOCK" || a.type === "EXPIRED" ? "rose" : a.type === "RUNNING_OUT" ? "violet" : "amber";
  const detail = a.type === "EXPIRY" || a.type === "EXPIRED" ? `${t.date(a.expiryDate)} · ${expiryLabel(t, a.expiryDate)}`
    : a.type === "RUNNING_OUT" ? `${runOutLabel(t, a)} · ${t("usagePerDay", { n: a.dailyUsage, unit: a.unit })}`
    : t("threshold_of", { n: a.threshold });
  return <div className="alertrow">
    <span className={`alerticon ${icon}`}>{a.type.startsWith("EXP") ? <CalendarClock size={17} /> : a.type === "RUNNING_OUT" ? <Sparkles size={17} /> : <AlertTriangle size={17} />}</span>
    <div className="grow"><b>{a.name}</b><small>{t(`alert_${a.type}`)} · {detail}{a.orderStatus ? ` · ${t(`status_${a.orderStatus}`)}` : ""}</small></div>
    <strong>{t.num(a.quantity)} {a.unit}</strong>
    {action}
  </div>;
}

function ProductSelect({ value, onChange, products }) {
  const t = useT();
  return <Field label={t("selectProduct")}><select required value={value} onChange={(e) => onChange(e.target.value)}>
    <option value="">— {t("selectProduct")} —</option>
    {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {t.num(p.quantity)} {p.unit}</option>)}
  </select></Field>;
}

// ---------- dashboard ----------
export function Dashboard() {
  const t = useT();
  const { data, setPage, openAdd, warehouse } = useApp();
  const d = data.dashboard;
  const metric = (icon, cls, label, value, sub, page) => <button className="metriccard" onClick={() => page && setPage(page)}>
    <div className="metriclabel"><span className={`metricicon ${cls}`}>{icon}</span><span>{label}</span></div><strong>{value ?? "—"}</strong><small>{sub}</small></button>;
  const quick = (icon, cls, label, sub, onClick) => <button onClick={onClick}><span className={`quickicon ${cls}`}>{icon}</span><b>{label}</b><small>{sub}</small></button>;
  return <>
    <div className="welcome-row"><div><div className="overline">{t("overview")}</div><h1>{t("atAGlance")}</h1><p>{t("atAGlanceSub")}</p></div><button className="primary" onClick={openAdd}><Plus size={17} /> {t("qaAdd")}</button></div>
    <button className="ptt-banner" onClick={() => setPage("ptt")}><span><Mic size={22} /></span><div><b>{t("pttCallout")}</b><small>{t("pttCalloutSub")}</small></div><em>{t("start")} →</em></button>
    <div className="metricgrid">
      {metric(<Boxes size={19} />, "mint", t("products"), d && t.num(d.products), t("productsSub"), "inventory")}
      {metric(<Package size={19} />, "blue", t("units"), d && t.num(d.units), t("unitsSub"), "inventory")}
      {metric(<AlertTriangle size={19} />, "amber", t("low"), d && t.num(d.lowStock), t("lowSub"), "alerts")}
      {metric(<Bell size={19} />, "rose", t("out"), d && t.num(d.outOfStock), t("outSub"), "alerts")}
      {metric(<CalendarClock size={19} />, "amber", t("expiring"), d && t.num(d.expiring), t("expiringSub", { days: warehouse?.settings?.expiryAlertDays ?? 30 }), "alerts")}
      {metric(<Truck size={19} />, "violet", t("pendingOrders"), d && t.num(d.pendingOrders), t("pendingOrdersSub"), "orders")}
    </div>
    <ForecastPanel />
    <div className="twocol">
      <div className="panel"><div className="panelhead"><div><h3>{t("attention")}</h3><p>{t("attentionSub")}</p></div><button className="textbutton" onClick={() => setPage("alerts")}>{t("viewAlerts")}</button></div>
        {data.alerts.slice(0, 5).map((a, i) => <AlertRow key={`${a.type}-${a.productId}-${i}`} a={a} />)}
        {!data.alerts.length && <div className="empty">{t("allGood")}</div>}
      </div>
      <div className="panel"><div className="panelhead"><div><h3>{t("actions")}</h3><p>{t("actionsSub")}</p></div></div>
        <div className="quickgrid">
          {quick(<Mic />, "mint", t("ptt"), t("qaPttSub"), () => setPage("ptt"))}
          {quick(<Plus />, "violet", t("qaAdd"), t("qaAddSub"), openAdd)}
          {quick(<ArrowDownToLine />, "mint", t("qaReceive"), t("qaReceiveSub"), () => setPage("receive"))}
          {quick(<ArrowUpFromLine />, "blue", t("qaShip"), t("qaShipSub"), () => setPage("dispatch"))}
          {quick(<Truck />, "violet", t("orders"), t("qaOrdersSub"), () => setPage("orders"))}
          {quick(<ClipboardCheck />, "amber", t("qaCount"), t("qaCountSub"), () => setPage("count"))}
        </div>
      </div>
    </div>
    <div className="panel"><div className="panelhead"><div><h3>{t("recent")}</h3><p>{t("recentSub")}</p></div><button className="textbutton" onClick={() => setPage("history")}>{t("viewHistory")}</button></div><MovementTable movements={d?.recent} /></div>
  </>;
}

// ---------- inventory ----------
export function Inventory() {
  const t = useT();
  const { data, openAdd, openProduct, openLabels } = useApp();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const filtered = useMemo(() => data.products.filter((p) => (!category || p.category === category)
    && `${p.name} ${p.sku} ${p.barcode} ${p.supplier}`.toLowerCase().includes(search.toLowerCase())), [data.products, search, category]);
  return <div className="panel">
    <div className="panelhead"><div><h3>{t("inventory")}</h3><p>{t("inventorySub")}</p></div><div className="row-gap"><button className="secondary" onClick={() => openLabels(filtered.map((p) => p.id))}><QrCode size={16} />{t("printLabels")}</button><button className="primary" onClick={() => openAdd()}><Plus size={17} />{t("addTitle")}</button></div></div>
    <div className="tabletools">
      <div className="searchbox"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} /></div>
      <select className="filter" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">{t("allCategories")}</option>{CATEGORIES.map((c) => <option key={c} value={c}>{t.cat(c)}</option>)}</select>
      <span className="muted">{t("productCount", { n: filtered.length })}</span>
    </div>
    <div className="tablewrap"><table><thead><tr><th>{t("colProduct")}</th><th>{t("colCategory")}</th><th>{t("colSupplier")}</th><th>{t("colOnHand")}</th><th>{t("colRunOut")}</th><th>{t("colExpiry")}</th><th>{t("colStatus")}</th></tr></thead>
      <tbody>{filtered.map((p) => <tr key={p.id} onClick={() => openProduct(p.id)} className="clickrow">
        <td><div className="productname"><span className="producticon"><Package size={18} /></span><span><b>{p.name}</b><small>{p.sku}{p.barcode && p.barcode !== p.sku ? ` · ${p.barcode}` : ""}</small></span></div></td>
        <td>{t.cat(p.category)}</td><td>{p.supplier || "—"}</td>
        <td><b>{t.num(p.quantity)}</b> <small>{p.unit}</small></td>
        <td>{p.daysLeft !== null && p.daysLeft !== undefined ? <><span className={p.daysLeft <= 7 ? "negative" : ""}>{runOutLabel(t, p)}</span><small>{t("usagePerDay", { n: p.dailyUsage, unit: p.unit })}</small></> : "—"}</td>
        <td>{p.nextExpiry ? <><span>{t.date(p.nextExpiry)}</span><small>{expiryLabel(t, p.nextExpiry)}</small></> : "—"}</td>
        <td><StatusBadge product={p} /></td>
      </tr>)}</tbody></table>
      {!filtered.length && <div className="empty">{t("noProducts")}</div>}
    </div>
  </div>;
}

// ---------- scan / lookup ----------
export function ScanPage() {
  const t = useT();
  const { data, request, openProduct, openAdd, setPage, setPttCode } = useApp();
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [missing, setMissing] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q ? data.products.filter((p) => `${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(q)) : data.products;

  const onCode = async (code) => {
    setScanning(false); setQuery(code); setMissing("");
    try {
      const r = await request(`/v1/products/lookup/${encodeURIComponent(code)}`);
      if (r.found) openProduct(r.product.id); else setMissing(code);
    } catch { setMissing(code); }
  };

  return <div className="scanpage">
    <div className="scanhero"><span className="scanheroicon"><ScanLine size={25} /></span><div><div className="overline">{t("lookupOverline")}</div><h1>{t("scanFind")}</h1><p>{t("scanFindSub")}</p></div></div>
    <button className="scan-cta" onClick={() => setScanning(true)}><ScanLine size={28} /><b>{t("openCamera")}</b></button>
    <div className="scanlookup"><form className="searchbox scansearch" onSubmit={(e) => { e.preventDefault(); if (query.trim()) onCode(query.trim()); }}><Search size={18} /><input value={query} onChange={(e) => { setQuery(e.target.value); setMissing(""); }} placeholder={t("lookupPh")} /></form></div>
    {missing && <div className="panel notfound"><div className="panelhead"><div><h3>{t("codeNotFound", { code: missing })}</h3></div></div>
      <div className="detail-actions pad"><button className="primary" onClick={() => { setPttCode(missing); setPage("ptt"); }}><Mic size={16} />{t("registerByVoice")}</button><button className="secondary" onClick={() => openAdd({ barcode: missing, mode: "manual" })}><Plus size={16} />{t("registerCode")}</button></div></div>}
    <div className="panel"><div className="panelhead"><div><h3>{t("matching")}</h3><p>{t("results", { n: matches.length })}</p></div><button className="secondary" onClick={() => setPage("inventory")}>{t("viewInventory")}</button></div>
      {matches.length ? matches.slice(0, 50).map((p) => <button className="scanresult" key={p.id} onClick={() => openProduct(p.id)}><span className="producticon"><Package size={18} /></span><span className="scanresulttext"><b>{p.name}</b><small>{p.sku}{p.barcode && p.barcode !== p.sku ? ` · ${p.barcode}` : ""}</small></span><StatusBadge product={p} /><span className="scanresultqty"><b>{t.num(p.quantity)}</b><small>{p.unit}</small></span></button>) : <div className="empty">{t("noProducts")}</div>}
    </div>
    {scanning && <Scanner onDetected={onCode} onClose={() => setScanning(false)} />}
  </div>;
}

// ---------- stock in / ship out ----------
export function StockMovement({ type }) {
  const t = useT();
  const { data, request, notify, setError, load, setPage, prefill, setPrefill } = useApp();
  const isIn = type === "in";
  const empty = { productId: "", quantity: 1, reason: "", reference: "", note: "", expiryDate: "", batchNumber: "", stockInDate: todayISO() };
  const [tx, setTx] = useState({ ...empty, productId: prefill?.productId || "" });
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (prefill) setPrefill(null); }, []);
  const products = data.products.filter((p) => !category || p.category === category);
  const selected = data.products.find((p) => p.id === tx.productId);
  const over = !isIn && selected && Number(tx.quantity) > selected.quantity;

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await request(`/v1/stock/${type}`, { method: "POST", body: JSON.stringify({ ...tx, quantity: Number(tx.quantity) }) });
      notify(t("movementSaved")); setTx(empty); await load();
    } catch (err) { setError(t.err(err)); } finally { setBusy(false); }
  };
  const set = (k) => (v) => setTx({ ...tx, [k]: v });

  return <div className="formpanel">
    <div className="formintro"><span className={`formicon ${isIn ? "mint" : "blue"}`}>{isIn ? <ArrowDownToLine /> : <ArrowUpFromLine />}</span><div><h3>{isIn ? t("receiveTitle") : t("shipTitle")}</h3><p>{isIn ? t("receiveSub") : t("shipSub")}</p></div></div>
    <form onSubmit={submit}>
      <Field label={t("filterCategory")}><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">{t("allCategories")}</option>{CATEGORIES.map((c) => <option key={c} value={c}>{t.cat(c)}</option>)}</select></Field>
      <ProductSelect value={tx.productId} onChange={set("productId")} products={products} />
      {selected && <div className={`hint ${over ? "warn" : ""}`}>{over ? t("exceeds", { qty: selected.quantity, unit: selected.unit }) : t("available", { qty: selected.quantity, unit: selected.unit })}</div>}
      <Input label={t("qty")} value={tx.quantity} onChange={set("quantity")} type="number" min={1} max={!isIn && selected ? selected.quantity : undefined} step={1} required />
      <div className="formgrid">
        <Input label={t("reason")} value={tx.reason} onChange={set("reason")} placeholder={isIn ? t("reasonInPh") : t("reasonOutPh")} />
        <Input label={t("reference")} value={tx.reference} onChange={set("reference")} placeholder={t("referencePh")} />
      </div>
      {isIn && <>
        <div className="formgrid">
          <Input label={t("stockInDate")} value={tx.stockInDate} onChange={set("stockInDate")} type="date" />
          <Input label={t("batch")} value={tx.batchNumber} onChange={set("batchNumber")} />
        </div>
        <ExpiryInput label={t("expiryDate")} value={tx.expiryDate} onChange={set("expiryDate")} base={tx.stockInDate} shelfLifeDays={selected?.shelfLifeDays} />
      </>}
      <Input label={isIn ? t("remarks") : t("note")} value={tx.note} onChange={set("note")} placeholder={isIn ? t("remarksPh") : ""} />
      {!isIn && <div className="hint"><AlertTriangle size={16} /> {t("shipHint")}</div>}
      <div className="formactions"><button type="button" className="secondary" onClick={() => setPage("dashboard")}>{t("cancel")}</button><button className="primary" disabled={busy || over}>{t("confirm")}</button></div>
    </form>
  </div>;
}

// ---------- physical count ----------
export function Count() {
  const t = useT();
  const { data, request, notify, setError, load, setPage } = useApp();
  const [f, setF] = useState({ productId: "", countedQuantity: 0, reason: "", note: "" });
  const [busy, setBusy] = useState(false);
  const p = data.products.find((x) => x.id === f.productId);
  const diff = p ? Number(f.countedQuantity) - p.quantity : 0;
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await request("/v1/stock/counts", { method: "POST", body: JSON.stringify({ ...f, countedQuantity: Number(f.countedQuantity) }) });
      notify(t("countSaved")); setF({ productId: "", countedQuantity: 0, reason: "", note: "" }); await load();
    } catch (err) { setError(t.err(err)); } finally { setBusy(false); }
  };
  return <div className="formpanel">
    <div className="formintro"><span className="formicon amber"><ClipboardCheck /></span><div><h3>{t("countTitle")}</h3><p>{t("countSub")}</p></div></div>
    <form onSubmit={submit}>
      <ProductSelect value={f.productId} onChange={(v) => setF({ ...f, productId: v, countedQuantity: data.products.find((x) => x.id === v)?.quantity ?? 0 })} products={data.products} />
      {p && <div className="countcompare"><div><small>{t("systemQty")}</small><b>{t.num(p.quantity)}</b></div><div><small>{t("counted")}</small><b>{t.num(Number(f.countedQuantity) || 0)}</b></div><div><small>{t("variance")}</small><b className={diff === 0 ? "green" : "red"}>{diff > 0 ? "+" : ""}{t.num(diff)}</b></div></div>}
      <Input label={t("counted")} value={f.countedQuantity} onChange={(v) => setF({ ...f, countedQuantity: v })} type="number" min={0} step={1} required />
      <Input label={t("diffReason")} value={f.reason} onChange={(v) => setF({ ...f, reason: v })} placeholder={t("diffReasonPh")} required={diff !== 0} />
      <Input label={t("note")} value={f.note} onChange={(v) => setF({ ...f, note: v })} />
      <div className="formactions"><button type="button" className="secondary" onClick={() => setPage("dashboard")}>{t("cancel")}</button><button className="primary" disabled={busy}>{t("confirm")}</button></div>
    </form>
  </div>;
}

// ---------- supplier orders ----------
export function Orders() {
  const t = useT();
  const { request, notify, setError, load, data, warehouse } = useApp();
  const [scope, setScope] = useState("active");
  const [orders, setOrders] = useState([]);
  const [receiving, setReceiving] = useState(null);
  const [messaging, setMessaging] = useState(null);
  const refresh = () => request(`/v1/reorders${scope === "active" ? "?status=active" : ""}`).then((r) => setOrders(r.items)).catch((e) => setError(t.err(e)));
  useEffect(() => { refresh(); }, [scope, data.dashboard]);

  const update = async (order, status, extra = {}) => {
    if (status === "CANCELLED" && !window.confirm(t("cancelOrderConfirm"))) return;
    try {
      await request(`/v1/reorders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status, ...extra }) });
      notify(t("orderUpdated")); setReceiving(null); await load();
    } catch (e) { setError(t.err(e)); }
  };
  const cls = { PENDING: "amber", CONFIRM_SHIPPING: "blue", RECEIVED: "green", CANCELLED: "red" };

  return <div className="panel">
    <div className="panelhead"><div><h3>{t("orders")}</h3><p>{t("ordersSub")}</p></div>
      <div className="segmented"><button className={scope === "active" ? "active" : ""} onClick={() => setScope("active")}>{t("openOrders")}</button><button className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>{t("allOrders")}</button></div></div>
    <div className="hint pad-x">{t("orderFlowHint")}</div>
    {orders.length ? orders.map((o) => <div className="order-row" key={o.id}>
      <span className="alerticon blue"><Truck size={17} /></span>
      <div className="grow"><b>{o.productName}</b><small>{t.num(o.quantity)} {o.unit} · {o.supplier || "—"}{o.supplierPhone ? ` · ${o.supplierPhone}` : ""}</small><small>{t("colOrdered")} {t.dateTime(o.createdAt)} · {t("colUpdated")} {t.dateTime(o.updatedAt)}</small></div>
      <span className={`badge ${cls[o.status]}`}>{t(`status_${o.status}`)}</span>
      {(o.status === "PENDING" || o.status === "CONFIRM_SHIPPING") && <div className="order-actions">
        <button className="secondary smallbtn" onClick={() => setMessaging(messaging === o.id ? null : o.id)}><Send size={13} />{t("sendMessage")}</button>
        {o.supplierPhone && <a className="secondary smallbtn" href={`tel:${o.supplierPhone.replace(/\s+/g, "")}`}>{t("callSupplier")}</a>}
        {o.status === "PENDING" && <button className="secondary smallbtn" onClick={() => update(o, "CONFIRM_SHIPPING")}>{t("markConfirmShipping")}</button>}
        <button className="primary smallbtn" onClick={() => setReceiving({ order: o, qty: o.quantity, expiryDate: "" })}>{t("markReceived")}</button>
        <button className="textbutton danger smallbtn" onClick={() => update(o, "CANCELLED")}>{t("cancelOrder")}</button>
      </div>}
      {messaging === o.id && <div className="order-message"><SupplierMessage phone={o.supplierPhone} text={orderMessage(t, { supplier: o.supplier, warehouse: warehouse?.name, product: o.productName, quantity: o.quantity, unit: o.unit })} /></div>}
    </div>) : <div className="empty">{t("noOrders")}</div>}
    {receiving && <div className="modalback" onMouseDown={(e) => { if (e.target === e.currentTarget) setReceiving(null); }}>
      <form className="modal" onSubmit={(e) => { e.preventDefault(); update(receiving.order, "RECEIVED", { receivedQuantity: Number(receiving.qty), expiryDate: receiving.expiryDate }); }}>
        <div className="modalhead"><div><div className="overline">{t("orders").toUpperCase()}</div><h3>{receiving.order.productName}</h3></div></div>
        <div className="modalbody">
          <Input label={t("receivedQty")} value={receiving.qty} onChange={(v) => setReceiving({ ...receiving, qty: v })} type="number" min={1} step={1} required />
          <ExpiryInput label={t("expiryDate")} value={receiving.expiryDate} onChange={(v) => setReceiving({ ...receiving, expiryDate: v })} base={todayISO()} shelfLifeDays={data.products.find((p) => p.id === receiving.order.productId)?.shelfLifeDays} />
          <div className="hint">{t("receivedHint")}</div>
        </div>
        <div className="modalfoot"><button type="button" className="secondary" onClick={() => setReceiving(null)}>{t("cancel")}</button><button className="primary">{t("markReceived")}</button></div>
      </form>
    </div>}
  </div>;
}

// ---------- alerts ----------
export function Alerts() {
  const t = useT();
  const { data, openProduct, openReorder, setPage } = useApp();
  return <div className="panel">
    <div className="panelhead"><div><h3>{t("alerts")}</h3><p>{t("alertsSub")}</p></div><div className="row-gap"><span className="badge amber">{t("activeCount", { n: data.alerts.length })}</span><button className="secondary smallbtn" onClick={() => setPage("settings")}>{t("alertSettings")}</button></div></div>
    {data.alerts.map((a, i) => {
      const product = data.products.find((p) => p.id === a.productId);
      const canReorder = product && !product.orderStatus && ["LOW_STOCK", "OUT_OF_STOCK", "RUNNING_OUT"].includes(a.type);
      return <AlertRow key={`${a.type}-${a.productId}-${a.batchId || ""}-${i}`} a={a} action={<div className="row-gap">
        {canReorder && <button className="primary smallbtn" onClick={() => openReorder(product)}>{t("reorder")}</button>}
        <button className="secondary smallbtn" onClick={() => openProduct(a.productId)}>{t("view")}</button></div>} />;
    })}
    {!data.alerts.length && <div className="empty">{t("noAlerts")}</div>}
  </div>;
}

// ---------- history ----------
export function History() {
  const t = useT();
  const { data, load } = useApp();
  const [type, setType] = useState("");
  const rows = type ? data.movements.filter((m) => m.type === type || (type === "IN" && m.type === "OPENING")) : data.movements;
  return <div className="panel">
    <div className="panelhead"><div><h3>{t("history")}</h3><p>{t("historySub")}</p></div>
      <div className="row-gap"><select className="filter" value={type} onChange={(e) => setType(e.target.value)}><option value="">{t("allTypes")}</option>{["IN", "OUT", "COUNT_ADJUSTMENT"].map((k) => <option key={k} value={k}>{t(`mv_${k}`)}</option>)}</select>
        <button className="secondary" onClick={load}><RefreshCw size={15} /> {t("refresh")}</button></div></div>
    <MovementTable movements={rows} />
  </div>;
}

// ---------- settings ----------
export function Settings() {
  const t = useT();
  const { user, warehouse, setWarehouse, request, notify, setError, data, load, logout } = useApp();
  const { setLang } = useContext(I18n);
  const owner = user?.role === "OWNER";
  const [w, setW] = useState({ name: warehouse?.name || "", location: warehouse?.location || "", language: t.lang, expiryAlertDays: warehouse?.settings?.expiryAlertDays ?? 30, defaultLowStockThreshold: warehouse?.settings?.defaultLowStockThreshold ?? 5 });
  const [thresholds, setThresholds] = useState({});
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const updated = await request("/v1/warehouse", { method: "PATCH", body: JSON.stringify({ name: w.name, location: w.location, language: w.language, settings: { expiryAlertDays: Number(w.expiryAlertDays), defaultLowStockThreshold: Number(w.defaultLowStockThreshold) } }) });
      const items = Object.entries(thresholds).map(([id, v]) => ({ id, lowStockThreshold: Number(v) }));
      if (items.length) await request("/v1/products/thresholds", { method: "PATCH", body: JSON.stringify({ items }) });
      setWarehouse(updated); setThresholds({}); setLang(updated.language); notify(t("settingsSaved")); await load();
    } catch (err) { setError(t.err(err)); } finally { setBusy(false); }
  };

  return <form className="settingspanel" onSubmit={save}>
    <div className="panel"><div className="panelhead"><div><h3>{t("alertSettings")}</h3><p>{t("expiryDaysHint")}</p></div></div>
      <div className="pad formgrid">
        <Input label={`${t("expiryDays")} (${t("days")})`} value={w.expiryAlertDays} onChange={(v) => setW({ ...w, expiryAlertDays: v })} type="number" min={1} max={365} step={1} required disabled={!owner} />
        <Input label={t("defaultThreshold")} value={w.defaultLowStockThreshold} onChange={(v) => setW({ ...w, defaultLowStockThreshold: v })} type="number" min={0} step={1} required disabled={!owner} />
      </div>
      <div className="pad chips">{[3, 7, 14, 28, 30, 60].map((d) => <button type="button" key={d} className={Number(w.expiryAlertDays) === d ? "chip active" : "chip"} disabled={!owner} onClick={() => setW({ ...w, expiryAlertDays: d })}>{t.num(d)} {t("days")}</button>)}</div>
    </div>
    <div className="panel"><div className="panelhead"><div><h3>{t("productThresholds")}</h3><p>{t("productThresholdsSub")}</p></div></div>
      <div className="tablewrap threshold-list">{data.products.map((p) => <div className="settingsrow" key={p.id}><span><b>{p.name}</b> <small>{t.num(p.quantity)} {p.unit}</small></span>
        <input className="num" type="number" min={0} step={1} value={thresholds[p.id] ?? p.lowStockThreshold} onChange={(e) => setThresholds({ ...thresholds, [p.id]: e.target.value })} /></div>)}
        {!data.products.length && <div className="empty">{t("noProducts")}</div>}</div>
    </div>
    <div className="panel"><div className="panelhead"><div><h3>{t("warehouseSection")}</h3><p>{t("settingsSub")}</p></div></div>
      <div className="pad">
        <div className="formgrid"><Input label={t("warehouseName")} value={w.name} onChange={(v) => setW({ ...w, name: v })} required disabled={!owner} /><Input label={t("location")} value={w.location} onChange={(v) => setW({ ...w, location: v })} disabled={!owner} /></div>
        <Field label={t("language")}><select value={w.language} disabled={!owner} onChange={(e) => setW({ ...w, language: e.target.value })}><option value="en">English</option><option value="my">မြန်မာ</option></select></Field>
        {!owner && <div className="hint">{t("ownerOnly")}</div>}
      </div>
      <div className="modalfoot"><button className="primary" disabled={busy}>{busy ? t("saving") : t("saveSettings")}</button></div>
    </div>
    <div className="panel"><div className="panelhead"><div><h3>{t("account")}</h3></div></div>
      <div className="settingsrow"><span>{t("signedInAs")}</span><b>{user?.name} · {user?.email}</b></div>
      <div className="settingsrow"><span>{t("role")}</span><b>{t(`role_${user?.role || "OWNER"}`)}</b></div>
      <div className="hint pad-x">{t("phaseNote")}</div>
      <div className="modalfoot"><button type="button" className="secondary" onClick={logout}>{t("logout")}</button></div>
    </div>
  </form>;
}
