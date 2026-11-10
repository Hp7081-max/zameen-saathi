export type Lang = "hi" | "en";
export type Bi = { hi: string; en: string };

export type Owner = { name: string; share: number };
export type Plot = {
  khasra: string; khata: string; area_ha: number; map_area_ha: number | null;
  owners: Owner[]; transfers_last_2y: number; bbox?: number[] | null;
};
export type LandRecord = { district: string; plots: Plot[] };
export type Severity = "high" | "medium" | "low";
export type Flag = {
  code: string; severity: Severity; plot: string;
  reason_hi: string; reason_en: string; source: "rule" | "model";
};
export type ChecklistItem = {
  code: string; plots: string[]; who_hi: string; who_en: string;
  docs_hi: string[]; docs_en: string[]; ask_hi: string; ask_en: string;
};
export type Analysis = {
  summary_hi: string; summary_en: string; plain_hi: string[]; plain_en: string[];
  flags: Flag[]; checklist: ChecklistItem[]; disclaimer: string; disclaimer_en: string;
};
export type Answer = {
  answer: string; sources: string[]; title: string; lang: Lang; related: string[];
  disclaimer: string; disclaimer_en: string;
};
export type Session = { token: string; expires_in: number };

const BASE: string = import.meta.env.VITE_API_URL ?? "";
let token = "";
export const setToken = (t: string) => { token = t; };
export const hasToken = () => token !== "";

/** सर्वर की त्रुटि। `detail` में हिंदी और English दोनों होते हैं (पुराने सर्वर पर सादा पाठ), दिखाते समय भाषा चुनो। */
export class ApiError extends Error {
  constructor(public status: number, public detail: Bi | string) {
    super(typeof detail === "string" ? detail : detail.hi);
  }
  text(lang: Lang): string {
    return typeof this.detail === "string" ? this.detail : this.detail[lang] || this.detail.hi;
  }
}

/** किसी भी त्रुटि से उपयोगकर्ता को दिखाने लायक पाठ। */
export function errorText(e: unknown, lang: Lang, fallback: string): string {
  if (e instanceof ApiError) return e.text(lang);
  return fallback;
}

const isBi = (d: unknown): d is Bi =>
  typeof d === "object" && d !== null && typeof (d as Bi).hi === "string" && typeof (d as Bi).en === "string";

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let detail: Bi | string = r.statusText || `HTTP ${r.status}`;
    try {
      const d = JSON.parse(await r.text()).detail;
      if (isBi(d)) detail = d;
      else if (typeof d === "string") detail = d;
      else if (Array.isArray(d)) detail = "Invalid input"; // FastAPI के 422 का ब्यौरा उपयोगकर्ता के काम का नहीं
    } catch { /* सादा पाठ या खाली */ }
    throw new ApiError(r.status, detail);
  }
  return r.json() as Promise<T>;
}

const auth = (): Record<string, string> => (token ? { "x-session": token } : {});

async function call<T>(url: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await json<T>(await fetch(BASE + url, { ...init, signal: ctl.signal }));
  } finally {
    clearTimeout(timer);
  }
}

const post = <T>(url: string, body: unknown, timeoutMs?: number) =>
  call<T>(url, { method: "POST", headers: { "Content-Type": "application/json", ...auth() }, body: JSON.stringify(body) }, timeoutMs);
const get = <T>(url: string) => call<T>(url, { headers: auth() });

export const requestOtp = (phone: string, consent: boolean) =>
  post<{ sent: boolean; debug_otp?: string }>("/api/consent/request", { phone, consent });
export const verifyOtp = (phone: string, otp: string) => post<Session>("/api/consent/verify", { phone, otp });
export const logout = () => call<{ deleted: boolean }>("/api/session", { method: "DELETE", headers: auth() });

/** OCR धीमा है (PDF में कई पन्ने): सर्वर का अपना बजट 150 सेकंड है, हम 170 तक रुकते हैं। */
export const extract = (file: File): Promise<LandRecord> => {
  const d = new FormData();
  d.append("file", file);
  return call<LandRecord>("/api/extract", { method: "POST", headers: auth(), body: d }, 170_000);
};
/** `demo`: नमूना गाँव की जाँच है, इसलिए सर्वर की "लाइव गिनती" में नहीं जुड़ती। */
export const analyze = (rec: LandRecord, demo = false) => post<Analysis>(`/api/analyze${demo ? "?demo=1" : ""}`, rec, 60_000);
export const ask = (question: string, lang: Lang) => post<Answer>("/api/ask", { question, lang });
export const fetchSample = (lang: Lang) => get<LandRecord>(`/api/sample?lang=${lang}`);
export const fetchTopics = (lang: Lang) => get<{ lang: Lang; topics: string[] }>(`/api/topics?lang=${lang}`);

export type Stats = { since: string; logins: number; files_read: number; plots_read: number; analyses: number; flags_found: number; flags_high: number };
/** होम पन्ने की अनाम गिनतियाँ (लॉगिन नहीं चाहिए)। */
export const fetchStats = () => call<Stats>("/api/stats", {}, 10_000);

export type ContactKind = "feedback" | "partner" | "problem" | "other";
export type ContactBody = { name: string; contact: string; message: string; kind: ContactKind; website: string };
export const sendContact = (b: ContactBody) => post<{ ok: boolean }>("/api/contact", b, 20_000);
