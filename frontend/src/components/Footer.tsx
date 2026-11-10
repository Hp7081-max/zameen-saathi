import type { Lang } from "../api";
import type { Strings } from "../i18n";
import { href } from "../router";
import type { Site } from "../site";
import { IconMail, IconNext, IconPhoneCall, Logo } from "./Icons";

const EMAIL: string = import.meta.env.VITE_CONTACT_EMAIL ?? "";
const PHONE: string = import.meta.env.VITE_CONTACT_PHONE ?? "";

/** सब पन्नों के नीचे: परिचय, त्वरित लिंक, संसाधन, संपर्क (ईमेल/फ़ोन तभी जब `.env` में रखे हों)। */
export default function Footer({ s, t }: { s: Strings; t: Site; lang: Lang }) {
  return (
    <footer className="foot no-print">
      <div className="foot-grid">
        <div className="foot-about">
          <div className="foot-brand">
            <Logo size={44} />
            <div><strong>{s.title}</strong><p className="muted small">{t.foot_blurb}</p></div>
          </div>
          <ul className="pills">{t.foot_chips.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
        <nav aria-label={t.foot_quick}>
          <h2 className="foot-h">{t.foot_quick}</h2>
          <ul>
            <li><a href={href("about")}>{t.nav_about}</a></li>
            <li><a href={href("contact")}>{t.nav_contact}</a></li>
            <li><a href={href("faq")}>{t.nav_faq}</a></li>
            <li><a href={href("terms")}>{t.nav_terms}</a></li>
          </ul>
        </nav>
        <nav aria-label={t.foot_res}>
          <h2 className="foot-h">{t.foot_res}</h2>
          <ul>
            <li><a href={href("start")}>{t.nav_start}</a></li>
            <li><a href={href("find")}>{t.nav_find}</a></li>
            <li><a href={href("records")}>{t.nav_records}</a></li>
            <li><a href={href("profile")}>{t.nav_profile}</a></li>
          </ul>
        </nav>
        <div>
          <h2 className="foot-h">{t.foot_contact}</h2>
          <ul>
            {EMAIL && <li><a className="with-icon" href={`mailto:${EMAIL}`}><IconMail size={18} /> {EMAIL}</a></li>}
            {PHONE && <li><a className="with-icon" href={`tel:${PHONE}`}><IconPhoneCall size={18} /> {PHONE}</a></li>}
          </ul>
          <a className="btn primary" href={href("contact", { kind: "partner" })}>{t.foot_join} <IconNext size={18} /></a>
        </div>
      </div>
      <div className="foot-base">
        <p>{t.foot_copy(new Date().getFullYear())} {t.foot_tag}</p>
        <p className="muted small">{s.disclaimer_foot}</p>
        <p className="muted small">{s.privacy_foot}</p>
        <p className="muted small">Poppins · SIL Open Font License 1.1</p>
      </div>
    </footer>
  );
}
