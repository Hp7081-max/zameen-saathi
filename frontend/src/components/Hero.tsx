import type { Strings } from "../i18n";
import { IconClock, IconLock, IconPhone } from "./Icons";

/** पहला पन्ना: उत्पाद क्या करता है, एक असली-सी खतौनी पंक्ति पर दिखाया गया। पूरे पन्ने की एकमात्र एनिमेशन: मुहर। */
export default function Hero({ s }: { s: Strings }) {
  const icons = [IconLock, IconClock, IconPhone];
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-text">
        <h1 id="hero-title">{s.hero_title}</h1>
        <p className="lead">{s.hero_lead}</p>
        <p className="hint">{s.hero_note}</p>
        <ul className="trust">
          {s.trust.map((t, i) => { const I = icons[i]; return <li key={t}><I size={18} />{t}</li>; })}
        </ul>
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
  );
}
