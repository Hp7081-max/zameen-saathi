import { IconCheck, IconInfo, IconNext, IconX } from "../components/Icons";
import Page from "../components/Page";
import { href } from "../router";
import type { Site } from "../site";

export default function About({ t }: { t: Site }) {
  return (
    <Page title={t.about_title} lead={t.about_lead}>
      <div className="two">
        <section className="card" aria-labelledby="ab-does">
          <h2 id="ab-does">{t.about_does_title}</h2>
          <ul className="ticks">{t.about_does.map((x) => <li key={x}><IconCheck size={18} /> {x}</li>)}</ul>
        </section>
        <section className="card" aria-labelledby="ab-not">
          <h2 id="ab-not">{t.about_doesnt_title}</h2>
          <ul className="ticks bad">{t.about_doesnt.map((x) => <li key={x}><IconX size={18} /> {x}</li>)}</ul>
        </section>
      </div>
      <section className="card limits" aria-labelledby="ab-limits">
        <h2 id="ab-limits">{t.about_limits_title}</h2>
        <ul className="ticks warn">{t.about_limits.map((x) => <li key={x}><IconInfo size={18} /> {x}</li>)}</ul>
      </section>
      <p><a className="btn primary" href={href("start")}>{t.about_cta} <IconNext size={18} /></a></p>
    </Page>
  );
}
