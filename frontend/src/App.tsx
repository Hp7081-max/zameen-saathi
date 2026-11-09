import { useEffect, useMemo, useRef, useState } from "react";
import { analyze, ApiError, fetchSample, logout, setToken } from "./api";
import type { Analysis, LandRecord, Session } from "./api";
import Ask from "./components/Ask";
import Header from "./components/Header";
import Hero from "./components/Hero";
import { IconWifiOff } from "./components/Icons";
import Login from "./components/Login";
import Report from "./components/Report";
import Review from "./components/Review";
import Stepper from "./components/Stepper";
import type { StepKey } from "./components/Stepper";
import Upload from "./components/Upload";
import { describeError } from "./errors";
import { useOnline, useSessionClock, useStoredLang } from "./hooks";
import { STR } from "./i18n";
import { cleanRecord, mergeRecords, validate } from "./util";

type View = "upload" | "review" | "report";

export default function App() {
  const [lang, setLang] = useStoredLang();
  const s = STR[lang];
  const online = useOnline();

  const [authed, setAuthed] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [view, setView] = useState<View>("upload");
  const [rec, setRec] = useState<LandRecord | null>(null);
  const [res, setRes] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => { document.title = `${s.title} · ${s.hero_title}`; }, [s]);

  /** सब कुछ मिटाकर लॉगिन पर लौटो। सर्वर पर सत्र हटाना सर्वोत्तम-प्रयास है; ब्राउज़र का डेटा हम हर हाल में साफ़ करते हैं। */
  const reset = (message = "") => {
    setToken(""); setAuthed(false); setExpiresAt(null); setRec(null); setRes(null);
    setView("upload"); setError(null); setSampleBusy(false); setBusy(false); setNotice(message);
  };
  const signOut = () => { void logout().catch(() => undefined); reset(); };
  const minutesLeft = useSessionClock(expiresAt, () => reset(s.session_over));

  /** 401 = सत्र खत्म। बाकी त्रुटियाँ उपयोगकर्ता को दिखाओ। */
  const fail = (e: unknown, show: boolean) => {
    if (e instanceof ApiError && e.status === 401) { reset(s.session_over); return; }
    if (show) setError(e);
  };

  const onLoggedIn = (sess: Session) => {
    setAuthed(true); setExpiresAt(Date.now() + sess.expires_in * 1000); setView("upload"); setNotice("");
  };

  const problems = useMemo(() => (rec ? validate(rec) : []), [rec]);
  const step: StepKey = !authed ? "login" : view;
  const reachable: Record<StepKey, boolean> = { login: true, upload: authed, review: authed && !!rec, report: authed && !!res };

  const go = (k: StepKey) => { if (k !== "login" && reachable[k]) { setError(null); setView(k); } };

  // हर चरण बदलने पर ऊपर और उस चरण के शीर्षक पर फ़ोकस (स्क्रीन-रीडर और कीबोर्ड के लिए)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => document.getElementById("view-title")?.focus({ preventScroll: true }));
  }, [step]);

  const edit = (f: (r: LandRecord) => LandRecord) => { setRec((r) => (r ? f(r) : r)); setRes(null); };

  const onRecords = (recs: LandRecord[], navigate: boolean) => {
    setRec((prev) => mergeRecords(prev, recs)); setRes(null);
    if (navigate) { setError(null); setView("review"); }
  };

  const check = async () => {
    if (!rec || problems.length) return;
    setBusy(true); setError(null);
    try {
      setRes(await analyze(cleanRecord(rec)));
      setView("report");
    } catch (e) { fail(e, true); } finally { setBusy(false); }
  };

  const openSample = async () => {
    setSampleBusy(true); setError(null);
    try {
      const r = await fetchSample(lang);
      const a = await analyze(cleanRecord(r));
      setRec(r); setRes(a); setView("report");
    } catch (e) { fail(e, true); } finally { setSampleBusy(false); }
  };

  const clear = () => { setRec(null); setRes(null); setError(null); setView("upload"); };
  const errorText = error === null ? "" : describeError(error, lang, s);

  return (
    <div className="app">
      <a className="skip" href="#main">{s.skip}</a>
      <Header s={s} lang={lang} setLang={setLang} authed={authed} minutesLeft={minutesLeft} onExit={signOut} />
      {!online && <div className="offline no-print" role="status"><IconWifiOff size={18} /> {s.offline}</div>}
      <Stepper s={s} lang={lang} current={step} reachable={reachable} onGo={go} />

      <main id="main">
        {!authed && (
          <div className="landing">
            <Hero s={s} />
            <div>
              {notice && <p className="notice" role="status">{notice}</p>}
              <Login s={s} lang={lang} online={online} onDone={onLoggedIn} />
            </div>
          </div>
        )}
        {authed && view === "upload" && (
          <>
            <Upload s={s} lang={lang} online={online} haveRecord={rec?.plots.length ?? 0} sampleBusy={sampleBusy}
              onRecords={onRecords} onSample={() => void openSample()} onContinue={() => go("review")} onFail={(e) => fail(e, false)} />
            {errorText && <p className="err" role="alert">{errorText}</p>}
          </>
        )}
        {authed && view === "review" && rec && (
          <Review s={s} lang={lang} rec={rec} setRec={edit} problems={problems} busy={busy} online={online} error={errorText}
            onCheck={() => void check()} onAddFiles={() => go("upload")} onClear={clear} />
        )}
        {authed && view === "report" && rec && res && (
          <Report s={s} lang={lang} rec={rec} res={res} onEdit={() => go("review")} onNew={clear} />
        )}
      </main>

      {authed && <Ask s={s} lang={lang} online={online} />}

      <footer className="foot no-print">
        <p>{s.disclaimer_foot}</p>
        <p className="hint small">{s.privacy_foot}</p>
        <p className="hint small">Poppins · SIL Open Font License 1.1</p>
      </footer>
    </div>
  );
}
