import { useEffect, useRef } from "react";
import type { Lang } from "../api";
import type { Strings } from "../i18n";
import type { Site } from "../site";
import { IconNext } from "./Icons";

type Props = { s: Strings; t: Site; lang: Lang; setLang: (l: Lang) => void; onDone: () => void };

/** पहली बार खुलने पर स्वागत-पर्दा ("Welcome to ... Get started")। हर टैब में एक ही बार; Esc या बटन से हटता है। */
export default function Splash({ s, t, lang, setLang, onDone }: Props) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
    document.body.classList.add("lock");
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onDone(); };
    document.addEventListener("keydown", key);
    return () => { document.body.classList.remove("lock"); document.removeEventListener("keydown", key); };
  }, [onDone]);

  return (
    <div className="splash" role="dialog" aria-modal="true" aria-label={s.title}>
      <svg className="splash-art" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <g className="splash-parcels">
          <path d="M-10 40l150-30 40 170-170 40z" /><path d="M160 0l130 20-20 150-120-20z" /><path d="M300 30l120 10-10 140-110 10z" />
          <path d="M-20 240l160-20 30 150-180 30z" /><path d="M190 200l140-10 20 160-150 20z" /><path d="M350 210l70 0v170l-60 10z" />
          <path d="M-10 420l120 10 20 190-150 20z" /><path d="M140 400l180 20-10 170-170-30z" /><path d="M340 420l80 10-10 160-80 10z" />
          <path d="M-10 640l180 10 30 170-210 0z" /><path d="M200 620l150 10 40 190-200 0z" />
        </g>
      </svg>
      <div className="splash-lang seg" role="group" aria-label={s.lang_label}>
        {(["hi", "en"] as Lang[]).map((l) => (
          <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l === "hi" ? s.lang_hi : s.lang_en}</button>
        ))}
      </div>
      <div className="splash-body">
        <p className="eyebrow wide">{t.splash_welcome}</p>
        <h1 className="splash-title">{s.title}</h1>
        <span className="splash-rule" aria-hidden="true" />
        <p className="splash-tag">{t.splash_tag}</p>
        <button ref={btn} type="button" className="btn glass big" onClick={onDone}>{t.splash_go} <IconNext size={18} /></button>
      </div>
    </div>
  );
}
