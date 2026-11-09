import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "./api";

const KEY = "zs-lang";

/** चुनी हुई भाषा याद रखता है (सिर्फ़ यही; खतौनी का कुछ भी ब्राउज़र में नहीं रखा जाता)। storage बंद हो तो भी चलता है। */
export function useStoredLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>(() => {
    try { const v = localStorage.getItem(KEY); if (v === "hi" || v === "en") return v; } catch { /* private window */ }
    return "hi";
  });
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const set = useCallback((l: Lang) => {
    setLang(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  }, []);
  return [lang, set];
}

export function useOnline(): boolean {
  const [on, setOn] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOn(true), down = () => setOn(false);
    window.addEventListener("online", up); window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  return on;
}

/** `active` चालू होने के बाद बीते सेकंड। */
export function useElapsed(active: boolean): number {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!active) { setSec(0); return; }
    const t0 = Date.now();
    const id = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);
  return sec;
}

/** उलटी गिनती: start(30) के बाद left हर सेकंड घटता है। */
export function useCountdown(): [number, (sec: number) => void] {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return [left, setLeft];
}

/** सत्र में बचे मिनट (ऊपर गोल)। समय पूरा होते ही onExpire एक बार। */
export function useSessionClock(expiresAt: number | null, onExpire: () => void): number | null {
  const [now, setNow] = useState(Date.now());
  const cb = useRef(onExpire);
  cb.current = onExpire;
  useEffect(() => {
    if (expiresAt === null) return;
    setNow(Date.now()); // लॉगिन के पल से गिनो, ऐप खुलने के पल से नहीं
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const left = expiresAt === null ? null : Math.max(0, expiresAt - now);
  useEffect(() => { if (left === 0) cb.current(); }, [left]);
  return left === null ? null : Math.ceil(left / 60_000);
}

const speechLang = (l: Lang) => (l === "hi" ? "hi-IN" : "en-IN");

/** पाठ सुनाना। hasVoice: उस भाषा की आवाज़ फ़ोन में है? (सूची आने तक null = पता नहीं) */
export function useSpeech(lang: Lang) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const [hasVoice, setHasVoice] = useState<boolean | null>(null);
  useEffect(() => {
    if (!supported) return;
    const check = () => {
      const v = window.speechSynthesis.getVoices();
      setHasVoice(v.length === 0 ? null : v.some((x) => x.lang.toLowerCase().startsWith(lang)));
    };
    check();
    window.speechSynthesis.addEventListener?.("voiceschanged", check);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", check);
  }, [supported, lang]);
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);
  const stop = useCallback(() => { if (supported) window.speechSynthesis.cancel(); setSpeaking(false); }, [supported]);
  const speak = useCallback((texts: string[]) => {
    if (!supported || texts.length === 0) return;
    window.speechSynthesis.cancel();
    setSpeaking(true);
    texts.forEach((t, i) => {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = speechLang(lang);
      if (i === texts.length - 1) { u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false); }
      window.speechSynthesis.speak(u);
    });
  }, [supported, lang]);
  return { supported, speaking, hasVoice, speak, stop };
}

/** बोलकर सवाल पूछना (ब्राउज़र की speech recognition; सब ब्राउज़र में नहीं होती)। */
export function useVoiceInput(lang: Lang, onText: (t: string) => void) {
  const SR = typeof window === "undefined" ? undefined : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const [listening, setListening] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef<any>(null);
  const start = useCallback(() => {
    if (!SR) return;
    const r = new SR();
    r.lang = speechLang(lang);
    r.interimResults = false;
    r.onresult = (e: any) => { setFailed(false); onText(e.results[0][0].transcript); };
    r.onerror = () => setFailed(true);
    r.onend = () => setListening(false);
    ref.current = r;
    setFailed(false); setListening(true);
    try { r.start(); } catch { setListening(false); }
  }, [SR, lang, onText]);
  const stop = useCallback(() => { try { ref.current?.stop(); } catch { /* already stopped */ } }, []);
  return { supported: !!SR, listening, failed, start, stop };
}
