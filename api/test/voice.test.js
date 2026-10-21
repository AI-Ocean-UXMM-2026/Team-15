import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVoice } from "../_lib/voice.js";

const cases = [
  ["Instant noodle, 40 pack", { name: "Instant noodle", quantity: 40, unit: "pack" }],
  ["Bottled water 24 bottles cold", { name: "Bottled water", quantity: 24, unit: "bottles", description: "cold" }],
  ["forty two packs of instant noodles", { name: "instant noodles", quantity: 42, unit: "packs" }],
  ["White bread twelve loaves", { name: "White bread", quantity: 12, unit: "loaves" }],
  ["ခေါက်ဆွဲ ၄၀ ထုပ်", { name: "ခေါက်ဆွဲ", quantity: 40, unit: "ထုပ်" }],
  ["ရေသန့် လေးဆယ် ဘူး", { name: "ရေသန့်", quantity: 40, unit: "ဘူး" }],
  ["Toothpaste", { name: "Toothpaste", quantity: null }]
];

for (const [input, expected] of cases) {
  test(`parses "${input}"`, () => {
    const got = parseVoice(input);
    for (const [k, v] of Object.entries(expected)) assert.equal(got[k], v, `${k} for "${input}"`);
  });
}

// Spoken expiry dates, relative to a fixed "today".
const today = "2026-10-22";
const expiryCases = [
  ["Instant noodle, 40 pack, expires in 2 months", { name: "Instant noodle", quantity: 40, unit: "pack", expiryDate: "2026-12-22" }],
  ["Bread 10 loaves 4 days", { name: "Bread", quantity: 10, unit: "loaves", expiryDate: "2026-10-26" }],
  ["Milk 12 bottles best before December", { name: "Milk", quantity: 12, expiryDate: "2026-12-31" }],
  ["Rice 20 bags exp 03/2027", { name: "Rice", quantity: 20, expiryDate: "2027-03-31" }],
  ["Oil 6 bottles expiry 2027-05-15", { name: "Oil", quantity: 6, expiryDate: "2027-05-15" }],
  ["Water 24 bottles, expires in a year", { quantity: 24, expiryDate: "2027-10-22" }],
  ["ခေါက်ဆွဲ ၄၀ ထုပ် ၂ လ နေရင် ကုန်မယ်", { name: "ခေါက်ဆွဲ", quantity: 40, unit: "ထုပ်", expiryDate: "2026-12-22" }],
  ["ပေါင်မုန့် ၁၀ လုံး ၃ ရက်", { name: "ပေါင်မုန့်", quantity: 10, unit: "လုံး", expiryDate: "2026-10-25" }],
  ["နို့ဆီ ၂၄ ဗူး ဒီဇင်ဘာ ကုန်", { name: "နို့ဆီ", quantity: 24, unit: "ဗူး", expiryDate: "2026-12-31" }],
  ["ခေါက်ဆွဲ လေးဆယ် ထုပ် နှစ်လ နေရင် ကုန်မယ်", { name: "ခေါက်ဆွဲ", quantity: 40, expiryDate: "2026-12-22" }],
  ["ဆန် ၁၀ အိတ် တစ်နှစ်", { name: "ဆန်", quantity: 10, unit: "အိတ်", expiryDate: "2027-10-22" }],
  ["ဆပ်ပြာ ၄၀ လုံး", { name: "ဆပ်ပြာ", quantity: 40, unit: "လုံး", expiryDate: "" }],
  ["Toothpaste 12 tubes", { quantity: 12, expiryDate: "" }]
];
for (const [input, expected] of expiryCases) {
  test(`expiry in "${input}"`, () => {
    const got = parseVoice(input, { today });
    for (const [k, v] of Object.entries(expected)) assert.equal(got[k], v, `${k} for "${input}"`);
  });
}
