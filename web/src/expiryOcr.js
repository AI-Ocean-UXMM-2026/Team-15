// Reads the expiry date from a photo of a package, entirely in the browser.
// tesseract.js is loaded only when someone scans, and downloads its English model on first use (~4 MB).
import { findExpiryInText } from "./expiryText.js";

let workerPromise = null;
async function getWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(({ createWorker }) => createWorker("eng"))
      .catch((e) => { workerPromise = null; throw e; });
  }
  return workerPromise;
}

/** Grayscale + contrast stretch, scaled so the long side is ~1600px; small printed dates read much better. */
async function prepare(file) {
  // createImageBitmap is used instead of img.decode(), which can stall in background tabs and webviews.
  const img = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => createImageBitmap(file));
  try {
    const scale = Math.min(2, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const px = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = px.data;
    let min = 255, max = 0;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = g;
      if (g < min) min = g;
      if (g > max) max = g;
    }
    const range = Math.max(1, max - min);
    for (let i = 0; i < d.length; i += 4) {
      const v = ((d[i] - min) / range) * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(px, 0, 0);
    return canvas;
  } finally {
    img.close?.();
  }
}

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("OCR_TIMEOUT")), ms));

/** Returns { expiryDate, matched, sure, text }. Gives up after 90 s so the screen never stays stuck. */
export async function readExpiryFromPhoto(file, today) {
  const run = async () => {
    const [worker, canvas] = await Promise.all([getWorker(), prepare(file)]);
    const { data } = await worker.recognize(canvas);
    return { ...findExpiryInText(data.text, today), text: data.text.trim() };
  };
  return Promise.race([run(), timeout(90_000)]);
}

/** Starts downloading the OCR model in the background so the first scan is quicker. */
export function warmUpOcr() { getWorker().catch(() => {}); }
