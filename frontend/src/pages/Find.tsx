import type { Lang } from "../api";
import { IconExternal, IconNext, IconPin, IconUpload } from "../components/Icons";
import Page from "../components/Page";
import { href } from "../router";
import type { Site } from "../site";

const maps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

/** Refoodify के "Find Nearby NGOs" की जगह: नज़दीकी तहसील/CSC (Google Maps खुलता है, हमें जगह नहीं मिलती) और सरकारी ठिकाने। */
export default function Find({ t, lang }: { t: Site; lang: Lang }) {
  const q = lang === "hi"
    ? { tehsil: "तहसील कार्यालय मेरे पास", csc: "कॉमन सर्विस सेंटर CSC मेरे पास" }
    : { tehsil: "tehsil office near me", csc: "Common Service Centre CSC near me" };
  return (
    <Page title={t.find_title} lead={t.find_lead}>
      <div className="find-btns">
        <a className="btn primary big" href={maps(q.tehsil)} target="_blank" rel="noopener noreferrer"><IconPin size={20} /> {t.find_tehsil} <IconExternal size={16} /><span className="sr">({t.out_new_tab})</span></a>
        <a className="btn outline big" href={maps(q.csc)} target="_blank" rel="noopener noreferrer"><IconPin size={20} /> {t.find_csc} <IconExternal size={16} /><span className="sr">({t.out_new_tab})</span></a>
      </div>
      <p className="muted small">{t.find_privacy}</p>

      <section aria-labelledby="find-links" className="sec-tight">
        <h2 id="find-links">{t.find_links_title}</h2>
        <ul className="linkcards">
          {t.find_links.map((l) => {
            const ext = l.url.startsWith("http");
            return (
              <li key={l.url} className="card">
                <h3>{l.t}</h3>
                <p className="muted">{l.d}</p>
                <a className="with-icon strong" href={l.url} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{l.label} {ext && <IconExternal size={16} />}</a>
              </li>
            );
          })}
        </ul>
        <p className="muted small">{t.find_note}</p>
      </section>

      <div className="card prep">
        <p>{t.find_prep}</p>
        <a className="btn" href={href("start")}><IconUpload size={18} /> {t.find_prep_btn} <IconNext size={18} /></a>
      </div>
    </Page>
  );
}
