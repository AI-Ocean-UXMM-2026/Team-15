import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

// Files and folders starting with "_" inside api/ are not turned into Vercel functions,
// so shared code lives here and both api/server.js (local) and api/index.js (Vercel) import it.

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "invento";

// Reuse one client across hot reloads and warm serverless invocations.
const g = globalThis;
g.__invento ||= { client: null, ready: null };

export const DEMO = { email: "demo@invento.local", password: "InventoDemo!2026" };

export async function getDb() {
  if (!g.__invento.ready) {
    g.__invento.ready = (async () => {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 10 });
      await client.connect();
      const db = client.db(dbName);
      // Multi-document transactions need a replica set (MongoDB Atlas always is one).
      // A plain local `mongod` is standalone, so we fall back to ordered writes there.
      const hello = await db.admin().command({ hello: 1 }).catch(() => ({}));
      const supportsTx = Boolean(hello.setName || hello.msg === "isdbgrid");
      g.__invento.client = client;
      g.__invento.supportsTx = supportsTx;
      await ensureIndexes(db);
      if (process.env.SEED_DEMO !== "false") await seedDemo(db);
      return db;
    })().catch((e) => { g.__invento.ready = null; throw e; });
  }
  return g.__invento.ready;
}

/** Runs fn(session) in a transaction when the server supports it, otherwise without one. */
export async function withTx(fn) {
  const db = await getDb();
  if (!g.__invento.supportsTx) return fn(undefined, db);
  const session = g.__invento.client.startSession();
  let result;
  try {
    await session.withTransaction(async () => { result = await fn(session, db); });
    return result;
  } finally {
    await session.endSession();
  }
}

export const oid = (value) => (typeof value === "string" && ObjectId.isValid(value) && value.length === 24 ? new ObjectId(value) : null);

async function ensureIndexes(db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("warehouses").createIndex({ ownerId: 1 }),
    db.collection("products").createIndex({ warehouseId: 1, sku: 1 }, { unique: true }),
    db.collection("products").createIndex(
      { warehouseId: 1, barcode: 1 },
      { unique: true, partialFilterExpression: { barcode: { $type: "string", $gt: "" } } }
    ),
    db.collection("products").createIndex({ warehouseId: 1, archived: 1, name: 1 }),
    db.collection("batches").createIndex({ warehouseId: 1, productId: 1, expiryDate: 1 }),
    db.collection("movements").createIndex({ warehouseId: 1, createdAt: -1 }),
    db.collection("movements").createIndex({ warehouseId: 1, productId: 1, createdAt: -1 }),
    db.collection("reorders").createIndex({ warehouseId: 1, status: 1, createdAt: -1 })
  ]);
}

export const defaultSettings = { expiryAlertDays: 30, defaultLowStockThreshold: 5 };

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function seedDemo(db) {
  if (await db.collection("users").countDocuments({}, { limit: 1 })) return;
  const now = new Date();
  const userId = new ObjectId();
  const warehouseId = new ObjectId();
  try {
    await db.collection("users").insertOne({
      _id: userId, name: "Demo Owner", email: DEMO.email,
      passwordHash: bcrypt.hashSync(DEMO.password, 10), role: "OWNER", warehouseId, createdAt: now
    });
  } catch (e) {
    if (e?.code === 11000) return; // another cold start seeded first
    throw e;
  }
  await db.collection("warehouses").insertOne({
    _id: warehouseId, ownerId: userId, name: "Yangon Demo Warehouse", location: "Yangon, Myanmar",
    language: "en", timezone: "Asia/Yangon", settings: { ...defaultSettings }, createdAt: now
  });
  // The PRD demo scenario: noodles, bottled water and bread, plus a couple of extra lines.
  const seed = [
    { name: "Instant Noodles", sku: "890100000001", category: "Food & Beverage", unit: "packs", supplier: "Golden Myanmar Trading", supplierPhone: "09 420 000 111", lowStockThreshold: 20, quantity: 40, expiry: addDays(60) },
    { name: "Bottled Water 600ml", sku: "890100000002", category: "Food & Beverage", unit: "bottles", supplier: "Shwe Pyi Supplier", supplierPhone: "09 420 000 222", lowStockThreshold: 24, quantity: 12, expiry: addDays(180) },
    { name: "White Bread", sku: "890100000003", category: "Food & Beverage", unit: "loaves", supplier: "City Bakery", supplierPhone: "09 420 000 333", lowStockThreshold: 10, quantity: 6, expiry: addDays(3) },
    { name: "Laundry Powder 1kg", sku: "890100000004", category: "Household", unit: "bags", supplier: "Mandalay Wholesale", supplierPhone: "09 420 000 444", lowStockThreshold: 8, quantity: 0 },
    { name: "Toothpaste 100g", sku: "890100000005", category: "Personal Care", unit: "tubes", supplier: "Golden Myanmar Trading", supplierPhone: "09 420 000 111", lowStockThreshold: 10, quantity: 28 }
  ];
  for (const s of seed) {
    const productId = new ObjectId();
    await db.collection("products").insertOne({
      _id: productId, warehouseId, name: s.name, description: "", sku: s.sku, barcode: s.sku, category: s.category,
      unit: s.unit, supplier: s.supplier, supplierPhone: s.supplierPhone, supplierEmail: "", fdaCode: "", photos: [],
      remarks: "", lowStockThreshold: s.lowStockThreshold, quantity: s.quantity, orderStatus: null, archived: false,
      createdAt: now, updatedAt: now
    });
    if (s.quantity > 0) {
      let batchId = null;
      if (s.expiry) {
        batchId = new ObjectId();
        await db.collection("batches").insertOne({ _id: batchId, warehouseId, productId, lotNumber: "", expiryDate: s.expiry, stockInDate: now.toISOString().slice(0, 10), quantity: s.quantity, remarks: "", createdAt: now });
      }
      await db.collection("movements").insertOne({
        warehouseId, productId, actorId: userId, productName: s.name, sku: s.sku, actorName: "Demo Owner",
        type: "OPENING", delta: s.quantity, beforeQty: 0, afterQty: s.quantity, reason: "Initial stock",
        reference: "", note: "Seeded demo data", batchId, createdAt: now
      });
    }
  }
}
