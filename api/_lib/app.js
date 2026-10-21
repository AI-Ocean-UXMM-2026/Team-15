import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getDb, withTx, oid, defaultSettings } from "./db.js";
import { parseVoice } from "./voice.js";

const app = express();
const origins = (process.env.WEB_ORIGIN || "http://localhost:5173").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins }));
// Product photos are sent as compressed data URLs; Vercel caps request bodies at 4.5 MB.
app.use(express.json({ limit: "4mb" }));

const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
const JWT_SECRET = process.env.JWT_SECRET || (isProd ? "" : "development-only-change-this-secret");
const sign = (user) => {
  if (!JWT_SECRET) throw httpError(500, "CONFIG_ERROR", "JWT_SECRET is not configured on the server.");
  return jwt.sign({ sub: String(user._id), role: user.role }, JWT_SECRET, { expiresIn: "7d" });
};

const CATEGORIES = ["Food & Beverage", "Household", "Personal Care", "Stationery", "Electronics", "Hardware", "Medical Supplies", "Packaging", "Agriculture", "Other"];
const REORDER_FLOW = { PENDING: ["CONFIRM_SHIPPING", "RECEIVED", "CANCELLED"], CONFIRM_SHIPPING: ["RECEIVED", "CANCELLED"] };

function httpError(status, error, message) {
  return Object.assign(new Error(message), { status, error });
}
const fail = (status, error, message) => { throw httpError(status, error, message); };

// ---------- serialisation ----------
function out(doc) {
  if (!doc) return doc;
  const { _id, passwordHash, ...rest } = doc;
  const o = { id: String(_id) };
  for (const [k, v] of Object.entries(rest)) o[k] = v instanceof ObjectId ? String(v) : v;
  return o;
}
function stockStatus(p) {
  if (p.quantity <= 0) return "OUT_OF_STOCK";
  if (p.quantity <= p.lowStockThreshold) return "LOW_STOCK";
  return "IN_STOCK";
}
const productOut = (p) => (p ? { ...out(p), status: stockStatus(p) } : p);

// ---------- restock forecast ----------
// Average daily ship-out over the last 30 days predicts when each item runs out, and how much
// to order so stock covers supplier lead time (7 days) plus two more weeks.
const USAGE_WINDOW_DAYS = 30;
const COVER_DAYS = 21;
const DAY_MS = 86_400_000;

async function usageByProduct(db, warehouseId) {
  const since = new Date(Date.now() - USAGE_WINDOW_DAYS * DAY_MS);
  const rows = await db.collection("movements").aggregate([
    { $match: { warehouseId, type: "OUT", createdAt: { $gte: since } } },
    { $group: { _id: "$productId", shipped: { $sum: { $abs: "$delta" } } } }
  ]).toArray();
  return new Map(rows.map((r) => [String(r._id), r.shipped]));
}
function forecast(p, usage) {
  const shipped = usage.get(String(p._id ?? p.id)) || 0;
  if (!shipped) return { dailyUsage: 0, daysLeft: null, suggestedOrder: 0 };
  // Newer products are averaged over their own age, but never less than a week to avoid spikes.
  const ageDays = (Date.now() - new Date(p.createdAt || Date.now()).getTime()) / DAY_MS;
  const rate = shipped / Math.min(USAGE_WINDOW_DAYS, Math.max(7, ageDays));
  return {
    dailyUsage: Math.round(rate * 10) / 10,
    daysLeft: p.quantity <= 0 ? 0 : Math.floor(p.quantity / rate),
    suggestedOrder: Math.max(0, Math.ceil(rate * COVER_DAYS) - p.quantity)
  };
}
const warehouseOut = (w) => (w ? { ...out(w), settings: { ...defaultSettings, ...(w.settings || {}) } } : w);

// ---------- input cleaning ----------
const str = (v, max = 500) => String(v ?? "").trim().slice(0, max);
function cleanInt(value, min = 0) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min ? n : null;
}
const isoDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
const today = () => new Date().toISOString().slice(0, 10);
function addDays(days, from) {
  const d = from ? new Date(`${from}T00:00:00Z`) : new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function cleanPhotos(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((p) => typeof p === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(p) && p.length < 1_500_000).slice(0, 4);
}
function productFields(b, old = {}) {
  const pick = (key, max) => (b[key] !== undefined ? str(b[key], max) : old[key] ?? "");
  const threshold = b.lowStockThreshold !== undefined ? cleanInt(b.lowStockThreshold) : old.lowStockThreshold ?? 5;
  if (threshold === null) fail(400, "VALIDATION_ERROR", "Low-stock threshold must be a non-negative whole number.");
  // Shelf life lets undated goods (bread, vegetables, local products) get an expiry date automatically on stock-in.
  const shelfLife = b.shelfLifeDays !== undefined && b.shelfLifeDays !== "" ? cleanInt(b.shelfLifeDays) : old.shelfLifeDays ?? 0;
  if (shelfLife === null || shelfLife > 3650) fail(400, "VALIDATION_ERROR", "Shelf life must be between 0 and 3650 days.");
  const fields = {
    name: pick("name", 160), description: pick("description", 2000), sku: pick("sku", 80), barcode: pick("barcode", 80),
    category: pick("category", 80) || "Other", unit: pick("unit", 40) || "pcs", supplier: pick("supplier", 160),
    supplierPhone: pick("supplierPhone", 60), supplierEmail: pick("supplierEmail", 160), fdaCode: pick("fdaCode", 80),
    remarks: pick("remarks", 1000), lowStockThreshold: threshold, shelfLifeDays: shelfLife,
    photos: b.photos !== undefined ? cleanPhotos(b.photos) : old.photos ?? []
  };
  if (!fields.name) fail(400, "VALIDATION_ERROR", "Product name is required.");
  if (!fields.sku) fields.sku = fields.barcode || `INV-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  return fields;
}

// ---------- middleware ----------
app.use(async (_req, _res, next) => { await getDb(); next(); });

async function auth(req, _res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET || "missing");
  } catch {
    fail(401, "AUTH_REQUIRED", "Please sign in again.");
  }
  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: oid(payload.sub) });
  if (!user) fail(401, "AUTH_REQUIRED", "Please sign in again.");
  const warehouse = await db.collection("warehouses").findOne({ _id: user.warehouseId });
  if (!warehouse) fail(403, "WAREHOUSE_REQUIRED", "No active warehouse is linked to this account.");
  req.db = db;
  req.user = user;
  req.warehouse = warehouse;
  next();
}
function requireOwner(req, _res, next) {
  if (req.user.role !== "OWNER") fail(403, "OWNER_REQUIRED", "Only the owner can perform this action.");
  next();
}
async function findProduct(db, warehouseId, id, session) {
  const _id = oid(String(id || ""));
  if (!_id) fail(400, "VALIDATION_ERROR", "Choose a product.");
  const p = await db.collection("products").findOne({ _id, warehouseId, archived: false }, { session });
  if (!p) fail(404, "NOT_FOUND", "Product not found.");
  return p;
}

// ---------- stock core ----------
async function recordMovement(db, session, { warehouse, user, product, type, delta, beforeQty, afterQty, reason = "", reference = "", note = "", batchId = null }) {
  await db.collection("movements").insertOne({
    warehouseId: warehouse._id, productId: product._id, actorId: user._id, productName: product.name, sku: product.sku,
    actorName: user.name, type, delta, beforeQty, afterQty, reason: str(reason), reference: str(reference, 120),
    note: str(note, 1000), batchId, createdAt: new Date()
  }, { session });
}

async function stockIn(db, session, { warehouse, user, product, qty, type = "IN", reason, reference, note, expiryDate, batchNumber, stockInDate, remarks }) {
  const updated = await db.collection("products").findOneAndUpdate(
    { _id: product._id, warehouseId: warehouse._id, archived: false },
    { $inc: { quantity: qty }, $set: { updatedAt: new Date() } },
    { returnDocument: "after", session }
  );
  if (!updated) fail(404, "NOT_FOUND", "Product not found.");
  let batchId = null;
  const inDate = isoDate(stockInDate) || today();
  const expiry = isoDate(expiryDate) || (updated.shelfLifeDays > 0 ? addDays(updated.shelfLifeDays, inDate) : "");
  if (expiry || str(batchNumber)) {
    batchId = new ObjectId();
    await db.collection("batches").insertOne({
      _id: batchId, warehouseId: warehouse._id, productId: product._id, lotNumber: str(batchNumber, 80), expiryDate: expiry,
      stockInDate: inDate, quantity: qty, remarks: str(remarks, 1000), createdAt: new Date(),
      expirySource: isoDate(expiryDate) ? "entered" : expiry ? "shelfLife" : ""
    }, { session });
  }
  updated.receivedExpiry = expiry;
  await recordMovement(db, session, {
    warehouse, user, product: updated, type, delta: qty, beforeQty: updated.quantity - qty, afterQty: updated.quantity,
    reason: reason || (type === "OPENING" ? "Opening stock" : "Stock received"), reference,
    note: [str(note, 1000), str(remarks, 1000)].filter(Boolean).join(" · "), batchId
  });
  return updated;
}

async function consumeBatches(db, session, warehouseId, productId, qty) {
  // First-expiry-first-out, so expiry alerts follow the stock that is actually left.
  const batches = await db.collection("batches").find({ warehouseId, productId, quantity: { $gt: 0 } }, { session })
    .sort({ expiryDate: 1, createdAt: 1 }).toArray();
  batches.sort((a, b) => (a.expiryDate || "9999").localeCompare(b.expiryDate || "9999"));
  let left = qty;
  for (const b of batches) {
    if (left <= 0) break;
    const take = Math.min(left, b.quantity);
    await db.collection("batches").updateOne({ _id: b._id }, { $inc: { quantity: -take } }, { session });
    left -= take;
  }
}

// ---------- public routes ----------
app.get("/health", async (_req, res) => {
  const db = await getDb();
  await db.command({ ping: 1 });
  res.json({ ok: true, service: "invento-api", database: "mongodb", time: new Date().toISOString() });
});

const ENDPOINTS = [
  ["GET", "/health", false, "API and database health"],
  ["GET", "/api/docs", false, "Endpoint list"],
  ["POST", "/v1/auth/register", false, "Create owner account and warehouse"],
  ["POST", "/v1/auth/login", false, "Sign in and receive JWT"],
  ["GET", "/v1/me", true, "Current user and warehouse"],
  ["GET", "/v1/dashboard", true, "Dashboard totals"],
  ["GET", "/v1/categories", true, "Product categories"],
  ["GET", "/v1/products", true, "List products (?search=&category=)"],
  ["POST", "/v1/products", true, "Create product (optional opening stock, expiry, photos)"],
  ["GET", "/v1/products/lookup/:code", true, "Find by barcode / QR / SKU"],
  ["PATCH", "/v1/products/thresholds", true, "Bulk update low-stock thresholds"],
  ["GET", "/v1/products/:id", true, "Product details with batches"],
  ["PATCH", "/v1/products/:id", true, "Update product"],
  ["DELETE", "/v1/products/:id", true, "Archive product (owner only)"],
  ["POST", "/v1/stock/in", true, "Stock In one product"],
  ["POST", "/v1/stock/in/batch", true, "Save the push-to-talk review table (creates or updates by code)"],
  ["POST", "/v1/stock/out", true, "Stock Out / Ship Out"],
  ["POST", "/v1/stock/counts", true, "Save physical count"],
  ["POST", "/v1/voice/parse", true, "Parse a push-to-talk transcript"],
  ["GET", "/v1/movements", true, "Movement and adjustment history"],
  ["GET", "/v1/alerts", true, "Low-stock, out-of-stock and expiry alerts"],
  ["GET", "/v1/reorders", true, "Supplier reorders (?status=active)"],
  ["POST", "/v1/reorders", true, "Reorder from supplier"],
  ["PATCH", "/v1/reorders/:id", true, "Update reorder status"],
  ["GET", "/v1/warehouse", true, "Warehouse details and alert settings"],
  ["PATCH", "/v1/warehouse", true, "Update warehouse and alert settings (owner only)"]
];
app.get("/api/docs", (_req, res) => res.json({
  service: "Invento API",
  note: "Authenticated /v1 routes require Authorization: Bearer <token>. Login via POST /v1/auth/login.",
  endpoints: ENDPOINTS.map(([method, path, authRequired, description]) => ({ method, path, auth: authRequired, description }))
}));

app.post("/v1/auth/register", async (req, res) => {
  const { name, email, password, warehouseName, location = "" } = req.body || {};
  if (!str(name) || !str(email) || typeof password !== "string" || password.length < 10 || !str(warehouseName)) {
    fail(400, "VALIDATION_ERROR", "Name, email, warehouse name, and password (at least 10 characters) are required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(email))) fail(400, "VALIDATION_ERROR", "Enter a valid email address.");
  const userId = new ObjectId(), warehouseId = new ObjectId(), now = new Date();
  const user = { _id: userId, name: str(name, 120), email: str(email, 160).toLowerCase(), passwordHash: bcrypt.hashSync(password, 12), role: "OWNER", warehouseId, createdAt: now };
  const warehouse = { _id: warehouseId, ownerId: userId, name: str(warehouseName, 120), location: str(location, 160), language: "en", timezone: "Asia/Yangon", settings: { ...defaultSettings }, createdAt: now };
  try {
    await withTx(async (session, db) => {
      await db.collection("users").insertOne(user, { session });
      await db.collection("warehouses").insertOne(warehouse, { session });
    });
  } catch (e) {
    if (e?.code === 11000) fail(409, "EMAIL_EXISTS", "That email is already registered.");
    throw e;
  }
  res.status(201).json({ token: sign(user), user: out(user), warehouse: warehouseOut(warehouse) });
});

app.post("/v1/auth/login", async (req, res) => {
  const db = await getDb();
  const email = str(req.body?.email).toLowerCase();
  const password = String(req.body?.password || "");
  const user = await db.collection("users").findOne({ email });
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) fail(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  const warehouse = await db.collection("warehouses").findOne({ _id: user.warehouseId });
  res.json({ token: sign(user), user: out(user), warehouse: warehouseOut(warehouse) });
});

// ---------- authenticated routes ----------
app.use("/v1", auth);

app.get("/v1/me", (req, res) => res.json({ user: out(req.user), warehouse: warehouseOut(req.warehouse) }));
app.get("/v1/categories", (_req, res) => res.json({ items: CATEGORIES }));

app.get("/v1/dashboard", async (req, res) => {
  const { db, warehouse } = req;
  const days = warehouseOut(warehouse).settings.expiryAlertDays;
  const [totals] = await db.collection("products").aggregate([
    { $match: { warehouseId: warehouse._id, archived: false } },
    { $group: {
      _id: null, products: { $sum: 1 }, units: { $sum: "$quantity" },
      outOfStock: { $sum: { $cond: [{ $lte: ["$quantity", 0] }, 1, 0] } },
      lowStock: { $sum: { $cond: [{ $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", "$lowStockThreshold"] }] }, 1, 0] } }
    } }
  ]).toArray();
  const [expiring, pendingOrders, recent, usage, products] = await Promise.all([
    db.collection("batches").countDocuments({ warehouseId: warehouse._id, quantity: { $gt: 0 }, expiryDate: { $gt: "", $lte: addDays(days) } }),
    db.collection("reorders").countDocuments({ warehouseId: warehouse._id, status: { $in: ["PENDING", "CONFIRM_SHIPPING"] } }),
    db.collection("movements").find({ warehouseId: warehouse._id }).sort({ createdAt: -1 }).limit(6).toArray(),
    usageByProduct(db, warehouse._id),
    db.collection("products").find({ warehouseId: warehouse._id, archived: false }, { projection: { photos: 0 } }).toArray()
  ]);
  // Items predicted to run out within two weeks, soonest first.
  const runningOut = products
    .map((p) => ({ p, f: forecast(p, usage) }))
    .filter(({ f }) => f.daysLeft !== null && f.daysLeft <= 14)
    .sort((a, b) => a.f.daysLeft - b.f.daysLeft)
    .slice(0, 6)
    .map(({ p, f }) => ({ ...productOut(p), ...f }));
  res.json({ products: 0, units: 0, outOfStock: 0, lowStock: 0, ...(totals || {}), _id: undefined, expiring, pendingOrders, recent: recent.map(out), runningOut });
});

app.get("/v1/products", async (req, res) => {
  const { db, warehouse } = req;
  const search = str(req.query.search, 100);
  const category = str(req.query.category, 80);
  const match = { warehouseId: warehouse._id, archived: false };
  if (category) match.category = category;
  if (search) {
    const re = new RegExp(escapeRegex(search), "i");
    match.$or = [{ name: re }, { sku: re }, { barcode: re }, { supplier: re }];
  }
  const rows = await db.collection("products").aggregate([
    { $match: match },
    { $sort: { name: 1 } },
    { $limit: 1000 },
    { $lookup: {
      from: "batches", let: { pid: "$_id" }, as: "nextExpiry",
      pipeline: [
        { $match: { $expr: { $eq: ["$productId", "$$pid"] }, quantity: { $gt: 0 }, expiryDate: { $gt: "" } } },
        { $sort: { expiryDate: 1 } }, { $limit: 1 }, { $project: { _id: 0, expiryDate: 1 } }
      ]
    } },
    { $addFields: { photoCount: { $size: { $ifNull: ["$photos", []] } }, nextExpiry: { $ifNull: [{ $first: "$nextExpiry.expiryDate" }, ""] } } },
    { $project: { photos: 0 } }
  ]).toArray();
  const usage = await usageByProduct(db, warehouse._id);
  res.json({ items: rows.map((p) => ({ ...productOut(p), ...forecast(p, usage) })), total: rows.length });
});

app.post("/v1/products", async (req, res) => {
  const b = req.body || {};
  const fields = productFields(b);
  const initial = cleanInt(b.initialQuantity ?? 0);
  if (initial === null) fail(400, "VALIDATION_ERROR", "Quantity must be a non-negative whole number.");
  try {
    const product = await withTx(async (session, db) => {
      const now = new Date();
      const doc = { _id: new ObjectId(), warehouseId: req.warehouse._id, ...fields, quantity: 0, orderStatus: null, archived: false, createdAt: now, updatedAt: now };
      await db.collection("products").insertOne(doc, { session });
      if (initial > 0) {
        return stockIn(db, session, { warehouse: req.warehouse, user: req.user, product: doc, qty: initial, type: "OPENING", reason: "Opening stock", note: "Product registration", expiryDate: b.expiryDate, batchNumber: b.batchNumber, stockInDate: b.stockInDate, remarks: b.remarks });
      }
      return doc;
    });
    res.status(201).json(productOut(product));
  } catch (e) {
    if (e?.code === 11000) fail(409, "DUPLICATE_PRODUCT_CODE", "SKU or barcode already exists in this warehouse.");
    throw e;
  }
});

app.get("/v1/products/lookup/:code", async (req, res) => {
  const code = str(req.params.code, 80);
  const product = await req.db.collection("products").findOne({ warehouseId: req.warehouse._id, archived: false, $or: [{ barcode: code }, { sku: code }] });
  res.json({ found: Boolean(product), product: productOut(product) || null, code });
});

app.patch("/v1/products/thresholds", async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 1000) : [];
  const ops = [];
  for (const it of items) {
    const _id = oid(String(it.id || "")), threshold = cleanInt(it.lowStockThreshold);
    if (!_id || threshold === null) fail(400, "VALIDATION_ERROR", "Each threshold must be a non-negative whole number.");
    ops.push({ updateOne: { filter: { _id, warehouseId: req.warehouse._id }, update: { $set: { lowStockThreshold: threshold, updatedAt: new Date() } } } });
  }
  if (ops.length) await req.db.collection("products").bulkWrite(ops);
  res.json({ updated: ops.length });
});

app.get("/v1/products/:id", async (req, res) => {
  const p = await findProduct(req.db, req.warehouse._id, req.params.id);
  const [batches, reorder] = await Promise.all([
    req.db.collection("batches").find({ productId: p._id, quantity: { $gt: 0 } }).sort({ expiryDate: 1 }).toArray(),
    req.db.collection("reorders").findOne({ productId: p._id, status: { $in: ["PENDING", "CONFIRM_SHIPPING"] } })
  ]);
  const usage = await usageByProduct(req.db, req.warehouse._id);
  res.json({ ...productOut(p), ...forecast(p, usage), batches: batches.map(out), activeReorder: out(reorder) || null });
});

app.patch("/v1/products/:id", async (req, res) => {
  const old = await findProduct(req.db, req.warehouse._id, req.params.id);
  const fields = productFields(req.body || {}, old);
  try {
    const p = await req.db.collection("products").findOneAndUpdate({ _id: old._id }, { $set: { ...fields, updatedAt: new Date() } }, { returnDocument: "after" });
    res.json(productOut(p));
  } catch (e) {
    if (e?.code === 11000) fail(409, "DUPLICATE_PRODUCT_CODE", "SKU or barcode already exists.");
    throw e;
  }
});

app.delete("/v1/products/:id", requireOwner, async (req, res) => {
  const p = await findProduct(req.db, req.warehouse._id, req.params.id);
  // Free the codes so the same barcode can be registered again later.
  await req.db.collection("products").updateOne({ _id: p._id }, { $set: { archived: true, sku: `${p.sku}#archived-${p._id}`, barcode: "", updatedAt: new Date() } });
  res.status(204).end();
});

app.post("/v1/stock/in", async (req, res) => {
  const b = req.body || {};
  const qty = cleanInt(b.quantity, 1);
  if (qty === null) fail(400, "VALIDATION_ERROR", "Enter a positive whole-number quantity.");
  const result = await withTx(async (session, db) => {
    const product = await findProduct(db, req.warehouse._id, b.productId, session);
    return stockIn(db, session, {
      warehouse: req.warehouse, user: req.user, product, qty, reason: b.reason, reference: b.reference, note: b.note,
      expiryDate: b.expiryDate, batchNumber: b.batchNumber, stockInDate: b.stockInDate, remarks: b.remarks
    });
  });
  res.json({ product: productOut(result), before: result.quantity - qty, after: result.quantity, movementType: "IN" });
});

// Push-to-talk review table: each row is keyed by the scanned code. Existing products are
// updated and stocked in; unknown codes become the unique ID of a new product.
app.post("/v1/stock/in/batch", async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length || items.length > 100) fail(400, "VALIDATION_ERROR", "Add between 1 and 100 items before saving.");
  for (const [i, it] of items.entries()) {
    if (!str(it.name) && !str(it.code)) fail(400, "VALIDATION_ERROR", `Row ${i + 1}: a product name or code is required.`);
    if (cleanInt(it.quantity, 1) === null) fail(400, "VALIDATION_ERROR", `Row ${i + 1}: quantity must be a positive whole number.`);
  }
  try {
    const saved = await withTx(async (session, db) => {
      const results = [];
      for (const it of items) {
        const code = str(it.code, 80), name = str(it.name, 160), qty = cleanInt(it.quantity, 1);
        const products = db.collection("products");
        let product = code
          ? await products.findOne({ warehouseId: req.warehouse._id, archived: false, $or: [{ barcode: code }, { sku: code }] }, { session })
          : await products.findOne({ warehouseId: req.warehouse._id, archived: false, name: new RegExp(`^${escapeRegex(name)}$`, "i") }, { session });
        let created = false;
        if (product) {
          const set = { updatedAt: new Date() };
          if (name) set.name = name;
          if (str(it.description)) set.description = str(it.description, 2000);
          if (str(it.unit)) set.unit = str(it.unit, 40);
          if (str(it.remarks)) set.remarks = str(it.remarks, 1000);
          if (str(it.category)) set.category = str(it.category, 80);
          await products.updateOne({ _id: product._id }, { $set: set }, { session });
          product = { ...product, ...set };
        } else {
          const fields = productFields({ ...it, name: name || code, sku: code, barcode: code, remarks: it.remarks });
          const now = new Date();
          product = { _id: new ObjectId(), warehouseId: req.warehouse._id, ...fields, quantity: 0, orderStatus: null, archived: false, createdAt: now, updatedAt: now };
          await products.insertOne(product, { session });
          created = true;
        }
        const updated = await stockIn(db, session, {
          warehouse: req.warehouse, user: req.user, product, qty, type: created ? "OPENING" : "IN",
          reason: "Push-to-talk stock in", note: "", remarks: it.remarks, expiryDate: it.expiryDate, stockInDate: it.stockInDate
        });
        results.push({ ...productOut(updated), created });
      }
      return results;
    });
    res.json({ items: saved });
  } catch (e) {
    if (e?.code === 11000) fail(409, "DUPLICATE_PRODUCT_CODE", "Two rows use the same new code. Merge them and try again.");
    throw e;
  }
});

app.post("/v1/stock/out", async (req, res) => {
  const b = req.body || {};
  const qty = cleanInt(b.quantity, 1);
  if (qty === null) fail(400, "VALIDATION_ERROR", "Enter a positive whole-number quantity.");
  const result = await withTx(async (session, db) => {
    const product = await findProduct(db, req.warehouse._id, b.productId, session);
    // The quantity filter makes the check-and-decrement atomic, so stock can never go negative.
    const updated = await db.collection("products").findOneAndUpdate(
      { _id: product._id, archived: false, quantity: { $gte: qty } },
      { $inc: { quantity: -qty }, $set: { updatedAt: new Date() } },
      { returnDocument: "after", session }
    );
    if (!updated) fail(409, "INSUFFICIENT_STOCK", `Only ${product.quantity} ${product.unit} available.`);
    await consumeBatches(db, session, req.warehouse._id, product._id, qty);
    await recordMovement(db, session, {
      warehouse: req.warehouse, user: req.user, product: updated, type: "OUT", delta: -qty, beforeQty: updated.quantity + qty,
      afterQty: updated.quantity, reason: b.reason || "Ship out", reference: b.reference, note: b.note || b.destination
    });
    return updated;
  });
  res.json({ product: productOut(result), before: result.quantity + qty, after: result.quantity, movementType: "OUT" });
});

app.post("/v1/stock/counts", async (req, res) => {
  const b = req.body || {};
  const counted = cleanInt(b.countedQuantity);
  if (counted === null) fail(400, "VALIDATION_ERROR", "Enter a non-negative whole-number count.");
  const result = await withTx(async (session, db) => {
    const p = await findProduct(db, req.warehouse._id, b.productId, session);
    if (counted !== p.quantity && !str(b.reason)) fail(400, "REASON_REQUIRED", "A reason is required when the physical count differs from system stock.");
    const updated = await db.collection("products").findOneAndUpdate(
      { _id: p._id, quantity: p.quantity },
      { $set: { quantity: counted, updatedAt: new Date() } },
      { returnDocument: "after", session }
    );
    if (!updated) fail(409, "STOCK_CHANGED", "Stock changed during the count. Refresh and confirm again.");
    if (counted < p.quantity) await consumeBatches(db, session, req.warehouse._id, p._id, p.quantity - counted);
    await recordMovement(db, session, {
      warehouse: req.warehouse, user: req.user, product: updated, type: "COUNT_ADJUSTMENT", delta: counted - p.quantity,
      beforeQty: p.quantity, afterQty: counted, reason: b.reason || "Physical count matched", note: b.note
    });
    return { updated, before: p.quantity };
  });
  res.json({ product: productOut(result.updated), before: result.before, counted, delta: counted - result.before });
});

app.post("/v1/voice/parse", (req, res) => res.json(parseVoice(str(req.body?.text, 1000))));

app.get("/v1/movements", async (req, res) => {
  const filter = { warehouseId: req.warehouse._id };
  if (req.query.productId) filter.productId = oid(String(req.query.productId));
  if (req.query.type) filter.type = str(req.query.type, 30);
  const rows = await req.db.collection("movements").find(filter).sort({ createdAt: -1 }).limit(500).toArray();
  res.json({ items: rows.map(out) });
});

app.get("/v1/alerts", async (req, res) => {
  const { db, warehouse } = req;
  const days = warehouseOut(warehouse).settings.expiryAlertDays;
  const base = { warehouseId: warehouse._id, archived: false };
  const proj = { projection: { photos: 0 } };
  const [outRows, lowRows, healthyRows, usage, batches] = await Promise.all([
    db.collection("products").find({ ...base, quantity: { $lte: 0 } }, proj).sort({ name: 1 }).toArray(),
    db.collection("products").find({ ...base, quantity: { $gt: 0 }, $expr: { $lte: ["$quantity", "$lowStockThreshold"] } }, proj).sort({ quantity: 1 }).toArray(),
    db.collection("products").find({ ...base, $expr: { $gt: ["$quantity", "$lowStockThreshold"] } }, proj).toArray(),
    usageByProduct(db, warehouse._id),
    db.collection("batches").aggregate([
      { $match: { warehouseId: warehouse._id, quantity: { $gt: 0 }, expiryDate: { $gt: "", $lte: addDays(days) } } },
      { $sort: { expiryDate: 1 } },
      { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "p" } },
      { $unwind: "$p" },
      { $match: { "p.archived": false } }
    ]).toArray()
  ]);
  const now = today();
  const items = [
    ...outRows.map((p) => ({ type: "OUT_OF_STOCK", productId: String(p._id), name: p.name, sku: p.sku, quantity: p.quantity, unit: p.unit, threshold: p.lowStockThreshold, orderStatus: p.orderStatus })),
    ...lowRows.map((p) => ({ type: "LOW_STOCK", productId: String(p._id), name: p.name, sku: p.sku, quantity: p.quantity, unit: p.unit, threshold: p.lowStockThreshold, orderStatus: p.orderStatus })),
    // Predictive: still above its threshold, but at the current pace it will be gone within a week.
    ...healthyRows.map((p) => ({ p, f: forecast(p, usage) })).filter(({ f }) => f.daysLeft !== null && f.daysLeft <= 7)
      .sort((a, b) => a.f.daysLeft - b.f.daysLeft)
      .map(({ p, f }) => ({ type: "RUNNING_OUT", productId: String(p._id), name: p.name, sku: p.sku, quantity: p.quantity, unit: p.unit, threshold: p.lowStockThreshold, orderStatus: p.orderStatus, ...f })),
    ...batches.map((b) => ({
      type: b.expiryDate < now ? "EXPIRED" : "EXPIRY", productId: String(b.productId), batchId: String(b._id), name: b.p.name, sku: b.p.sku,
      quantity: b.quantity, unit: b.p.unit, expiryDate: b.expiryDate,
      daysLeft: Math.round((new Date(b.expiryDate) - new Date(now)) / 86_400_000)
    }))
  ];
  res.json({ items, expiryAlertDays: days });
});

app.get("/v1/reorders", async (req, res) => {
  const filter = { warehouseId: req.warehouse._id };
  if (req.query.status === "active") filter.status = { $in: ["PENDING", "CONFIRM_SHIPPING"] };
  const rows = await req.db.collection("reorders").find(filter).sort({ createdAt: -1 }).limit(300).toArray();
  res.json({ items: rows.map(out) });
});

app.post("/v1/reorders", async (req, res) => {
  const b = req.body || {};
  const qty = cleanInt(b.quantity, 1);
  if (qty === null) fail(400, "VALIDATION_ERROR", "Enter a positive whole-number quantity to reorder.");
  const reorder = await withTx(async (session, db) => {
    const p = await findProduct(db, req.warehouse._id, b.productId, session);
    const active = await db.collection("reorders").findOne({ productId: p._id, status: { $in: ["PENDING", "CONFIRM_SHIPPING"] } }, { session });
    if (active) fail(409, "REORDER_EXISTS", "There is already an open order for this product.");
    const now = new Date();
    const doc = {
      _id: new ObjectId(), warehouseId: req.warehouse._id, productId: p._id, productName: p.name, sku: p.sku, unit: p.unit,
      supplier: str(b.supplier, 160) || p.supplier, supplierPhone: str(b.supplierPhone, 60) || p.supplierPhone || "",
      quantity: qty, note: str(b.note, 1000), status: "PENDING", history: [{ status: "PENDING", at: now, by: req.user.name }],
      createdAt: now, updatedAt: now
    };
    await db.collection("reorders").insertOne(doc, { session });
    await db.collection("products").updateOne({ _id: p._id }, { $set: { orderStatus: "PENDING", updatedAt: now } }, { session });
    return doc;
  });
  res.status(201).json(out(reorder));
});

app.patch("/v1/reorders/:id", async (req, res) => {
  const status = str(req.body?.status, 30);
  const result = await withTx(async (session, db) => {
    const r = await db.collection("reorders").findOne({ _id: oid(req.params.id), warehouseId: req.warehouse._id }, { session });
    if (!r) fail(404, "NOT_FOUND", "Order not found.");
    if (!(REORDER_FLOW[r.status] || []).includes(status)) fail(400, "INVALID_STATUS", `An order that is ${r.status} cannot move to ${status || "that status"}.`);
    const now = new Date();
    const received = status === "RECEIVED" ? cleanInt(req.body?.receivedQuantity ?? r.quantity, 1) : null;
    if (status === "RECEIVED" && received === null) fail(400, "VALIDATION_ERROR", "Received quantity must be a positive whole number.");
    const updated = await db.collection("reorders").findOneAndUpdate(
      { _id: r._id, status: r.status },
      { $set: { status, updatedAt: now, ...(received ? { receivedQuantity: received } : {}) }, $push: { history: { status, at: now, by: req.user.name } } },
      { returnDocument: "after", session }
    );
    if (!updated) fail(409, "ORDER_CHANGED", "The order changed. Refresh and try again.");
    const product = await db.collection("products").findOne({ _id: r.productId }, { session });
    if (product) {
      await db.collection("products").updateOne({ _id: r.productId }, { $set: { orderStatus: ["RECEIVED", "CANCELLED"].includes(status) ? null : status, updatedAt: now } }, { session });
      if (received && !product.archived) {
        await stockIn(db, session, { warehouse: req.warehouse, user: req.user, product, qty: received, reason: "Supplier order received", reference: `ORDER-${String(r._id).slice(-6).toUpperCase()}`, note: r.supplier, expiryDate: req.body?.expiryDate });
      }
    }
    return updated;
  });
  res.json(out(result));
});

app.get("/v1/warehouse", (req, res) => res.json(warehouseOut(req.warehouse)));
app.patch("/v1/warehouse", requireOwner, async (req, res) => {
  const b = req.body || {};
  const current = warehouseOut(req.warehouse);
  const set = {
    name: b.name !== undefined ? str(b.name, 120) : current.name,
    location: b.location !== undefined ? str(b.location, 160) : current.location,
    language: ["en", "my"].includes(b.language) ? b.language : current.language,
    settings: { ...current.settings }
  };
  if (!set.name) fail(400, "VALIDATION_ERROR", "Warehouse name is required.");
  if (b.settings?.expiryAlertDays !== undefined) {
    const d = cleanInt(b.settings.expiryAlertDays, 1);
    if (d === null || d > 365) fail(400, "VALIDATION_ERROR", "Expiry reminder must be between 1 and 365 days.");
    set.settings.expiryAlertDays = d;
  }
  if (b.settings?.defaultLowStockThreshold !== undefined) {
    const t = cleanInt(b.settings.defaultLowStockThreshold);
    if (t === null) fail(400, "VALIDATION_ERROR", "Default threshold must be a non-negative whole number.");
    set.settings.defaultLowStockThreshold = t;
  }
  const w = await req.db.collection("warehouses").findOneAndUpdate({ _id: req.warehouse._id }, { $set: set }, { returnDocument: "after" });
  res.json(warehouseOut(w));
});

app.use((req, res) => res.status(404).json({ error: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` }));
app.use((err, _req, res, _next) => {
  if (err?.status && err.error) return res.status(err.status).json({ error: err.error, message: err.message });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "TOO_LARGE", message: "Photos are too large. Use fewer or smaller images." });
  const dbDown = /ECONNREFUSED|Server selection timed out|MongoServerSelectionError/i.test(String(err?.message || err?.name));
  console.error("Unhandled API error:", err?.message || err);
  res.status(dbDown ? 503 : 500).json(dbDown
    ? { error: "DATABASE_UNAVAILABLE", message: "Cannot reach the MongoDB database. Check that it is running and MONGODB_URI is correct." }
    : { error: "INTERNAL_ERROR", message: "Unexpected server error." });
});

export default app;
