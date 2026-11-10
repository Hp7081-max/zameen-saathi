import type { RefObject } from "react";
import type { Lang } from "../api";
import type { Strings } from "../i18n";
import { href } from "../router";
import type { Site } from "../site";
import type { Theme } from "../theme";
import { IconClock, IconMenu, IconMoon, IconSun, Logo } from "./Icons";

type Props = {
  s: Strings; t: Site; lang: Lang; setLang: (l: Lang) => void; theme: Theme; onTheme: () => void;
  authed: boolean; minutesLeft: number | null; menuOpen: boolean; onMenu: () => void; menuBtn: RefObject<HTMLButtonElement>;
};

/** ऊपरी पट्टी: लोगो + नाम, (लॉगिन के बाद) सत्र की घड़ी, भाषा, रंग-रूप का बटन और तीन-रेखा वाला मेनू। */
export default function Header({ s, t, lang, setLang, theme, onTheme, authed, minutesLeft, menuOpen, onMenu, menuBtn }: Props) {
  return (
    <header className="top no-print">
      <div className="top-in">
        <a className="brand" href={href("home")} onClick={() => window.scrollTo({ top: 0 })} aria-label={s.title}>
          <Logo size={40} />
          <span>{s.title}</span>
        </a>
        <div className="top-tools">
          {authed && minutesLeft !== null && (
            <span className={`chip session${minutesLeft <= 5 ? " warn" : ""}`} role="timer" aria-live="off">
              <IconClock size={16} /> {s.session_left(minutesLeft)}
            </span>
          )}
          <div className="seg hide-sm" role="group" aria-label={s.lang_label}>
            {(["hi", "en"] as Lang[]).map((l) => (
              <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l === "hi" ? s.lang_hi : s.lang_en}</button>
            ))}
          </div>
          <button type="button" className="iconbtn" onClick={onTheme} aria-label={theme === "dark" ? t.theme_to_light : t.theme_to_dark} title={theme === "dark" ? t.theme_to_light : t.theme_to_dark}>
            {theme === "dark" ? <IconSun size={20} /> : <IconMoon size={20} />}
          </button>
          <button ref={menuBtn} type="button" className="iconbtn" onClick={onMenu} aria-label={t.menu_open} aria-expanded={menuOpen} aria-controls="site-menu">
            <IconMenu size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
