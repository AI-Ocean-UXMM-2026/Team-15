// Turns a push-to-talk transcript such as "Instant noodle, 40 pack, spicy flavour"
// or "ခေါက်ဆွဲ ၄၀ ထုပ်" into { name, quantity, unit, description }.
// The user always reviews the result before it is saved, so this only needs to be a good first guess.

const MY_DIGITS = "၀၁၂၃၄၅၆၇၈၉";
const EN_NUMBERS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
};
const MY_NUMBERS = { "တစ်": 1, "နှစ်": 2, "သုံး": 3, "လေး": 4, "ငါး": 5, "ခြောက်": 6, "ခုနစ်": 7, "ခုနှစ်": 7, "ရှစ်": 8, "ကိုး": 9 };
const MY_UNITS = ["ထုပ်", "ဘူး", "ဗူး", "ပုလင်း", "ခု", "လုံး", "အိတ်", "ကတ်", "ကတ်တွန်း", "သေတ္တာ", "ထည်", "စုံ", "ကီလို", "ပိဿာ", "ချောင်း"];

const toAsciiDigits = (s) => s.replace(/[၀-၉]/g, (d) => String(MY_DIGITS.indexOf(d)));

function englishWordsToNumber(text) {
  // "forty two packs" -> "42 packs", "one hundred bottles" -> "100 bottles"
  return text.replace(/\b((?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|and|[\s-])+)\b/gi, (match) => {
    const words = match.toLowerCase().split(/[\s-]+/).filter((w) => w && w !== "and");
    if (!words.length || !words.some((w) => w in EN_NUMBERS || w === "hundred" || w === "thousand")) return match;
    let total = 0, current = 0;
    for (const w of words) {
      if (w in EN_NUMBERS) current += EN_NUMBERS[w];
      else if (w === "hundred") current = (current || 1) * 100;
      else if (w === "thousand") { total += (current || 1) * 1000; current = 0; }
    }
    const lead = /^\s/.test(match) ? " " : "", trail = /\s$/.test(match) ? " " : "";
    return `${lead}${total + current}${trail}`;
  });
}

function burmeseWordsToNumber(text) {
  // "လေးဆယ်" -> 40, "နှစ်ရာ့ငါးဆယ်" -> 250, "ဆယ့်ငါး" -> 15
  const digit = Object.keys(MY_NUMBERS).sort((a, b) => b.length - a.length).join("|");
  const re = new RegExp(`(?:(${digit})?(?:ထောင်|ထောင့်))?(?:(${digit})?(?:ရာ|ရာ့))?(?:(${digit})?(?:ဆယ်|ဆယ့်))?(${digit})?`, "g");
  return text.replace(re, (m, th, h, t, u) => {
    if (!m) return m;
    const hasScale = /ထောင|ရာ|ဆယ/.test(m);
    if (!hasScale && !u) return m;
    const v = (x) => (x ? MY_NUMBERS[x] : 1);
    let n = 0;
    if (/ထောင/.test(m)) n += v(th) * 1000;
    if (/ရာ/.test(m)) n += v(h) * 100;
    if (/ဆယ/.test(m)) n += v(t) * 10;
    if (u) n += MY_NUMBERS[u];
    return ` ${n} `;
  });
}

// ---------- spoken expiry dates ----------
// "expires in 2 months", "best before Dec 2026", "12/2026", "၂ လ နေရင် ကုန်မယ်", "ဒီဇင်ဘာ ကုန်".
const EN_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MY_MONTHS = ["ဇန်နဝါရီ", "ဖေဖော်ဝါရီ", "မတ်", "ဧပြီ", "မေ", "ဇွန်", "ဇူလိုင်", "သြဂုတ်", "စက်တင်ဘာ", "အောက်တိုဘာ", "နိုဝင်ဘာ", "ဒီဇင်ဘာ"];
// What may follow a Burmese date word: a space, punctuation, a digit, or the usual "နေရင် ကုန်မယ်" endings.
const MY_END = "(?=\\s|$|[,.။]|\\d|နေ|ကုန်|အတွင်း|လောက်|ကြာ|ခံ)";
const EXP_WORD = "(?:exp(?:ires?|iry|iring|\\.)?|best\\s+before|use\\s+by|good\\s+(?:for|until)|until|till)";
const MY_TAIL = "(?:\\s*(?:နေရင်|နေလျှင်|အတွင်း|လောက်|ကြာရင်))?(?:\\s*(?:ကုန်(?:မယ်|မည်|တယ်)?|ခံ(?:မယ်|တယ်)?))?";

const iso = (d) => d.toISOString().slice(0, 10);
const lastDayOf = (year, month0) => iso(new Date(Date.UTC(year, month0 + 1, 0)));
function fullYear(y) { const n = Number(y); return n < 100 ? 2000 + n : n; }

function findExpiry(text, todayISO) {
  const now = new Date(`${todayISO}T00:00:00Z`);
  const add = (n, unit) => {
    const d = new Date(now);
    if (/^(day|ရက်)/i.test(unit)) d.setUTCDate(d.getUTCDate() + n);
    else if (/^(week|ပတ်)/i.test(unit)) d.setUTCDate(d.getUTCDate() + 7 * n);
    else if (/^(month|လ)/i.test(unit)) d.setUTCMonth(d.getUTCMonth() + n);
    else d.setUTCFullYear(d.getUTCFullYear() + n);
    return iso(d);
  };
  const monthEnd = (m0, year) => {
    let y = year ? fullYear(year) : now.getUTCFullYear();
    if (!year && m0 < now.getUTCMonth()) y += 1; // "December" said in January means this year; "March" said in May means next year
    return lastDayOf(y, m0);
  };
  const rules = [
    // 2026-12-31, 2026/12
    [/\b(20\d{2})[\/.-](\d{1,2})(?:[\/.-](\d{1,2}))?\b/, (m) => m[3] ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : lastDayOf(+m[1], +m[2] - 1)],
    // 31/12/2026, 31-12-26
    [/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4}|\d{2})\b/, (m) => `${fullYear(m[3])}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`],
    // 12/2026
    [/\b(\d{1,2})[\/.-](20\d{2})\b/, (m) => lastDayOf(+m[2], +m[1] - 1)],
    // expires in 2 months / 10 days / within 3 weeks
    [new RegExp(`(?:${EXP_WORD}\\s*(?:in|on|by|for|within)?\\s*|\\b(?:in|within)\\s+)?\\b(\\d+)\\s*(days?|weeks?|months?|years?)\\b(?:\\s*(?:left|later))?`, "i"), (m) => add(+m[1], m[2])],
    // expires in a month
    [new RegExp(`(?:${EXP_WORD}\\s*)?\\b(?:in|within)\\s+an?\\s+(day|week|month|year)\\b`, "i"), (m) => add(1, m[1])],
    // expires December (2026) — English month names need an expiry word, since "may" is also a verb
    [new RegExp(`${EXP_WORD}\\s*(?:in|on|by|date)?\\s*(${EN_MONTHS.join("|")})[a-z]*\\.?(?:\\s+(\\d{4}))?`, "i"), (m) => monthEnd(EN_MONTHS.indexOf(m[1].toLowerCase()), m[2])],
    // ၂ လ နေရင် ကုန်မယ် / ၁၀ ရက် / ၃ ပတ် / ၁ နှစ် — the lookahead stops "၄၀ လုံး" (40 pieces) matching as months
    [new RegExp(`(?:သက်တမ်း\\s*)?(\\d+)\\s*(ရက်|ပတ်|နှစ်|yr|လ)${MY_END}${MY_TAIL}`), (m) => add(+m[1], m[2] === "yr" ? "year" : m[2])],
    // ဒီဇင်ဘာ (၂၀၂၆) ကုန် — a month glued to other letters (e.g. မေတ္တာ) is not a date
    [new RegExp(`(?:သက်တမ်း\\s*)?(${MY_MONTHS.join("|")})(?:လ)?${MY_END}\\s*(20\\d{2})?${MY_TAIL}`), (m) => monthEnd(MY_MONTHS.indexOf(m[1]), m[2])]
  ];
  for (const [re, toDate] of rules) {
    const m = text.match(re);
    if (!m) continue;
    const date = toDate(m);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) continue;
    return { expiryDate: date, expiryText: m[0].trim(), rest: `${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}` };
  }
  return { expiryDate: "", expiryText: "", rest: text };
}

export function parseVoice(raw = "", { today = new Date().toISOString().slice(0, 10) } = {}) {
  const transcript = String(raw).trim();
  let text = toAsciiDigits(transcript);
  text = englishWordsToNumber(text);
  // Only fall back to spelled-out Burmese numbers when no digits were recognised,
  // because words such as ငါး (five / fish) also appear in product names.
  const hadDigits = /\d/.test(text);
  if (/[က-႟]/.test(text)) {
    // Spelled-out durations ("နှစ်လ" = 2 months, "တစ်နှစ်" = 1 year) are always safe to convert,
    // and the year word is marked "yr" so နှစ် is not read as the number two.
    const digitWords = Object.keys(MY_NUMBERS).sort((a, b) => b.length - a.length).join("|");
    text = text.replace(new RegExp(`(${digitWords})\\s*(နှစ်|လ|ပတ်|ရက်)${MY_END}`, "g"), (_, w, u) => ` ${MY_NUMBERS[w]} ${u === "နှစ်" ? "yr" : u}`);
    if (!hadDigits) text = burmeseWordsToNumber(text);
  }
  text = text.replace(/^\s*(add|stock in|receive)\b[:,]?\s*/i, "");

  // Pull the expiry phrase out first, so "2 months" is not mistaken for the quantity.
  const exp = findExpiry(text, today);
  text = exp.rest;
  const expiry = { expiryDate: exp.expiryDate, expiryText: exp.expiryText };

  const m = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return { transcript, name: cleanup(text), quantity: null, unit: "", description: "", ...expiry };

  const quantity = Math.round(Number(m[1].replace(",", ".")));
  const before = cleanup(text.slice(0, m.index));
  let after = text.slice(m.index + m[1].length).trim();

  let unit = "";
  const myUnit = MY_UNITS.sort((a, b) => b.length - a.length).find((u) => after.startsWith(u));
  if (myUnit) {
    unit = myUnit;
    after = after.slice(myUnit.length);
  } else {
    const w = after.match(/^([A-Za-z]+)\b/);
    if (w && !/^(of|and|with)$/i.test(w[1])) { unit = w[1].toLowerCase(); after = after.slice(w[0].length); }
  }
  after = cleanup(after.replace(/^\s*(of)\b/i, ""));
  // "40 packs of instant noodles": the name comes after the quantity.
  const name = before || after;
  const description = before ? after : "";
  return { transcript, name, quantity: Number.isSafeInteger(quantity) ? quantity : null, unit, description, ...expiry };
}

function cleanup(s) {
  return s.replace(/\s+/g, " ").replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "").trim();
}
