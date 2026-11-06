export type Owner = { name: string; share: number };
export type Plot = {
  khasra: string; khata: string; area_ha: number; map_area_ha: number | null;
  owners: Owner[]; transfers_last_2y: number; bbox?: number[] | null;
};
export type LandRecord = { district: string; plots: Plot[] };
export type Flag = {
  code: string; severity: "high" | "medium" | "low"; plot: string;
  reason_hi: string; reason_en: string; source: "rule" | "model";
};
export type Analysis = { summary_hi: string; plain_hi: string[]; flags: Flag[]; disclaimer: string };
export type Answer = { answer: string; sources: string[]; disclaimer: string };

const BASE = import.meta.env.VITE_API_URL ?? "";
let token = "";
export const setToken = (t: string) => { token = t; };
export const hasToken = () => token !== "";

class ApiError extends Error { constructor(public status: number, msg: string) { super(msg); } }

const json = async (r: Response) => {
  if (!r.ok) {
    let msg = await r.text();
    try { msg = JSON.parse(msg).detail ?? msg; } catch { /* plain text */ }
    throw new ApiError(r.status, typeof msg === "string" ? msg : "कुछ गड़बड़ हुई।");
  }
  return r.json();
};
const headers = (): Record<string, string> => (token ? { "x-session": token } : {});
const post = (url: string, body: unknown) =>
  fetch(BASE + url, { method: "POST", headers: { "Content-Type": "application/json", ...headers() }, body: JSON.stringify(body) }).then(json);

export const requestOtp = (phone: string, consent: boolean): Promise<{ sent: boolean; debug_otp?: string }> =>
  post("/api/consent/request", { phone, consent });
export const verifyOtp = (phone: string, otp: string): Promise<{ token: string; expires_in: number }> =>
  post("/api/consent/verify", { phone, otp });
export const logout = () => fetch(BASE + "/api/session", { method: "DELETE", headers: headers() }).then(json);

export const extract = (file: File): Promise<LandRecord> => {
  const d = new FormData();
  d.append("file", file);
  return fetch(BASE + "/api/extract", { method: "POST", headers: headers(), body: d }).then(json);
};
export const analyze = (rec: LandRecord): Promise<Analysis> => post("/api/analyze", rec);
export const ask = (question: string): Promise<Answer> => post("/api/ask", { question });
