export type Owner = { name: string; share: number };
export type Plot = {
  khasra: string; khata: string; area_ha: number; map_area_ha: number | null;
  owners: Owner[]; transfers_last_2y: number;
};
export type LandRecord = { district: string; plots: Plot[] };
export type Flag = {
  code: string; severity: "high" | "medium" | "low"; plot: string;
  reason_hi: string; reason_en: string; source: "rule" | "model";
};
export type Analysis = { summary_hi: string; flags: Flag[]; disclaimer: string };
export type Answer = { answer: string; sources: string[]; disclaimer: string };

const BASE = import.meta.env.VITE_API_URL ?? "";

const json = async (r: Response) => {
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const post = (url: string, body: unknown) =>
  fetch(BASE + url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(json);

export const extract = (file: File): Promise<LandRecord> => {
  const d = new FormData();
  d.append("file", file);
  return fetch(BASE + "/api/extract", { method: "POST", body: d }).then(json);
};
export const analyze = (rec: LandRecord): Promise<Analysis> => post("/api/analyze", rec);
export const ask = (question: string): Promise<Answer> => post("/api/ask", { question });
