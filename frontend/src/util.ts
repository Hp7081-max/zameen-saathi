import type { Flag, Lang, LandRecord, Owner, Plot, Severity } from "./api.ts";

/* ---------- संख्याएँ ---------- */

/** "1/2", "50%", "0,5", "0.5", "१/२" सब चलते हैं। समझ न आए तो NaN। */
export function parseShare(raw: string): number {
  const s = raw.trim().replace(/[०-९]/g, (d) => String("०१२३४५६७८९".indexOf(d))).replace(",", ".");
  if (!s) return NaN;
  let m = s.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (m) return +m[1] / 100;
  m = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (m) return +m[2] === 0 ? NaN : +m[1] / +m[2];
  return /^\d*\.?\d+$|^\d+\.$/.test(s) ? +s : NaN;
}

/** क्षेत्रफल जैसी दशमलव संख्या; अधूरा "0." भी चलता है। */
export function parseNumber(raw: string): number {
  const s = raw.trim().replace(",", ".");
  return /^\d*\.?\d+$|^\d+\.$/.test(s) ? +s : NaN;
}

export const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
export const fmt = (n: number, d = 3) => String(round(n, d));
export const pct = (share: number) => `${round(share * 100, 1)}%`;
export const HA_TO_ACRE = 2.47105;

const DEVA = "०१२३४५६७८९";
export const digits = (n: number | string, lang: Lang) =>
  lang === "hi" ? String(n).replace(/\d/g, (d) => DEVA[+d]) : String(n);

/* ---------- रिकॉर्ड ---------- */

export const blankOwner = (): Owner => ({ name: "", share: 1 });
export const blankPlot = (): Plot => ({ khasra: "", khata: "", area_ha: 0, map_area_ha: null, owners: [blankOwner()], transfers_last_2y: 0, bbox: null });

export const shareSum = (p: Plot) => p.owners.reduce((t, o) => t + (Number.isFinite(o.share) ? o.share : 0), 0);
export type ShareState = "ok" | "off" | "none";
export const shareState = (p: Plot): ShareState =>
  p.owners.length === 0 ? "none" : Math.abs(shareSum(p) - 1) <= 0.001 ? "ok" : "off";

const sig = (p: Plot) => JSON.stringify([p.khasra, p.khata, p.area_ha, p.owners.map((o) => [o.name, o.share])]);

/** कई फ़ाइलों/पन्नों के नतीजे जोड़ना। हूबहू एक जैसी पंक्ति (वही पन्ना दोबारा डाला) एक बार रखते हैं। */
export function mergeRecords(base: LandRecord | null, extra: LandRecord[]): LandRecord {
  const plots = base ? [...base.plots] : [];
  const seen = new Set(plots.map(sig));
  for (const r of extra) {
    for (const p of r.plots) {
      if (!seen.has(sig(p))) { seen.add(sig(p)); plots.push(p); }
    }
  }
  return { district: base?.district || extra.find((r) => r.district)?.district || "", plots };
}

export type Problem = { row: number; owner?: number; key: "p_khasra" | "p_khata" | "p_area" | "p_share" | "p_name" | "p_none" };

export function validate(rec: LandRecord): Problem[] {
  if (rec.plots.length === 0) return [{ row: -1, key: "p_none" }];
  const out: Problem[] = [];
  rec.plots.forEach((p, row) => {
    if (!p.khasra.trim()) out.push({ row, key: "p_khasra" });
    if (!p.khata.trim()) out.push({ row, key: "p_khata" });
    if (!(p.area_ha > 0)) out.push({ row, key: "p_area" });
    p.owners.forEach((o, owner) => {
      if (!o.name.trim()) out.push({ row, owner, key: "p_name" });
      if (!(o.share >= 0 && o.share <= 1)) out.push({ row, owner, key: "p_share" });
    });
  });
  return out;
}

/** सर्वर को भेजने से पहले सफ़ाई: खाली जगहें हटाओ, गोल करो। */
export function cleanRecord(rec: LandRecord): LandRecord {
  return {
    district: rec.district,
    plots: rec.plots.map((p) => ({
      ...p, khasra: p.khasra.trim(), khata: p.khata.trim(), area_ha: round(p.area_ha, 4),
      owners: p.owners.map((o) => ({ name: o.name.trim(), share: round(o.share, 4) })),
    })),
  };
}

/** एक ही खसरा-नंबर वाली पहली पंक्ति (नक्शे और कुल क्षेत्रफल में दोहराव न गिनें)। */
export function uniqueByKhasra(plots: Plot[]): Plot[] {
  const seen = new Set<string>();
  return plots.filter((p) => (seen.has(p.khasra) ? false : (seen.add(p.khasra), true)));
}

export function facts(rec: LandRecord) {
  const u = uniqueByKhasra(rec.plots);
  const area = u.reduce((t, p) => t + p.area_ha, 0);
  return { plots: u.length, khatas: new Set(rec.plots.map((p) => p.khata)).size, area, acres: area * HA_TO_ACRE };
}

/* ---------- संकेत (flags) ---------- */

export const RANK: Record<Severity | "none", number> = { none: 0, low: 1, medium: 2, high: 3 };
export const SEVERITIES: Severity[] = ["high", "medium", "low"];

export function severityOf(flags: Flag[], khasra: string): Severity | "none" {
  return flags.filter((f) => f.plot === khasra).reduce<Severity | "none">((m, f) => (RANK[f.severity] > RANK[m] ? f.severity : m), "none");
}

export function countBySeverity(flags: Flag[]): Record<Severity, number> {
  const c: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
  for (const f of flags) c[f.severity]++;
  return c;
}

/** (खसरा, गंभीरता) के हिसाब से समूह; सबसे गंभीर पहले। "-" वाले (पूरे रिकॉर्ड के) संकेत सबसे नीचे। */
export function groupFlags(flags: Flag[]): { plot: string; flags: Flag[]; top: Severity }[] {
  const by = new Map<string, Flag[]>();
  for (const f of flags) by.set(f.plot, [...(by.get(f.plot) ?? []), f]);
  return [...by.entries()]
    .map(([plot, fl]) => ({ plot, flags: fl, top: fl.reduce<Severity>((m, f) => (RANK[f.severity] > RANK[m] ? f.severity : m), "low") }))
    .sort((a, b) => (a.plot === "-" ? 1 : b.plot === "-" ? -1 : RANK[b.top] - RANK[a.top] || a.plot.localeCompare(b.plot, undefined, { numeric: true })));
}

/* ---------- योजनाबद्ध नक्शा (squarified treemap) ---------- */

export type Rect = { x: number; y: number; w: number; h: number };

/** क्षेत्रफल के अनुपात में आयत। नतीजा `values` के क्रम में। बाहर का आकार W x H। */
export function squarify(values: number[], W = 100, H = 62): Rect[] {
  const total = values.reduce((t, v) => t + Math.max(v, 0), 0) || 1;
  const items = values.map((v, i) => ({ i, a: (Math.max(v, 1e-9) / total) * W * H })).sort((p, q) => q.a - p.a);
  const out: Rect[] = new Array(values.length);
  let x = 0, y = 0, w = W, h = H;
  let row: typeof items = [];
  const worst = (r: typeof items, side: number) => {
    const s = r.reduce((t, k) => t + k.a, 0);
    const mx = Math.max(...r.map((k) => k.a)), mn = Math.min(...r.map((k) => k.a));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  const flush = () => {
    const s = row.reduce((t, k) => t + k.a, 0);
    if (w >= h) {
      const cw = s / h; let cy = y;
      for (const k of row) { const rh = k.a / cw; out[k.i] = { x, y: cy, w: cw, h: rh }; cy += rh; }
      x += cw; w -= cw;
    } else {
      const rh = s / w; let cx = x;
      for (const k of row) { const rw = k.a / rh; out[k.i] = { x: cx, y, w: rw, h: rh }; cx += rw; }
      y += rh; h -= rh;
    }
    row = [];
  };
  for (const it of items) {
    const side = Math.min(w, h);
    if (row.length === 0 || worst([...row, it], side) <= worst(row, side)) row.push(it);
    else { flush(); row.push(it); }
  }
  if (row.length) flush();
  return out;
}

/* ---------- फ़ाइलें ---------- */

export const MAX_FILE = 10 * 1024 * 1024;
export const ACCEPT = "image/png,image/jpeg,image/webp,application/pdf,.pdf,.png,.jpg,.jpeg,.webp";

export function checkFile(f: { name: string; type: string; size: number }): "err_big" | "err_type" | null {
  const ok = /\.(png|jpe?g|webp|pdf)$/i.test(f.name) || /^(image\/(png|jpeg|webp)|application\/pdf)$/.test(f.type);
  if (!ok) return "err_type";
  return f.size > MAX_FILE ? "err_big" : null;
}

export const isPdf = (f: { name: string; type: string }) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
export const fileSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
