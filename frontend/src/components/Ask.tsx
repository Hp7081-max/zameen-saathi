import { useCallback, useEffect, useState } from "react";
import { ask, fetchTopics } from "../api";
import type { Answer, Lang } from "../api";
import { describeError } from "../errors";
import type { Strings } from "../i18n";
import { useVoiceInput } from "../hooks";
import { IconAsk, IconMic } from "./Icons";

type Props = { s: Strings; lang: Lang; online: boolean };

export default function Ask({ s, lang, online }: Props) {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState<Answer | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);

  useEffect(() => {
    let live = true;
    setTopics([]);
    fetchTopics(lang).then((r) => { if (live) setTopics(r.topics); }).catch(() => { /* सुझाव वैकल्पिक हैं */ });
    return () => { live = false; };
  }, [lang]);

  const run = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question) return;
    setBusy(true); setErr(null);
    try { setAns(await ask(question, lang)); } catch (e) { setErr(e); } finally { setBusy(false); }
  }, [lang]);

  const voice = useVoiceInput(lang, (t) => { setQ(t); void run(t); });
  const pick = (t: string) => { setQ(t); void run(t); };
  const chips = (ans?.related.length ? ans.related : topics).slice(0, 6);

  return (
    <section className="ask no-print" aria-labelledby="ask-title">
      <h2 id="ask-title"><IconAsk size={26} /> {s.ask_title}</h2>
      <p className="hint">{s.ask_hint}</p>
      <form className="askbar" onSubmit={(e) => { e.preventDefault(); void run(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={s.ask_ph} aria-label={s.ask_aria} maxLength={300} />
        {voice.supported && (
          <button type="button" className={`btn icon${voice.listening ? " on" : ""}`} onClick={voice.listening ? voice.stop : voice.start} aria-label={s.voice_aria} aria-pressed={voice.listening} title={s.voice_aria}>
            <IconMic size={20} />
          </button>
        )}
        <button type="submit" className="btn primary" disabled={busy || !q.trim() || !online}>{busy ? "…" : s.ask_btn}</button>
      </form>
      {voice.listening && <p className="hint" role="status">{s.listening}</p>}
      {voice.failed && !voice.listening && <p className="hint" role="status">{s.voice_fail}</p>}
      {err !== null && <p className="err" role="alert">{describeError(err, lang, s)}</p>}

      {ans && (
        <div className="answer" role="region" aria-label={s.answer_aria} aria-live="polite">
          {ans.title && <h3>{ans.title}</h3>}
          <p>{ans.answer}</p>
          {ans.sources.length > 0 && <p className="hint small">{s.source}: {ans.sources.join(", ")}</p>}
        </div>
      )}
      {chips.length > 0 && (
        <div className="chips">
          <p className="hint small">{ans ? s.suggest : ""}</p>
          <ul>{chips.map((c) => <li key={c}><button type="button" className="chip-btn" disabled={busy || !online} onClick={() => pick(c)}>{c}</button></li>)}</ul>
        </div>
      )}
    </section>
  );
}
