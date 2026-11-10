import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Lang } from "../api";
import type { Strings } from "../i18n";
import { href } from "../router";
import type { Route } from "../router";
import { INFO, NAV } from "../site";
import type { Site } from "../site";
import type { Theme } from "../theme";
import { IconAsk, IconClock, IconDoc, IconHome, IconInfo, IconList, IconLock, IconMail, IconMoon, IconPin, IconSun, IconUpload, IconUser, IconX } from "./Icons";

type Props = {
  open: boolean; onClose: () => void; s: Strings; t: Site; lang: Lang; setLang: (l: Lang) => void;
  theme: Theme; onTheme: () => void; authed: boolean; minutesLeft: number | null; onExit: () => void;
  route: Route; returnFocus: RefObject<HTMLElement>;
};

const ICON: Record<Route, typeof IconHome> = {
  home: IconHome, start: IconUpload, records: IconList, find: IconPin, profile: IconUser,
  about: IconInfo, faq: IconAsk, contact: IconMail, terms: IconDoc,
};

/** तीन-रेखा वाला मेनू (दाईं ओर से खुलता है)। Esc से बंद, Tab पैनल के भीतर ही घूमता है, बंद होने पर फ़ोकस बटन पर लौटता है। */
export default function Drawer({ open, onClose, s, t, lang, setLang, theme, onTheme, authed, minutesLeft, onExit, route, returnFocus }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("lock");
    closeBtn.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const nodes = panel.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key);
    const back = returnFocus.current;
    return () => { document.removeEventListener("keydown", key); document.body.classList.remove("lock"); back?.focus(); };
  }, [open, onClose, returnFocus]);

  if (!open) return null;
  const label = (r: Route): string => t[`nav_${r}` as keyof Site] as string;
  const link = (r: Route) => {
    const Ic = ICON[r];
    return (
      <li key={r}>
        <a href={href(r)} onClick={onClose} aria-current={route === r ? "page" : undefined} className={route === r ? "on" : undefined}>
          <Ic size={20} /> <span>{label(r)}</span>
        </a>
      </li>
    );
  };

  return (
    <div className="drawer" id="site-menu">
      <div className="drawer-back" onClick={onClose} aria-hidden="true" />
      <div className="drawer-panel" role="dialog" aria-modal="true" aria-label={t.menu_title} ref={panel}>
        <div className="drawer-head">
          <strong>{t.menu_title}</strong>
          <button ref={closeBtn} type="button" className="iconbtn" onClick={onClose} aria-label={t.menu_close}><IconX size={20} /></button>
        </div>
        {authed && minutesLeft !== null && (
          <p className={`chip session${minutesLeft <= 5 ? " warn" : ""}`}><IconClock size={16} /> {s.session_left(minutesLeft)}</p>
        )}
        <nav aria-label={t.nav_g_app}>
          <p className="drawer-group">{t.nav_g_app}</p>
          <ul>{NAV.map(link)}</ul>
          <p className="drawer-group">{t.nav_g_info}</p>
          <ul>{INFO.map(link)}</ul>
        </nav>
        <div className="drawer-tools">
          <div className="seg" role="group" aria-label={s.lang_label}>
            {(["hi", "en"] as Lang[]).map((l) => (
              <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l === "hi" ? s.lang_hi : s.lang_en}</button>
            ))}
          </div>
          <button type="button" className="btn small" onClick={onTheme}>
            {theme === "dark" ? <><IconSun size={16} /> {t.theme_to_light}</> : <><IconMoon size={16} /> {t.theme_to_dark}</>}
          </button>
        </div>
        {authed && (
          <button type="button" className="btn danger block" onClick={() => { onClose(); onExit(); }} title={s.exit_title}><IconLock size={16} /> {s.exit}</button>
        )}
      </div>
    </div>
  );
}
