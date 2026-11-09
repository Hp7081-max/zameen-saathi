import type { Lang } from "../api";
import type { Strings } from "../i18n";
import { digits } from "../util";
import { IconClock, IconLock, Logo } from "./Icons";

type Props = {
  s: Strings; lang: Lang; setLang: (l: Lang) => void; authed: boolean; minutesLeft: number | null; onExit: () => void;
};

export default function Header({ s, lang, setLang, authed, minutesLeft, onExit }: Props) {
  return (
    <header className="top no-print">
      <a className="brand" href="/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0 }); }} aria-label={s.title}>
        <Logo />
        <span>{s.title}</span>
      </a>
      <div className="top-tools">
        {authed && minutesLeft !== null && (
          <span className={`chip session${minutesLeft <= 5 ? " warn" : ""}`} role="timer" aria-live="off">
            <IconClock size={16} /> {s.session_left(Number(digits(minutesLeft, "en")))}
          </span>
        )}
        <div className="seg" role="group" aria-label={s.lang_label}>
          {(["hi", "en"] as Lang[]).map((l) => (
            <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l === "hi" ? s.lang_hi : s.lang_en}
            </button>
          ))}
        </div>
        {authed && (
          <button type="button" className="btn ghost small" onClick={onExit} title={s.exit_title}>
            <IconLock size={16} /> {s.exit}
          </button>
        )}
      </div>
    </header>
  );
}
