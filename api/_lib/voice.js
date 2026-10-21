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

export function parseVoice(raw = "") {
  const transcript = String(raw).trim();
  let text = toAsciiDigits(transcript);
  text = englishWordsToNumber(text);
  // Only fall back to spelled-out Burmese numbers when no digits were recognised,
  // because words such as ငါး (five / fish) also appear in product names.
  if (/[က-႟]/.test(text) && !/\d/.test(text)) text = burmeseWordsToNumber(text);
  text = text.replace(/^\s*(add|stock in|receive)\b[:,]?\s*/i, "");

  const m = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return { transcript, name: cleanup(text), quantity: null, unit: "", description: "" };

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
  return { transcript, name, quantity: Number.isSafeInteger(quantity) ? quantity : null, unit, description };
}

function cleanup(s) {
  return s.replace(/\s+/g, " ").replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "").trim();
}
