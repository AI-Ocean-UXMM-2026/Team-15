// Picks the expiry date out of text read from a package photo (OCR), e.g.
// "MFG 12/03/2026  EXP 11/03/2028", "BEST BEFORE 31 DEC 2026", "EXP.2027-05", "BB: 05.2027".
// Plain JavaScript (no DOM) so the API test suite can check it.

const MONTHS = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, SEPT: 9, OCT: 10, NOV: 11, DEC: 12 };
const MON = "(JAN|FEB|MAR|APR|MAY|JUNE?|JULY?|AUG|SEPT?|OCT|NOV|DEC)[A-Z]*\\.?";
const EXP_WORDS = /(EXP(IRY|IRES|IRATION)?|E\.?X\.?P|BEST\s*BEFORE|BEST\s*BY|BB[E]?|USE\s*BY|USE\s*BEFORE|VALID\s*UNTIL|CONSUME\s*BEFORE|ED|သက်တမ်းကုန်)\W{0,6}(DATE)?\W{0,4}$/;
const MFG_WORDS = /(MFG|MFD|MF|MANUF\w*|PROD\w*|PRD|PKD|PACK\w*|DOM|DATE\s*OF\s*MAN\w*|LOT|BATCH|ထုတ်လုပ်)\W{0,6}(DATE)?\W{0,4}$/;

const pad = (n) => String(n).padStart(2, "0");
const year4 = (y) => { const n = Number(y); return n < 100 ? 2000 + n : n; };
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
function iso(y, m, d) {
  y = year4(y); m = Number(m); d = d === undefined ? lastDay(y, m) : Number(d);
  if (!(m >= 1 && m <= 12) || !(d >= 1 && d <= lastDay(y, m)) || y < 2000 || y > 2100) return "";
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Fixes the usual OCR mix-ups inside numbers: O→0, I/l/|→1, S→5, B→8 next to digits. */
function cleanDigits(text) {
  return text
    .replace(/(?<=\d)[Oo]|[Oo](?=\d)/g, "0")
    .replace(/(?<=\d)[Il|!]|[Il|!](?=\d)/g, "1")
    .replace(/(?<=\d)S(?=\d)/g, "5")
    .replace(/(?<=\d)B(?=\d)/g, "8");
}

function candidates(text) {
  const out = [];
  // `group` points at the part of the match that is the date itself, when the pattern also includes a label.
  const add = (m, date, group) => {
    if (!date) return;
    const raw = group ? m[group] : m[0].trim();
    out.push({ date, index: m.index + (group ? m[0].lastIndexOf(m[group]) : 0), raw });
  };
  const scan = (re, fn, group) => { for (const m of text.matchAll(re)) add(m, fn(m), group); };
  // 2026-12-31, 2026/12/31, 2026.12
  scan(/\b(20\d{2})\s?[-/.]\s?(\d{1,2})(?:\s?[-/.]\s?(\d{1,2}))?\b/g, (m) => iso(m[1], m[2], m[3]));
  // 31/12/2026, 31.12.26, 12-31-2026 (day first unless the first number cannot be a day... or month)
  scan(/\b(\d{1,2})\s?[-/.]\s?(\d{1,2})\s?[-/.]\s?(\d{4}|\d{2})\b/g, (m) => {
    const a = Number(m[1]), b = Number(m[2]);
    return b > 12 && a <= 12 ? iso(m[3], a, b) : iso(m[3], b, a);
  });
  // OCR often drops one separator or reads it as a space: "3112/2027", "31/122027", "31 12 2027"
  scan(/\b(\d{2})(\d{2})\s?[-/.]\s?(20\d{2})\b/g, (m) => iso(m[3], m[2], m[1]));
  scan(/\b(\d{1,2})\s?[-/.]\s?(\d{2})(20\d{2})\b/g, (m) => iso(m[3], m[2], m[1]));
  scan(/\b(\d{1,2}) (\d{1,2}) (20\d{2})\b/g, (m) => iso(m[3], m[2], m[1]));
  // 8 digits right after an expiry word: 31122027 or 20271231
  scan(/(?:EXP|BB|BEST BEFORE|USE BY)\W{0,4}(\d{8})\b/g, (m) => {
    const s = m[1];
    return s.startsWith("20") ? iso(s.slice(0, 4), s.slice(4, 6), s.slice(6)) : iso(s.slice(4), s.slice(2, 4), s.slice(0, 2));
  }, 1);
  // 12/2026, 05.27 is too ambiguous without a 4-digit year, so only MM/YYYY here
  scan(/(?<![\d/.-])(\d{1,2})\s?[-/.]\s?(20\d{2})\b/g, (m) => iso(m[2], m[1]));
  // 31 DEC 2026, 31-DEC-26, 31DEC2026
  scan(new RegExp(`\\b(\\d{1,2})\\s?[-/. ]?\\s?${MON}\\s?[-/. ,]?\\s?(\\d{4}|\\d{2})\\b`, "g"), (m) => iso(m[3], MONTHS[m[2].slice(0, 3)], m[1]));
  // DEC 31 2026, DEC 31, 2026
  scan(new RegExp(`\\b${MON}\\s?(\\d{1,2}),?\\s(\\d{4})\\b`, "g"), (m) => iso(m[3], MONTHS[m[1].slice(0, 3)], m[2]));
  // DEC 2026, DEC-26
  scan(new RegExp(`(?<!\\d\\s?[-/. ]?)\\b${MON}\\s?[-/. ,]?\\s?(\\d{4}|\\d{2})\\b(?!\\s?[-/.]\\d)`, "g"), (m) => iso(m[2], MONTHS[m[1].slice(0, 3)]));
  return out;
}

/**
 * Returns { expiryDate, matched, sure } where `sure` means an EXP / BEST BEFORE / USE BY label
 * was found next to the date. Manufacturing dates (MFG / MFD / PKD) are skipped.
 */
export function findExpiryInText(raw = "", todayISO = new Date().toISOString().slice(0, 10)) {
  const text = cleanDigits(String(raw).toUpperCase().replace(/\s+/g, " "));
  const found = candidates(text);
  if (!found.length) return { expiryDate: "", matched: "", sure: false };
  // Drop dates contained in a longer match at the same place (e.g. "12/2026" inside "31/12/2026").
  const unique = found.filter((c) => !found.some((o) => o !== c && o.index <= c.index && o.index + o.raw.length >= c.index + c.raw.length && o.raw.length > c.raw.length));
  const scored = unique.map((c) => {
    const before = text.slice(Math.max(0, c.index - 24), c.index);
    let score = 0;
    if (EXP_WORDS.test(before)) score += 3;
    if (MFG_WORDS.test(before)) score -= 3;
    if (c.date > todayISO) score += 1;
    return { ...c, score };
  });
  scored.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
  const best = scored[0];
  // Only manufacturing / packing dates were readable: better to say "not found" than save the wrong date.
  if (best.score <= -2) return { expiryDate: "", matched: "", sure: false };
  // With no label at all and several dates, the later one is the expiry (MFG always comes first).
  return { expiryDate: best.date, matched: best.raw, sure: best.score >= 3 };
}
