import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyze, ApiError, fetchSample, logout, setToken } from "./api";
import type { Analysis, LandRecord, Session } from "./api";
import Ask from "./components/Ask";
import Drawer from "./components/Drawer";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { IconClock, IconLock, IconPhone, IconWifiOff } from "./components/Icons";
import Login from "./components/Login";
import Report from "./components/Report";
import Review from "./components/Review";
import Splash from "./components/Splash";
import Stepper from "./components/Stepper";
import type { StepKey } from "./components/Stepper";
import Upload from "./components/Upload";
import { describeError } from "./errors";
import { useOnline, useSessionClock, useStoredLang } from "./hooks";
import { STR } from "./i18n";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FaqPage from "./pages/FaqPage";
import Find from "./pages/Find";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Records from "./pages/Records";
import Terms from "./pages/Terms";
import { useRoute } from "./router";
import { SITE } from "./site";
import { useTheme } from "./theme";
import { cleanRecord, mergeRecords, validate } from "./util";

type View = "upload" | "review" | "report";
const SPLASH_KEY = "zs-splash";

export default function App() {
  const [lang, setLang] = useStoredLang();
  const [theme, toggleTheme, setTheme] = useTheme();
  const s = STR[lang];
  const t = SITE[lang];
  const online = useOnline();
  const { route, query, go } = useRoute();

  // स्वागत-पर्दा: हर टैब में एक बार, और सिर्फ़ तब जब सीधे होम पर खुले
  const [splash, setSplash] = useState(() => {
    try { return sessionStorage.getItem(SPLASH_KEY) !== "1" && ["", "#", "#/"].includes(window.location.hash); } catch { return false; }
  });
  const closeSplash = useCallback(() => { try { sessionStorage.setItem(SPLASH_KEY, "1"); } catch { /* ignore */ } setSplash(false); }, []);

  const [menu, setMenu] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setMenu(false), []);
  useEffect(() => { setMenu(false); }, [route]);

  const [authed, setAuthed] = useState(false);
  const [phone, setPhone] = useState(""); // सिर्फ़ प्रोफ़ाइल में ढककर दिखाने के लिए, memory में; ब्राउज़र में कहीं सेव नहीं
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [view, setView] = useState<View>("upload");
  const [rec, setRec] = useState<LandRecord | null>(null);
  const [res, setRes] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    document.title = route === "home" ? `${s.title} · ${s.hero_title}` : `${t[`nav_${route}` as keyof typeof t] as string} · ${s.title}`;
  }, [s, t, route]);

  /** सब कुछ मिटाकर लॉगिन पर लौटो। सर्वर पर सत्र हटाना सर्वोत्तम-प्रयास है; ब्राउज़र का डेटा हम हर हाल में साफ़ करते हैं। */
  const reset = (message = "") => {
    setToken(""); setAuthed(false); setPhone(""); setExpiresAt(null); setRec(null); setRes(null);
    setView("upload"); setError(null); setSampleBusy(false); setBusy(false); setNotice(message);
  };
  const signOut = () => { void logout().catch(() => undefined); reset(); };
  const eraseAndLeave = () => { signOut(); go("home"); };
  const minutesLeft = useSessionClock(expiresAt, () => reset(s.session_over));

  /** 401 = सत्र खत्म। बाकी त्रुटियाँ उपयोगकर्ता को दिखाओ। */
  const fail = (e: unknown, show: boolean) => {
    if (e instanceof ApiError && e.status === 401) { reset(s.session_over); return; }
    if (show) setError(e);
  };

  const onLoggedIn = (sess: Session, ph: string) => {
    setAuthed(true); setPhone(ph); setExpiresAt(Date.now() + sess.expires_in * 1000); setView("upload"); setNotice("");
  };

  const problems = useMemo(() => (rec ? validate(rec) : []), [rec]);
  const step: StepKey = !authed ? "login" : view;
  const reachable: Record<StepKey, boolean> = { login: true, upload: authed, review: authed && !!rec, report: authed && !!res };

  const goStep = (k: StepKey) => { if (k !== "login" && reachable[k]) { setError(null); setView(k); } };
  /** दूसरे पन्नों (मेरे खसरे) से सीधे जाँच या रिपोर्ट के चरण पर। */
  const openView = (v: View) => { setError(null); setView(v); go("start"); };

  // हर पन्ना या चरण बदलने पर ऊपर और उस पन्ने के शीर्षक पर फ़ोकस (स्क्रीन-रीडर और कीबोर्ड के लिए)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => (document.getElementById("view-title") ?? document.getElementById("page-title") ?? document.getElementById("hero-title"))?.focus({ preventScroll: true }));
  }, [route, step]);

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
      const a = await analyze(cleanRecord(r), true);
      setRec(r); setRes(a); setView("report");
    } catch (e) { fail(e, true); } finally { setSampleBusy(false); }
  };

  const clear = () => { setRec(null); setRes(null); setError(null); setView("upload"); };
  const errorText = error === null ? "" : describeError(error, lang, s);
  const trustIcons = [IconLock, IconClock, IconPhone];

  const wizard = (
    <>
      <h1 className="sr">{t.nav_start}</h1>
      <Stepper s={s} lang={lang} current={step} reachable={reachable} onGo={goStep} />
      {!authed && (
        <div className="landing">
          <section className="card intro" aria-labelledby="view-title">
            <h2 id="view-title" tabIndex={-1}>{s.hero_title}</h2>
            <p className="muted">{s.hero_lead}</p>
            <ul className="trust">
              {s.trust.map((x, i) => { const I = trustIcons[i]; return <li key={x}><I size={18} />{x}</li>; })}
            </ul>
            <p className="muted small">{s.hero_note}</p>
          </section>
          <div>
            {notice && <p className="notice" role="status">{notice}</p>}
            <Login s={s} lang={lang} online={online} onDone={onLoggedIn} />
          </div>
        </div>
      )}
      {authed && view === "upload" && (
        <>
          <Upload s={s} lang={lang} online={online} haveRecord={rec?.plots.length ?? 0} sampleBusy={sampleBusy}
            onRecords={onRecords} onSample={() => void openSample()} onContinue={() => goStep("review")} onFail={(e) => fail(e, false)} />
          {errorText && <p className="err" role="alert">{errorText}</p>}
        </>
      )}
      {authed && view === "review" && rec && (
        <Review s={s} lang={lang} rec={rec} setRec={edit} problems={problems} busy={busy} online={online} error={errorText}
          onCheck={() => void check()} onAddFiles={() => goStep("upload")} onClear={clear} />
      )}
      {authed && view === "report" && rec && res && (
        <Report s={s} lang={lang} rec={rec} res={res} onEdit={() => goStep("review")} onNew={clear} />
      )}
      {authed && <Ask s={s} lang={lang} online={online} />}
    </>
  );

  return (
    <div className="app">
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>{s.skip}</a>
      <Header s={s} t={t} lang={lang} setLang={setLang} theme={theme} onTheme={toggleTheme} authed={authed} minutesLeft={minutesLeft}
        menuOpen={menu} onMenu={() => setMenu(true)} menuBtn={menuBtn} />
      <Drawer open={menu} onClose={closeMenu} s={s} t={t} lang={lang} setLang={setLang} theme={theme} onTheme={toggleTheme}
        authed={authed} minutesLeft={minutesLeft} onExit={eraseAndLeave} route={route} returnFocus={menuBtn} />
      {!online && <div className="offline no-print" role="status"><IconWifiOff size={18} /> {s.offline}</div>}

      <main id="main" tabIndex={-1}>
        {route === "home" && <Home s={s} t={t} lang={lang} />}
        {route === "start" && wizard}
        {route === "records" && <Records s={s} t={t} lang={lang} authed={authed} rec={rec} res={res} onReport={() => openView("report")} onReview={() => openView("review")} />}
        {route === "profile" && <Profile s={s} t={t} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} authed={authed} phone={phone}
          minutesLeft={minutesLeft} plots={rec?.plots.length ?? 0} hasReport={!!res} onErase={eraseAndLeave} />}
        {route === "find" && <Find t={t} lang={lang} />}
        {route === "about" && <About t={t} />}
        {route === "contact" && <Contact s={s} t={t} lang={lang} online={online} initialKind={query.get("kind")} />}
        {route === "faq" && <FaqPage t={t} />}
        {route === "terms" && <Terms t={t} />}
      </main>

      <Footer s={s} t={t} lang={lang} />
      {splash && <Splash s={s} t={t} lang={lang} setLang={setLang} onDone={closeSplash} />}
    </div>
  );
}
