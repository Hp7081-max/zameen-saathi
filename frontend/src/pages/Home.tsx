import type { Lang } from "../api";
import { ArtChecklist, ArtMap, ArtRead, ArtShield } from "../components/Art";
import FaqList from "../components/FaqList";
import { IconCheck, IconFile, IconMap, IconNext, IconPin, IconShield, IconX } from "../components/Icons";
import StatsLive from "../components/StatsLive";
import type { Strings } from "../i18n";
import { href } from "../router";
import type { Site } from "../site";
import { digits } from "../util";

type Props = { s: Strings; t: Site; lang: Lang };

const SC_ICONS = [IconFile, IconMap, IconCheck];

/** होम: Refoodify जैसा क्रम। स्वागत → लाइव गिनती → तरीका → क्षमताएँ → स्थितियाँ → तुलना → सवाल → बुलावा। */
export default function Home({ s, t, lang }: Props) {
  const arts = [ArtRead, ArtMap, ArtChecklist, ArtShield];
  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-text">
          <p className="eyebrow">{t.hero_eyebrow}</p>
          <h1 id="hero-title" tabIndex={-1}>{s.hero_title}</h1>
          <p className="lead muted">{s.hero_lead}</p>
          <div className="hero-cta">
            <a className="btn primary big" href={href("start")}>{t.cta_check} <IconNext size={20} /></a>
            <a className="btn outline big" href={href("find")}>{t.cta_find} <IconPin size={20} /></a>
          </div>
          <p className="muted small">{s.hero_note}</p>
          <p className="eyebrow plain">{t.built_for}</p>
          <ul className="pills">{t.built_for_list.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
        <figure className="demo" aria-label={s.demo_label}>
          <figcaption>{s.demo_label}</figcaption>
          <div className="ledger" role="table" aria-label={s.demo_label}>
            <div className="ledger-row head" role="row">{s.demo_head.map((h) => <span role="columnheader" key={h}>{h}</span>)}</div>
            <div className="ledger-row" role="row">
              {s.demo_row.map((c, i) => <span role="cell" key={i}>{c}</span>)}
              <span className="stamp" aria-hidden="true">{s.demo_stamp}</span>
            </div>
          </div>
          <p className="demo-plain">{s.demo_plain}</p>
        </figure>
      </section>

      <section className="sec" aria-labelledby="st-title">
        <header className="sec-head center"><p className="eyebrow">{t.st_eyebrow}</p><h2 id="st-title">{t.st_title}</h2><p className="muted">{t.st_lead}</p></header>
        <StatsLive t={t} lang={lang} />
      </section>

      <section className="sec" aria-labelledby="how-title">
        <header className="sec-head center"><p className="eyebrow">{t.how_eyebrow}</p><h2 id="how-title">{t.how_title}</h2><p className="muted">{t.how_lead}</p></header>
        <ol className="steps">
          {t.how_steps.map((st, i) => (
            <li key={st.t} className="card step-card">
              <span className="badge" aria-hidden="true">{digits(i + 1, lang)}</span>
              <h3>{st.t}</h3>
              <p className="muted">{st.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="sec" aria-labelledby="cap-title">
        <header className="sec-head center"><p className="eyebrow">{t.cap_eyebrow}</p><h2 id="cap-title">{t.cap_title}</h2></header>
        <ul className="caps">
          {t.caps.map((c, i) => {
            const A = arts[i];
            return (
              <li key={c.t} className="card cap">
                <A label={c.t} />
                <h3>{c.t}</h3>
                <p className="muted">{c.d}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="sec" aria-labelledby="sc-title">
        <header className="sec-head center"><p className="eyebrow">{t.sc_eyebrow}</p><h2 id="sc-title">{t.sc_title}</h2></header>
        <ul className="scenes">
          {t.sc_items.map((c, i) => {
            const Ic = SC_ICONS[i];
            return (
              <li key={c.k} className={`card scene tone-${i}`}>
                <div className="scene-art" aria-hidden="true"><Ic size={44} /></div>
                <div className="scene-body">
                  <p className="eyebrow">{c.k}</p>
                  <h3>{c.t}</h3>
                  <p className="muted">{c.d}</p>
                  <p className="tag">{t.sc_tag}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="sec" aria-labelledby="why-title">
        <header className="sec-head center"><h2 id="why-title">{t.why_title}</h2></header>
        <div className="why">
          <div className="card why-card bad">
            <p className="eyebrow">{t.why_bad_tag}</p><h3>{t.why_bad_title}</h3>
            <ul>{t.why_bad.map((x) => <li key={x}><IconX size={18} /> {x}</li>)}</ul>
          </div>
          <div className="card why-card good">
            <p className="eyebrow">{t.why_good_tag}</p><h3>{t.why_good_title}</h3>
            <ul>{t.why_good.map((x) => <li key={x}><IconCheck size={18} /> {x}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="sec narrow" aria-labelledby="faq-title">
        <header className="sec-head center"><h2 id="faq-title">{t.faq_title}</h2></header>
        <FaqList items={t.faq.slice(0, 5)} />
        <p className="center-text"><a className="btn ghost" href={href("faq")}>{t.faq_all} <IconNext size={18} /></a></p>
      </section>

      <section className="sec cta" aria-labelledby="cta-title">
        <span className="tile"><IconShield size={26} /></span>
        <h2 id="cta-title">{t.cta_title}</h2>
        <p className="muted">{t.cta_lead}</p>
        <div className="hero-cta center">
          <a className="btn primary big" href={href("start")}>{t.cta_check} <IconNext size={20} /></a>
          <a className="btn outline big" href={href("contact", { kind: "partner" })}>{t.cta_partner} <IconNext size={20} /></a>
        </div>
      </section>
    </div>
  );
}
