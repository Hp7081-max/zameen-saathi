import { useRef, useState } from "react";
import {
  analyze, ask, extract, logout, requestOtp, setToken, verifyOtp,
  Analysis, Answer, LandRecord,
} from "./api";

const SEV: Record<string, string> = { high: "ज़रूरी", medium: "ध्यान दें", low: "देख लें" };

function Login({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [demo, setDemo] = useState("");
  const [err, setErr] = useState("");
  const guard = (fn: () => Promise<void>) => fn().catch((e) => setErr(e.message || "कुछ गड़बड़ हुई।"));

  return (
    <section className="card">
      <h2>शुरू करने से पहले</h2>
      <p className="hint">
        आपकी फ़ोटो सिर्फ़ जाँच के दौरान मेमोरी में रहती है, कहीं सेव नहीं होती। बाहर निकलते ही सब मिट जाता है।
      </p>
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        मैं अपनी खतौनी की जाँच के लिए सहमति देता/देती हूँ।
      </label>
      <div className="row">
        <input inputMode="numeric" maxLength={10} placeholder="मोबाइल नंबर (10 अंक)" value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} aria-label="मोबाइल नंबर" />
        <button className="btn" disabled={!consent || phone.length !== 10}
          onClick={() => guard(async () => { setErr(""); const r = await requestOtp(phone, consent); setSent(true); setDemo(r.debug_otp ?? ""); })}>
          OTP भेजें
        </button>
      </div>
      {sent && (
        <div className="row">
          <input inputMode="numeric" maxLength={6} placeholder="6 अंकों का OTP" value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} aria-label="OTP" />
          <button className="btn" disabled={otp.length !== 6}
            onClick={() => guard(async () => { const r = await verifyOtp(phone, otp); setToken(r.token); onDone(); })}>
            आगे बढ़ें
          </button>
        </div>
      )}
      {demo && <p className="hint">डेमो मोड: आपका OTP {demo} है (असली SMS अभी जुड़ा नहीं)।</p>}
      {err && <p className="err" role="alert">{err}</p>}
    </section>
  );
}

function useVoice(onText: (t: string) => void) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const [on, setOn] = useState(false);
  const ref = useRef<any>(null);
  const start = () => {
    if (!SR) return;
    const r = new SR();
    r.lang = "hi-IN";
    r.onresult = (e: any) => onText(e.results[0][0].transcript);
    r.onend = () => setOn(false);
    ref.current = r; setOn(true); r.start();
  };
  return { supported: !!SR, on, start };
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [rec, setRec] = useState<LandRecord | null>(null);
  const [res, setRes] = useState<Analysis | null>(null);
  const [q, setQ] = useState("");
  const [ans, setAns] = useState<Answer | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const voice = useVoice(setQ);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr("");
    try { await fn(); } catch (e: any) {
      if (/लॉगिन/.test(e.message)) { setAuthed(false); setToken(""); }
      setErr(e.message || "कुछ गड़बड़ हुई।");
    } finally { setBusy(false); }
  };
  const patch = (i: number, f: (p: LandRecord["plots"][0]) => LandRecord["plots"][0]) =>
    rec && setRec({ ...rec, plots: rec.plots.map((p, k) => (k === i ? f(p) : p)) });
  const exit = () => run(async () => { await logout(); setToken(""); setAuthed(false); setRec(null); setRes(null); setAns(null); });
  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text); u.lang = "hi-IN"; window.speechSynthesis.speak(u);
  };

  return (
    <main>
      <header className="top">
        <h1>ज़मीन-साथी</h1>
        {authed && <button className="link" onClick={exit}>बाहर निकलें और डेटा मिटाएँ</button>}
      </header>
      <p className="lead">अपनी खतौनी की फ़ोटो या PDF (8 पन्ने तक) डालें। हम सरल हिंदी में समझाएँगे और बताएँगे कि कहाँ दोबारा जाँचना चाहिए।</p>

      {!authed ? <Login onDone={() => setAuthed(true)} /> : (
        <>
          <label className="btn">
            {busy ? "पढ़ रहे हैं…" : "खतौनी की फ़ोटो या PDF डालें"}
            <input hidden type="file" accept="image/png,image/jpeg,image/webp,application/pdf" disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) run(async () => { setRes(null); setRec(await extract(f)); }); }} />
          </label>
          {err && <p className="err" role="alert">{err}</p>}

          {rec && (
            <section className="card">
              <h2>पढ़ी गई जानकारी</h2>
              <p className="hint">कोई अंक गलत पढ़ा गया हो तो यहीं सुधारें।</p>
              <div className="scroll">
                <table>
                  <thead><tr><th>खसरा</th><th>खाता</th><th>क्षेत्रफल (हे.)</th><th>हिस्सेदार और हिस्सा</th></tr></thead>
                  <tbody>
                    {rec.plots.map((p, i) => (
                      <tr key={i}>
                        <td>{p.khasra}</td><td>{p.khata}</td>
                        <td><input type="number" step="0.001" value={p.area_ha} aria-label={`खसरा ${p.khasra} क्षेत्रफल`}
                          onChange={(e) => patch(i, (x) => ({ ...x, area_ha: +e.target.value }))} /></td>
                        <td>{p.owners.map((o, k) => (
                          <span key={k} className="owner">{o.name}
                            <input type="number" step="0.05" min="0" max="1" value={o.share} aria-label={`${o.name} का हिस्सा`}
                              onChange={(e) => patch(i, (x) => ({ ...x, owners: x.owners.map((w, j) => (j === k ? { ...w, share: +e.target.value } : w)) }))} />
                          </span>))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn" disabled={busy} onClick={() => run(async () => setRes(await analyze(rec)))}>जाँच करें</button>
            </section>
          )}

          {res && (
            <section className="card report">
              <h2>{res.summary_hi}</h2>
              <h3>आपकी खतौनी सरल भाषा में</h3>
              <ul className="plain">{res.plain_hi.map((t, i) => <li key={i}>{t} <button className="link no-print" onClick={() => speak(t)}>🔊 सुनें</button></li>)}</ul>
              <h3>कहाँ दोबारा जाँचें</h3>
              {res.flags.length === 0 && <p>कोई गड़बड़ी का संकेत नहीं मिला। फिर भी पक्की जाँच तहसील से कराएँ।</p>}
              <ul className="flags">
                {res.flags.map((f, i) => (
                  <li key={i} className={f.severity}>
                    <strong>खसरा {f.plot} · {SEV[f.severity]}</strong>
                    <span>{f.reason_hi}</span>
                    <small>{f.source === "rule" ? "नियम से मिला" : "मॉडल का अनुमान"}</small>
                  </li>
                ))}
              </ul>
              <p className="hint">{res.disclaimer}</p>
              <button className="btn no-print" onClick={() => window.print()}>रिपोर्ट छापें / PDF बनाएँ</button>
            </section>
          )}

          <section className="card no-print">
            <h2>सवाल पूछें</h2>
            <div className="row">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="जैसे: खसरा क्या होता है?" aria-label="सवाल" />
              {voice.supported && <button className="btn alt" onClick={voice.start} aria-label="बोलकर पूछें">{voice.on ? "सुन रहे हैं…" : "🎤"}</button>}
              <button className="btn" disabled={!q.trim() || busy} onClick={() => run(async () => setAns(await ask(q)))}>पूछें</button>
            </div>
            {ans && (
              <div className="answer">
                <p>{ans.answer}</p>
                {ans.sources.length > 0 && <small>स्रोत: {ans.sources.join(", ")}</small>}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
