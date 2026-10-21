import { test } from "node:test";
import assert from "node:assert/strict";
import { findExpiryInText } from "../../web/src/expiryText.js";

const today = "2026-10-22";
const cases = [
  ["MFG 12/03/2026 EXP 11/03/2028", "2028-03-11", true],
  ["MFD: 2026.05.01\nEXP: 2027.11.01", "2027-11-01", true],
  ["BEST BEFORE 31 DEC 2026", "2026-12-31", true],
  ["Best before: 15.06.27  LOT A123", "2027-06-15", true],
  ["USE BY 05/2027", "2027-05-31", true],
  ["EXP.2027-05", "2027-05-31", true],
  ["BB 31DEC2026 L2604", "2026-12-31", true],
  ["PKD 01 JAN 2026 EXP 01 JAN 2027", "2027-01-01", true],
  ["EXP 3O/O6/2O27", "2027-06-30", true], // OCR read zeros as the letter O
  ["Expiry date: DEC 2027", "2027-12-31", true],
  ["12/05/2026 12/05/2028", "2028-05-12", false], // no labels: the later date wins
  ["MFG 2026-01-10", "", false], // only a manufacturing date: do not guess
  ["INSTANT NOODLES 70g\nMFG: 01/05/2026\nEXP: 3112/2027", "2027-12-31", true], // real OCR output with a dropped slash
  ["EXP 31/122027", "2027-12-31", true],
  ["EXP 31 12 2027", "2027-12-31", true],
  ["EXP:31122027", "2027-12-31", true],
  ["BB 20280115", "2028-01-15", true],
  ["Net weight 500g Made in Myanmar", "", false]
];
for (const [text, date, sure] of cases) {
  test(`expiry from "${text.replace(/\n/g, " ")}"`, () => {
    const r = findExpiryInText(text, today);
    assert.equal(r.expiryDate, date);
    if (date) assert.equal(r.sure, sure);
  });
}
