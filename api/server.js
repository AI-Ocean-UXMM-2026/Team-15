// Local development entry point. On Vercel, api/index.js exports the same app as a serverless function.
import "dotenv/config"; // must stay first: the modules below read process.env when they load
import { getDb } from "./_lib/db.js";
import app from "./_lib/app.js";

const port = Number(process.env.PORT || 4000);

getDb()
  .then(() => console.log(`Connected to MongoDB (${process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"})`))
  .catch((e) => console.error(`MongoDB connection failed: ${e.message}\nIs MongoDB running? Check MONGODB_URI in api/.env`));

app.listen(port, () => console.log(`Invento API listening on http://localhost:${port}`));
