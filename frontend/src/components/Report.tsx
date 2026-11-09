import { useMemo, useState } from "react";
import type { Analysis, Lang, LandRecord, Severity } from "../api";
import type { Strings } from "../i18n";
import { useSpeech } from "../hooks";
import { countBySeverity, facts, fmt, groupFlags, SEVERITIES } from "../util";
import Checklist from "./Checklist";
import { IconBack, IconMap, IconPrint, IconRefresh, IconSpeaker, IconStop, Logo, SeverityMark } from "./Icons";
import Ownership from "./Ownership";
import PlotMap from "./PlotMap";
import Tally from "./Tally";

type Props = { s: Strings; lang: Lang; rec: LandRecord; res: Analysis; onEdit: () => void; onNew: () => void };

export default function Report({ s, lang, rec, res, onEdit, onNew }: Props) {
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [sel, setSel] = useState<string | null>(null);
  const speech = useSpeech(lang);
  const counts = useMemo(() => countBySeverity(res.flags), [res.flags]);
  const groups = useMemo(() => groupFlags(res.flags).filter((g) => filter === "all" || g.flags.some((f) => f.severity === filter)), [res.flags, filter]);
  const f = facts(rec);
  const summary = lang === "en" ? res.summary_en : res.summary_hi;
  const plain = lang === "en" ? res.plain_en : res.plain_hi;
  const hasModel = res.flags.some((x) => x.source === "model");
  const today = new Date().toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" });

  const showOnMap = (plot: string) => {
    setSel(plot);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("report-map")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    <article className="report" aria-labelledby="view-title">
      <div className="print-head" aria-hidden="true"><Logo size={30} /><div><strong>{s.title}</strong><span>{s.print_title}</span></div><span>{s.generated(today)}</span></div>

      <header className="report-head">
        <h2 id="view-title" tabIndex={-1}>{s.report_title}</h2>
        <p className="summary" role="status">{summary}</p>
        <div className="tallies">
          {SEVERITIES.map((v) => (
            <div key={v} className={`tally-box ${v}`}>
              <SeverityMark sev={v} size={22} />
              <div><span className="tally-label">{({ high: s.tally_high, medium: s.tally_medium, low: s.tally_low })[v]}</span><Tally n={counts[v]} /></div>
            </div>
          ))}
        </div>
        <p className="facts">{s.facts(f.plots, f.khatas, fmt(f.area, 2), fmt(f.acres, 1))} <span className="hint small">{s.facts_note}</span></p>
      </header>

      <section aria-labelledby="flags-title" className="block">
        <h3 id="flags-title">{s.flags_title}</h3>
        {res.flags.length === 0 ? <p className="ok-note">{s.no_flags}</p> : (
          <>
            <div className="filters no-print" role="group" aria-label={s.filter_aria}>
              <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{s.filter_all} <b>{res.flags.length}</b></button>
              {SEVERITIES.filter((v) => counts[v] > 0).map((v) => (
                <button type="button" key={v} aria-pressed={filter === v} onClick={() => setFilter(v)}><SeverityMark sev={v} size={14} /> {s.sev[v]} <b>{counts[v]}</b></button>
              ))}
            </div>
            <ul className="flaggroups">
              {groups.map((g) => (
                <li key={g.plot} className={`flaggroup ${g.top}`}>
                  <div className="fg-head">
                    <h4>{g.plot === "-" ? s.whole_record : s.plot_n(g.plot)}</h4>
                    {g.plot !== "-" && <button type="button" className="btn ghost small no-print" onClick={() => showOnMap(g.plot)}><IconMap size={16} /> {s.show_on_map}</button>}
                  </div>
                  <ul>
                    {g.flags.filter((x) => filter === "all" || x.severity === filter).map((x, i) => (
                      <li key={i} className="flag">
                        <SeverityMark sev={x.severity} />
                        <div>
                          <p><b>{s.sev[x.severity]}</b> <span className={`src ${x.source}`}>{x.source === "model" ? s.model_src : s.rule_src}</span></p>
                          <p>{lang === "en" ? x.reason_en : x.reason_hi}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            {hasModel && <p className="hint small model-note">{s.model_note}</p>}
          </>
        )}
      </section>

      <section id="report-map" aria-labelledby="map-title" className="block">
        <h3 id="map-title">{s.map_title}</h3>
        <p className="hint">{s.map_hint}</p>
        <PlotMap s={s} lang={lang} plots={rec.plots} flags={res.flags} selected={sel} onSelect={setSel} />
      </section>

      <section aria-labelledby="own-title" className="block">
        <h3 id="own-title">{s.owners_title}</h3>
        <p className="hint">{s.owners_hint}</p>
        <Ownership s={s} rec={rec} />
      </section>

      {res.checklist.length > 0 && (
        <section aria-labelledby="check-title" className="block">
          <h3 id="check-title">{s.check_title}</h3>
          <Checklist s={s} lang={lang} items={res.checklist} />
        </section>
      )}

      <section aria-labelledby="plain-title" className="block">
        <div className="fg-head">
          <h3 id="plain-title">{s.plain_title}</h3>
          {speech.supported && (
            <button type="button" className="btn small no-print" onClick={() => (speech.speaking ? speech.stop() : speech.speak(plain))}>
              {speech.speaking ? <><IconStop size={16} /> {s.stop}</> : <><IconSpeaker size={16} /> {s.listen_all}</>}
            </button>
          )}
        </div>
        {speech.supported && speech.hasVoice === false && <p className="hint small no-print">{s.no_voice}</p>}
        <ul className="plain">
          {plain.map((t, i) => (
            <li key={i}>
              <p>{t}</p>
              {speech.supported && <button type="button" className="btn ghost small icon no-print" onClick={() => speech.speak([t])} aria-label={`${s.listen}: ${i + 1}`} title={s.listen}><IconSpeaker size={16} /></button>}
            </li>
          ))}
        </ul>
      </section>

      <p className="disclaimer">{lang === "en" ? res.disclaimer_en : res.disclaimer}</p>

      <div className="actionbar no-print">
        <button type="button" className="btn" onClick={onEdit}><IconBack size={18} /> {s.edit_again}</button>
        <button type="button" className="btn" onClick={onNew}><IconRefresh size={18} /> {s.new_record}</button>
        <button type="button" className="btn primary" onClick={() => window.print()}><IconPrint size={18} /> {s.print}</button>
      </div>
    </article>
  );
}
