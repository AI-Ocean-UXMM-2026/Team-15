// Rebuilds the demo account's products and 30-day history (other accounts are untouched).
// Usage: node scripts/reset-demo.js            (uses MONGODB_URI from api/.env)
//        MONGODB_URI="mongodb+srv://..." node scripts/reset-demo.js
import "dotenv/config";
import { getDb, resetDemoWarehouse } from "../_lib/db.js";

const db = await getDb();
console.log(await resetDemoWarehouse(db));
process.exit(0);
