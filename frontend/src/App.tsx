import { useState } from "react";
import { analyze, ask, extract, Analysis, Answer, LandRecord } from "./api";

export default function App() {
  const [rec, setRec] = useState<LandRecord | null>(null);
  const [res, setRes] = useState<Analysis | null>(null);
  const [q, setQ] = useState("");
  const [ans, setAns] = useState<Answer | null>(null);
  const [err, setErr] = useState("");
  const run = (fn: () => Promise<void>) => fn().catch((e) => setErr(String(e.message || e)));

  const setArea = (i: number, v: number) =>
    rec && setRec({ ...rec, plots: rec.plots.map((p, k) => (k === i ? { ...p, area_ha: v } : p)) });

  return (
    <main>
      <h1>ज़मीन-साथी</h1>
      <p className="lead">अपनी खतौनी की फ़ोटो या PDF डालें। हम पढ़कर दिखाएँगे कि कहाँ दोबारा जाँचना चाहिए।</p>

      <label className="btn">
        खतौनी अपलोड करें
        <input hidden type="file" accept="image/*,.pdf"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) run(async () => { setErr(""); setRes(null); setRec(await extract(f)); }); }} />
      </label>
      {err && <p className="err">{err}</p>}

      {rec && (
        <section>
          <h2>पढ़ी गई जानकारी</h2>
          <p className="hint">कोई अंक गलत पढ़ा गया हो तो यहीं सुधारें।</p>
          <table>
            <thead><tr><th>खसरा</th><th>खाता</th><th>क्षेत्रफल (हे.)</th><th>हिस्सेदार</th></tr></thead>
            <tbody>
              {rec.plots.map((p, i) => (
                <tr key={i}>
                  <td>{p.khasra}</td><td>{p.khata}</td>
                  <td><input type="number" step="0.01" value={p.area_ha} onChange={(e) => setArea(i, +e.target.value)} /></td>
                  <td>{p.owners.map((o) => `${o.name} (${o.share})`).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn" onClick={() => run(async () => setRes(await analyze(rec)))}>जाँच करें</button>
        </section>
      )}

      {res && (
        <section>
          <h2>{res.summary_hi}</h2>
          <ul className="flags">
            {res.flags.map((f, i) => (
              <li key={i} className={f.severity}>
                <strong>खसरा {f.plot}</strong>
                <span>{f.reason_hi}</span>
                <small>{f.source === "rule" ? "नियम से मिला" : "मॉडल से मिला"}</small>
              </li>
            ))}
          </ul>
          <p className="hint">{res.disclaimer}</p>
        </section>
      )}

      <section>
        <h2>सवाल पूछें</h2>
        <div className="row">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="जैसे: दाखिल-खारिज क्या होता है?" />
          <button className="btn" onClick={() => run(async () => setAns(await ask(q)))}>पूछें</button>
        </div>
        {ans && (
          <div className="answer">
            <p>{ans.answer}</p>
            {ans.sources.length > 0 && <small>स्रोत: {ans.sources.join(", ")}</small>}
          </div>
        )}
      </section>
    </main>
  );
}
