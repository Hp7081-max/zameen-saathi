import { useRef, useState } from "react";
import {
  analyze, ApiError, ask, extract, logout, requestOtp, setToken, verifyOtp,
  Analysis, Answer, Flag, LandRecord, Plot,
} from "./api";

type Lang = "hi" | "en";

const HI = {
  title: "ज़मीन-साथी", lang_btn: "English",
  lead: "अपनी खतौनी की फ़ोटो या PDF (8 पन्ने तक) डालें। हम सरल हिंदी में समझाएँगे और बताएँगे कि कहाँ दोबारा जाँचना चाहिए।",
  login_title: "शुरू करने से पहले",
  login_hint: "आपकी फ़ोटो सिर्फ़ जाँच के दौरान मेमोरी में रहती है, कहीं सेव नहीं होती। बाहर निकलते ही सब मिट जाता है।",
  consent: "मैं अपनी खतौनी की जाँच के लिए सहमति देता/देती हूँ।",
  phone_ph: "मोबाइल नंबर (10 अंक)", phone_aria: "मोबाइल नंबर", send_otp: "OTP भेजें",
  otp_ph: "6 अंकों का OTP", otp_aria: "OTP", proceed: "आगे बढ़ें",
  demo_otp: (o: string) => `डेमो मोड: आपका OTP ${o} है (असली SMS अभी जुड़ा नहीं)।`,
  upload: "खतौनी की फ़ोटो या PDF डालें", reading: "पढ़ रहे हैं… (PDF में थोड़ा समय लगता है)",
  read_title: "पढ़ी गई जानकारी", read_hint: "कोई अंक गलत पढ़ा गया हो तो यहीं सुधारें।",
  th_khasra: "खसरा", th_khata: "खाता", th_area: "क्षेत्रफल (हे.)", th_owners: "हिस्सेदार और हिस्सा",
  area_aria: (k: string) => `खसरा ${k} क्षेत्रफल`, share_aria: (n: string) => `${n} का हिस्सा`,
  check: "जाँच करें",
  plain_title: "आपकी खतौनी सरल भाषा में", listen: "🔊 सुनें",
  where_title: "कहाँ दोबारा जाँचें", no_flags: "कोई गड़बड़ी का संकेत नहीं मिला। फिर भी पक्की जाँच तहसील से कराएँ।",
  khasra_word: "खसरा", rule_src: "नियम से मिला", model_src: "मॉडल का अनुमान",
  map_title: "नक्शे में आपके प्लॉट", map_hint: "गहरा रंग और ! का निशान यानी वहाँ ज़्यादा ध्यान दें।",
  check_title: "तहसील जाने की तैयारी", check_who: "किससे मिलें", check_carry: "क्या ले जाएँ", check_ask: "क्या पूछें",
  check_plots: (p: string) => `खसरा: ${p}`,
  print: "रिपोर्ट छापें / PDF बनाएँ",
  ask_title: "सवाल पूछें", ask_ph: "जैसे: खसरा क्या होता है?", ask_aria: "सवाल", ask_btn: "पूछें",
  voice_aria: "बोलकर पूछें", listening: "सुन रहे हैं…", source: "स्रोत", ask_note: "",
  exit: "बाहर निकलें और डेटा मिटाएँ", generic_err: "कुछ गड़बड़ हुई।", session_over: "लॉगिन ज़रूरी है। दोबारा लॉगिन करें।",
  sev: { high: "ज़रूरी", medium: "ध्यान दें", low: "देख लें" },
};
type Strings = typeof HI;
const EN: Strings = {
  title: "Zameen-Saathi", lang_btn: "हिंदी",
  lead: "Upload a photo or PDF (up to 8 pages) of your khatauni. We explain it in plain language and show where to double-check.",
  login_title: "Before you start",
  login_hint: "Your photo stays in memory only while it is checked. It is never saved, and everything is erased when you leave.",
  consent: "I agree to have my khatauni checked.",
  phone_ph: "Mobile number (10 digits)", phone_aria: "Mobile number", send_otp: "Send OTP",
  otp_ph: "6-digit OTP", otp_aria: "OTP", proceed: "Continue",
  demo_otp: (o: string) => `Demo mode: your OTP is ${o} (real SMS is not connected).`,
  upload: "Upload khatauni photo or PDF", reading: "Reading… (PDFs take a little longer)",
  read_title: "What we read", read_hint: "If a number was read wrongly, fix it here.",
  th_khasra: "Khasra", th_khata: "Khata", th_area: "Area (ha)", th_owners: "Owners and share",
  area_aria: (k: string) => `Area of khasra ${k}`, share_aria: (n: string) => `Share of ${n}`,
  check: "Check",
  plain_title: "Your khatauni in plain words", listen: "🔊 Listen",
  where_title: "Where to double-check", no_flags: "No warning signs found. Still, confirm with the tehsil.",
  khasra_word: "Khasra", rule_src: "Found by a rule", model_src: "Model estimate",
  map_title: "Your plots on the map", map_hint: "A darker colour and a ! mark mean look here first.",
  check_title: "Getting ready for the tehsil", check_who: "Who to meet", check_carry: "What to carry", check_ask: "What to ask",
  check_plots: (p: string) => `Khasra: ${p}`,
  print: "Print report / save as PDF",
  ask_title: "Ask a question", ask_ph: "e.g. What is a khasra?", ask_aria: "Question", ask_btn: "Ask",
  voice_aria: "Ask by speaking", listening: "Listening…", source: "Source", ask_note: "Answers come from our Hindi glossary.",
  exit: "Sign out and erase my data", generic_err: "Something went wrong.", session_over: "Please sign in again.",
  sev: { high: "Important", medium: "Take note", low: "Worth a look" },
};
const STR: Record<Lang, Strings> = { hi: HI, en: EN };

function Login({ s, onDone }: { s: Strings; onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [demo, setDemo] = useState("");
  const [err, setErr] = useState("");
  const guard = (fn: () => Promise<void>) => fn().catch((e) => setErr(e.message || s.generic_err));

  return (
    <section className="card">
      <h2>{s.login_title}</h2>
      <p className="hint">{s.login_hint}</p>
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        {s.consent}
      </label>
      <div className="row">
        <input inputMode="numeric" maxLength={10} placeholder={s.phone_ph} value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} aria-label={s.phone_aria} />
        <button className="btn" disabled={!consent || phone.length !== 10}
          onClick={() => guard(async () => { setErr(""); const r = await requestOtp(phone, consent); setSent(true); setDemo(r.debug_otp ?? ""); })}>
          {s.send_otp}
        </button>
      </div>
      {sent && (
        <div className="row">
          <input inputMode="numeric" maxLength={6} placeholder={s.otp_ph} value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} aria-label={s.otp_aria} />
          <button className="btn" disabled={otp.length !== 6}
            onClick={() => guard(async () => { const r = await verifyOtp(phone, otp); setToken(r.token); onDone(); })}>
            {s.proceed}
          </button>
        </div>
      )}
      {demo && <p className="hint">{s.demo_otp(demo)}</p>}
      {err && <p className="err" role="alert">{err}</p>}
    </section>
  );
}

const FILL: Record<string, string> = { high: "var(--high)", medium: "var(--medium)", low: "var(--low)", none: "var(--field)" };
const RANK: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3 };

/** नक्शा तभी दिखता है जब प्लॉट के साथ bbox हो (synthetic या आगे डिजिटाइज़ किया नक्शा)। */
export function PlotMap({ plots, flags, s }: { plots: Plot[]; flags: Flag[]; s: Strings }) {
  const seen = new Set<string>();
  const items: Plot[] = [];
  for (const p of plots) {
    if (p.bbox && p.bbox.length === 4 && !seen.has(p.khasra)) { seen.add(p.khasra); items.push(p); }
  }
  if (items.length === 0) return null;
  const box = (p: Plot) => p.bbox as number[];
  const x0 = Math.min(...items.map((p) => box(p)[0])), y0 = Math.min(...items.map((p) => box(p)[1]));
  const x1 = Math.max(...items.map((p) => box(p)[0] + box(p)[2])), y1 = Math.max(...items.map((p) => box(p)[1] + box(p)[3]));
  const pad = Math.max(x1 - x0, y1 - y0) * 0.03;
  const sevOf = (k: string): string =>
    flags.filter((f) => f.plot === k).reduce((m: string, f) => (RANK[f.severity] > RANK[m] ? f.severity : m), "none");
  return (
    <figure className="map">
      <svg viewBox={`${x0 - pad} ${y0 - pad} ${x1 - x0 + 2 * pad} ${y1 - y0 + 2 * pad}`} role="img" aria-label={s.map_title}>
        {items.map((p) => {
          const [x, y, w, h] = box(p);
          const sev = sevOf(p.khasra);
          return (
            <g key={p.khasra}>
              <title>{`${s.khasra_word} ${p.khasra}`}</title>
              <rect x={x} y={y} width={w} height={h} fill={FILL[sev]} fillOpacity={0.55} stroke="var(--ink)"
                strokeWidth={Math.max(w, h) / 90} strokeDasharray={sev === "high" ? `${w / 12} ${w / 24}` : undefined} />
              <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(w, h) / 4} fill="var(--ink)">
                {p.khasra}{sev === "high" ? " !" : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="hint">{s.map_hint}</figcaption>
    </figure>
  );
}

export function Report({ rec, res, lang, onSpeak }: { rec: LandRecord; res: Analysis; lang: Lang; onSpeak: (t: string) => void }) {
  const s = STR[lang];
  const hi = lang === "hi";
  return (
    <section className="card report">
      <h2>{hi ? res.summary_hi : res.summary_en}</h2>
      <h3>{s.plain_title}</h3>
      <ul className="plain">
        {(hi ? res.plain_hi : res.plain_en).map((t, i) => (
          <li key={i}>{t} <button className="link no-print" onClick={() => onSpeak(t)}>{s.listen}</button></li>
        ))}
      </ul>
      <PlotMap plots={rec.plots} flags={res.flags} s={s} />
      <h3>{s.where_title}</h3>
      {res.flags.length === 0 && <p>{s.no_flags}</p>}
      <ul className="flags">
        {res.flags.map((f, i) => (
          <li key={i} className={f.severity}>
            <strong>{f.plot !== "-" ? `${s.khasra_word} ${f.plot} · ` : ""}{s.sev[f.severity]}</strong>
            <span>{hi ? f.reason_hi : f.reason_en}</span>
            <small>{f.source === "rule" ? s.rule_src : s.model_src}</small>
          </li>
        ))}
      </ul>
      {res.checklist.length > 0 && (
        <>
          <h3>{s.check_title}</h3>
          <ul className="checklist">
            {res.checklist.map((c) => (
              <li key={c.code}>
                {c.plots.length > 0 && <strong>{s.check_plots(c.plots.join(", "))}</strong>}
                <p><b>{s.check_who}:</b> {hi ? c.who_hi : c.who_en}</p>
                <p><b>{s.check_carry}:</b></p>
                <ul>{(hi ? c.docs_hi : c.docs_en).map((d, i) => <li key={i}>{d}</li>)}</ul>
                <p><b>{s.check_ask}:</b> {hi ? c.ask_hi : c.ask_en}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="hint">{hi ? res.disclaimer : res.disclaimer_en}</p>
      <button className="btn no-print" onClick={() => window.print()}>{s.print}</button>
    </section>
  );
}

function useVoice(onText: (t: string) => void, lang: Lang) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const [on, setOn] = useState(false);
  const ref = useRef<any>(null);
  const start = () => {
    if (!SR) return;
    const r = new SR();
    r.lang = lang === "hi" ? "hi-IN" : "en-IN";
    r.onresult = (e: any) => onText(e.results[0][0].transcript);
    r.onend = () => setOn(false);
    ref.current = r; setOn(true); r.start();
  };
  return { supported: !!SR, on, start };
}

export default function App() {
  const [lang, setLang] = useState<Lang>("hi");
  const [authed, setAuthed] = useState(false);
  const [rec, setRec] = useState<LandRecord | null>(null);
  const [res, setRes] = useState<Analysis | null>(null);
  const [q, setQ] = useState("");
  const [ans, setAns] = useState<Answer | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const s = STR[lang];
  const voice = useVoice(setQ, lang);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr("");
    try { await fn(); } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) { setAuthed(false); setToken(""); setErr(s.session_over); }
      else setErr(e.message || s.generic_err);
    } finally { setBusy(false); }
  };
  const patch = (i: number, f: (p: Plot) => Plot) =>
    rec && setRec({ ...rec, plots: rec.plots.map((p, k) => (k === i ? f(p) : p)) });
  const exit = () => run(async () => { await logout(); setToken(""); setAuthed(false); setRec(null); setRes(null); setAns(null); });
  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text); u.lang = lang === "hi" ? "hi-IN" : "en-IN"; window.speechSynthesis.speak(u);
  };

  return (
    <main lang={lang}>
      <header className="top">
        <h1>{s.title}</h1>
        <span className="no-print">
          <button className="link" onClick={() => setLang(lang === "hi" ? "en" : "hi")}>{s.lang_btn}</button>
          {authed && <>{" · "}<button className="link" onClick={exit}>{s.exit}</button></>}
        </span>
      </header>
      <p className="lead">{s.lead}</p>

      {!authed ? <Login s={s} onDone={() => { setAuthed(true); setErr(""); }} /> : (
        <>
          <label className="btn">
            {busy ? s.reading : s.upload}
            <input hidden type="file" accept="image/png,image/jpeg,image/webp,application/pdf" disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) run(async () => { setRes(null); setRec(await extract(f)); }); }} />
          </label>
          {err && <p className="err" role="alert">{err}</p>}

          {rec && (
            <section className="card">
              <h2>{s.read_title}</h2>
              <p className="hint">{s.read_hint}</p>
              <div className="scroll">
                <table>
                  <thead><tr><th>{s.th_khasra}</th><th>{s.th_khata}</th><th>{s.th_area}</th><th>{s.th_owners}</th></tr></thead>
                  <tbody>
                    {rec.plots.map((p, i) => (
                      <tr key={i}>
                        <td>{p.khasra}</td><td>{p.khata}</td>
                        <td><input type="number" step="0.001" value={p.area_ha} aria-label={s.area_aria(p.khasra)}
                          onChange={(e) => patch(i, (x) => ({ ...x, area_ha: +e.target.value }))} /></td>
                        <td>{p.owners.map((o, k) => (
                          <span key={k} className="owner">{o.name}
                            <input type="number" step="0.05" min="0" max="1" value={o.share} aria-label={s.share_aria(o.name)}
                              onChange={(e) => patch(i, (x) => ({ ...x, owners: x.owners.map((w, j) => (j === k ? { ...w, share: +e.target.value } : w)) }))} />
                          </span>))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn" disabled={busy} onClick={() => run(async () => setRes(await analyze(rec)))}>{s.check}</button>
            </section>
          )}

          {rec && res && <Report rec={rec} res={res} lang={lang} onSpeak={speak} />}

          <section className="card no-print">
            <h2>{s.ask_title}</h2>
            <div className="row">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={s.ask_ph} aria-label={s.ask_aria} />
              {voice.supported && <button className="btn alt" onClick={voice.start} aria-label={s.voice_aria}>{voice.on ? s.listening : "🎤"}</button>}
              <button className="btn" disabled={!q.trim() || busy} onClick={() => run(async () => setAns(await ask(q)))}>{s.ask_btn}</button>
            </div>
            {ans && (
              <div className="answer">
                <p>{ans.answer}</p>
                {ans.sources.length > 0 && <small>{s.source}: {ans.sources.join(", ")}</small>}
                {s.ask_note && <small> {s.ask_note}</small>}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
