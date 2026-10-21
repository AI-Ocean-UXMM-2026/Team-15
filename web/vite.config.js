import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the API runs on :4000; proxying keeps the frontend on same-origin paths,
// exactly like production on Vercel where /v1 is served by the serverless function.
const api = process.env.API_PROXY || "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/v1": api, "/health": api, "/api/docs": api } },
  build: { outDir: "dist" }
});
