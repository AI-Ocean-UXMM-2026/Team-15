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
