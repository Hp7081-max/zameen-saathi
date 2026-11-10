import assert from "node:assert/strict";
import { test } from "node:test";
import type { Flag, LandRecord } from "./api.ts";
import { csvCell, recordToCsv } from "./export.ts";

const L = { head: ["K", "Kh", "A", "O", "S", "L", "D"], none: "none", unchecked: "later", sev: { high: "H", medium: "M", low: "L" } };
const rec: LandRecord = { district: "d", plots: [
  { khasra: "102", khata: "12", area_ha: 1.2, map_area_ha: null, transfers_last_2y: 0, bbox: null, owners: [{ name: "सीता देवी", share: 0.6 }, { name: "Mohan, Jr", share: 0.3 }] },
  { khasra: "103", khata: "12", area_ha: 0.5, map_area_ha: null, transfers_last_2y: 0, bbox: null, owners: [{ name: "=HYPERLINK(\"x\")", share: 1 }] },
] };
const flags: Flag[] = [{ code: "SHARE_SUM", severity: "high", plot: "102", reason_hi: "जोड़ 0.9", reason_en: "sum 0.9", source: "rule" }];

test("csvCell quotes commas, quotes and newlines", () => {
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("x\ny"), '"x\ny"');
  assert.equal(csvCell(12), "12");
});

test("csvCell defuses spreadsheet formulas", () => {
  for (const bad of ["=1+1", "+1", "-1", "@SUM(A1)"]) assert.equal(csvCell(bad), `'${bad}`);
  assert.equal(csvCell("सीता"), "सीता");
});

test("recordToCsv starts with BOM, uses CRLF and lists flags per plot", () => {
  const out = recordToCsv(rec, flags, "en", L);
  assert.equal(out.charCodeAt(0), 0xfeff);
  const lines = out.slice(1).trimEnd().split("\r\n");
  assert.equal(lines.length, 3);
  assert.equal(lines[0], "K,Kh,A,O,S,L,D");
  assert.equal(lines[1], '102,12,1.2,"सीता देवी 60%; Mohan, Jr 30%",0.9,H,H: sum 0.9');
  assert.ok(lines[2].startsWith("103,12,0.5,\"'=HYPERLINK(\"\"x\"\")"));
  assert.ok(lines[2].endsWith(",1,none,"));
});

test("recordToCsv without a check marks plots as not checked, and respects language", () => {
  assert.ok(recordToCsv(rec, null, "hi", L).includes(",later,"));
  assert.ok(recordToCsv(rec, flags, "hi", L).includes("H: जोड़ 0.9"));
});
