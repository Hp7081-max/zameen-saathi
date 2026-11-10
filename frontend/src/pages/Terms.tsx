import Page from "../components/Page";
import type { Site } from "../site";

export default function Terms({ t }: { t: Site }) {
  return (
    <Page title={t.terms_title} lead={t.terms_updated}>
      {t.terms.map((sec, i) => (
        <section key={sec.h} className="card prose" aria-labelledby={`terms-${i}`}>
          <h2 id={`terms-${i}`}>{sec.h}</h2>
          <ol>{sec.p.map((x) => <li key={x}>{x}</li>)}</ol>
        </section>
      ))}
    </Page>
  );
}
