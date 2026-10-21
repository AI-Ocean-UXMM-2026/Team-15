// Adds missing demo products and sets demo shelf lives without deleting anything.
// Usage: MONGODB_URI="mongodb+srv://..." node scripts/update-demo.js
import "dotenv/config";
import { getDb, ensureDemoProducts } from "../_lib/db.js";

const db = await getDb();
console.log(await ensureDemoProducts(db));
process.exit(0);
