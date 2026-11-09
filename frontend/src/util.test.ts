// चलाएँ: npm test   (Node 22+, कोई अतिरिक्त package नहीं)
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Flag, Plot } from "./api.ts";
import {
  checkFile, countBySeverity, digits, facts, groupFlags, mergeRecords, parseNumber, parseShare,
  shareState, squarify, validate, cleanRecord, severityOf, uniqueByKhasra,
} from "./util.ts";

const plot = (khasra: string, khata: string, area: number, shares: number[] = [1]): Plot => ({
  khasra, khata, area_ha: area, map_area_ha: null, transfers_last_2y: 0, bbox: null,
  owners: shares.map((s, i) => ({ name: `N${i}`, share: s })),
});
const flag = (plotNo: string, severity: Flag["severity"]): Flag =>
  ({ code: "X", severity, plot: plotNo, reason_hi: "", reason_en: "", source: "rule" });

test("parseShare accepts fractions, percentages, commas and Devanagari digits", () => {
  assert.equal(parseShare("0.5"), 0.5);
  assert.equal(parseShare("0,25"), 0.25);
  assert.equal(parseShare("1/2"), 0.5);
  assert.equal(parseShare(" 1 / 4 "), 0.25);
  assert.equal(parseShare("50%"), 0.5);
  assert.equal(parseShare("१/२"), 0.5);
  assert.equal(parseShare("१"), 1);
  assert.equal(parseShare(".5"), 0.5);
  assert.equal(parseShare("1."), 1);
});

test("parseShare rejects nonsense instead of guessing", () => {
  for (const bad of ["", "abc", "1/0", "1/2/3", "-1", "5%%", "0.5.5"]) assert.ok(Number.isNaN(parseShare(bad)), bad);
});

test("parseNumber allows a half-typed decimal", () => {
  assert.equal(parseNumber("0."), 0);
  assert.equal(parseNumber("1,20"), 1.2);
  assert.ok(Number.isNaN(parseNumber("1.2.3")));
  assert.ok(Number.isNaN(parseNumber("")));
});

test("shareState uses the same 0.001 tolerance as the server rule", () => {
  assert.equal(shareState(plot("1", "1", 1, [0.5, 0.5])), "ok");
  assert.equal(shareState(plot("1", "1", 1, [0.6, 0.3])), "off");
  assert.equal(shareState(plot("1", "1", 1, [0.3333, 0.3333, 0.3334])), "ok");
  assert.equal(shareState({ ...plot("1", "1", 1), owners: [] }), "none");
});

test("mergeRecords appends, keeps order and drops exact repeats only", () => {
  const a = { district: "", plots: [plot("1", "1", 1), plot("2", "1", 2)] };
  const b = { district: "X", plots: [plot("2", "1", 2), plot("3", "2", 3), plot("2", "9", 2)] };
  const m = mergeRecords(a, [b]);
  assert.deepEqual(m.plots.map((p) => p.khasra + "/" + p.khata), ["1/1", "2/1", "3/2", "2/9"]); // 2/9 दोहराव नहीं: अलग खाता
  assert.equal(m.district, "X");
  assert.equal(mergeRecords(null, [b, b]).plots.length, 3);
  assert.equal(a.plots.length, 2); // मूल नहीं बदला
});

test("validate finds every kind of problem and cleanRecord trims", () => {
  assert.deepEqual(validate({ district: "", plots: [] }), [{ row: -1, key: "p_none" }]);
  const bad = { district: "", plots: [{ ...plot(" ", "", 0, [2]), owners: [{ name: " ", share: 2 }] }] };
  assert.deepEqual(validate(bad).map((p) => p.key).sort(), ["p_area", "p_khasra", "p_khata", "p_name", "p_share"]);
  assert.deepEqual(validate({ district: "", plots: [plot("1", "1", 0.5, [0.5, 0.5])] }), []);
  const c = cleanRecord({ district: "d", plots: [{ ...plot(" 7 ", " 3", 1.23456789), owners: [{ name: "  Ram ", share: 0.33333333 }] }] });
  assert.deepEqual([c.plots[0].khasra, c.plots[0].khata, c.plots[0].area_ha, c.plots[0].owners[0]], ["7", "3", 1.2346, { name: "Ram", share: 0.3333 }]);
});

test("facts counts a repeated khasra once", () => {
  const f = facts({ district: "", plots: [plot("1", "1", 1), plot("1", "9", 1), plot("2", "1", 2)] });
  assert.equal(f.plots, 2); assert.equal(f.khatas, 2); assert.equal(f.area, 3);
  assert.ok(Math.abs(f.acres - 7.41315) < 1e-6);
  assert.equal(uniqueByKhasra([plot("1", "1", 1), plot("1", "2", 5)]).length, 1);
});

test("severity helpers", () => {
  const fl = [flag("1", "low"), flag("1", "high"), flag("2", "medium"), flag("-", "low"), flag("3", "high")];
  assert.equal(severityOf(fl, "1"), "high");
  assert.equal(severityOf(fl, "9"), "none");
  assert.deepEqual(countBySeverity(fl), { high: 2, medium: 1, low: 2 });
  assert.deepEqual(groupFlags(fl).map((g) => g.plot), ["1", "3", "2", "-"]); // गंभीर पहले, "-" अंत में
});

test("squarify fills the box exactly, in proportion, without overlap", () => {
  const vals = [6, 6, 4, 3, 2, 2, 1];
  const r = squarify(vals, 100, 60);
  const total = r.reduce((t, k) => t + k.w * k.h, 0);
  assert.ok(Math.abs(total - 6000) < 1e-6);
  const sum = vals.reduce((a, b) => a + b, 0);
  vals.forEach((v, i) => assert.ok(Math.abs(r[i].w * r[i].h - (v / sum) * 6000) < 1e-6));
  for (const k of r) assert.ok(k.x >= -1e-9 && k.y >= -1e-9 && k.x + k.w <= 100 + 1e-6 && k.y + k.h <= 60 + 1e-6);
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
    const w = Math.min(r[i].x + r[i].w, r[j].x + r[j].w) - Math.max(r[i].x, r[j].x);
    const h = Math.min(r[i].y + r[i].h, r[j].y + r[j].h) - Math.max(r[i].y, r[j].y);
    assert.ok(w <= 1e-6 || h <= 1e-6, `overlap ${i}/${j}`);
  }
  assert.equal(squarify([5], 100, 60).length, 1);
  assert.equal(squarify([], 100, 60).length, 0);
});

test("checkFile", () => {
  assert.equal(checkFile({ name: "a.JPG", type: "", size: 10 }), null);
  assert.equal(checkFile({ name: "scan", type: "application/pdf", size: 10 }), null);
  assert.equal(checkFile({ name: "a.txt", type: "text/plain", size: 10 }), "err_type");
  assert.equal(checkFile({ name: "a.png", type: "image/png", size: 10 * 1024 * 1024 + 1 }), "err_big");
});

test("digits uses Devanagari numerals only in Hindi", () => {
  assert.equal(digits(2026, "hi"), "२०२६");
  assert.equal(digits(2026, "en"), "2026");
});
