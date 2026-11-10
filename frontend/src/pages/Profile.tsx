import type { Lang } from "../api";
import Gate from "../components/Gate";
import { IconClock, IconLock, IconMoon, IconPhone, IconSun } from "../components/Icons";
import Page from "../components/Page";
import type { Strings } from "../i18n";
import type { Site } from "../site";
import type { Theme } from "../theme";

type Props = {
  s: Strings; t: Site; lang: Lang; setLang: (l: Lang) => void; theme: Theme; setTheme: (t: Theme) => void;
  authed: boolean; phone: string; minutesLeft: number | null; plots: number; hasReport: boolean; onErase: () => void;
};

/** Refoodify के "Profile" की जगह। खाता नहीं है, इसलिए यहाँ सत्र, पसंद और "डेटा मिटाएँ" है। */
export default function Profile({ s, t, lang, setLang, theme, setTheme, authed, phone, minutesLeft, plots, hasReport, onErase }: Props) {
  if (!authed) return <Page title={t.prof_title} lead={t.prof_lead}><Gate t={t} /></Page>;
  const masked = phone.length === 10 ? `+91 ${"•".repeat(6)}${phone.slice(-4)}` : "—";
  return (
    <Page title={t.prof_title} lead={t.prof_lead}>
      <div className="two">
        <section className="card" aria-labelledby="pf-id">
          <h2 id="pf-id"><IconPhone size={20} /> {t.prof_phone}</h2>
          <p className="big-text" dir="ltr">{masked}</p>
          <p className="muted small">{t.prof_phone_note}</p>
        </section>
        <section className="card" aria-labelledby="pf-sess">
          <h2 id="pf-sess"><IconClock size={20} /> {t.prof_session}</h2>
          <p className="big-text">{minutesLeft === null ? "—" : t.prof_left(minutesLeft)}</p>
          <p className="muted">{t.prof_data}: {t.prof_plots(plots)}. {hasReport ? t.prof_report_yes : t.prof_report_no}.</p>
        </section>
      </div>
      <section className="card" aria-labelledby="pf-pref">
        <h2 id="pf-pref">{t.prof_prefs}</h2>
        <div className="prefs">
          <div><p className="lbl">{t.prof_lang}</p>
            <div className="seg" role="group" aria-label={s.lang_label}>
              {(["hi", "en"] as Lang[]).map((l) => <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l === "hi" ? s.lang_hi : s.lang_en}</button>)}
            </div>
          </div>
          <div><p className="lbl">{t.prof_theme}</p>
            <div className="seg" role="group" aria-label={t.theme_label}>
              <button type="button" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><IconMoon size={16} /> {t.prof_theme_dark}</button>
              <button type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")}><IconSun size={16} /> {t.prof_theme_light}</button>
            </div>
          </div>
        </div>
        <p className="muted small">{t.prof_stored}</p>
      </section>
      <section className="card danger-zone" aria-labelledby="pf-erase">
        <h2 id="pf-erase">{t.prof_erase_title}</h2>
        <p className="muted">{t.prof_erase_text}</p>
        <button type="button" className="btn danger" onClick={onErase}><IconLock size={18} /> {t.prof_erase_btn}</button>
      </section>
    </Page>
  );
}
