import type { Flag, LandRecord } from "./api.ts";
import { pct, round, shareSum, severityOf } from "./util.ts";

/** CSV में कोई खाना `=`, `+`, `-`, `@` से शुरू हो तो Excel उसे सूत्र मान लेता है; OCR से आया नाम ऐसा हो सकता है, इसलिए आगे ' लगाते हैं। */
export function csvCell(v: string | number): string {
  let t = String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export type CsvLabels = { head: string[]; none: string; unchecked: string; sev: Record<"high" | "medium" | "low", string> };

/** खसरों की तालिका CSV में। `flags` = null: जाँच अभी चली नहीं। शुरू में BOM, ताकि Excel में हिंदी ठीक खुले। */
export function recordToCsv(rec: LandRecord, flags: Flag[] | null, lang: "hi" | "en", L: CsvLabels): string {
  const rows: (string | number)[][] = [L.head];
  for (const p of rec.plots) {
    const mine = flags ? flags.filter((f) => f.plot === p.khasra) : [];
    const sev = flags ? severityOf(flags, p.khasra) : "none";
    rows.push([
      p.khasra, p.khata, round(p.area_ha, 4),
      p.owners.map((o) => `${o.name} ${pct(o.share)}`).join("; "),
      round(shareSum(p), 4),
      flags === null ? L.unchecked : sev === "none" ? L.none : L.sev[sev],
      mine.map((f) => `${L.sev[f.severity]}: ${lang === "en" ? f.reason_en : f.reason_hi}`).join(" | "),
    ]);
  }
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** फ़ाइल उतारना (ब्राउज़र में ही बनती है, कहीं भेजी नहीं जाती)। */
export function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
