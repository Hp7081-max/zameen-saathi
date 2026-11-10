import { useMemo, useState } from "react";
import type { Analysis, Lang, LandRecord, Severity } from "../api";
import Gate from "../components/Gate";
import { IconDownload, IconNext, IconUpload, SeverityMark } from "../components/Icons";
import Page from "../components/Page";
import { downloadText, recordToCsv } from "../export";
import type { Strings } from "../i18n";
import { href } from "../router";
import type { Site } from "../site";
import { fmt, pct, RANK, severityOf, shareState, shareSum } from "../util";

type Props = {
  s: Strings; t: Site; lang: Lang; authed: boolean; rec: LandRecord | null; res: Analysis | null;
  onReport: () => void; onReview: () => void;
};
type Sort = "khasra" | "severity" | "area";
type Filter = "all" | Severity | "none";

/** Refoodify के "Inventory" की जगह: अब तक पढ़े खसरों की सूची, खोज, छँटाई, और CSV। */
export default function Records({ s, t, lang, authed, rec, res, onReport, onReview }: Props) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("khasra");
  const [filter, setFilter] = useState<Filter>("all");

  const plots = rec?.plots ?? [];
  const sevOf = (k: string): Severity | "none" => (res ? severityOf(res.flags, k) : "none");

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: plots.length, high: 0, medium: 0, low: 0, none: 0 };
    if (res) plots.forEach((p) => { c[severityOf(res.flags, p.khasra)]++; });
    return c;
  }, [plots, res]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = plots.filter((p) => {
      if (res && filter !== "all" && severityOf(res.flags, p.khasra) !== filter) return false;
      if (!needle) return true;
      return `${p.khasra} ${p.khata} ${p.owners.map((o) => o.name).join(" ")}`.toLowerCase().includes(needle);
    });
    const byKhasra = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
    return [...list].sort((a, b) => {
      if (sort === "area") return b.area_ha - a.area_ha || byKhasra(a.khasra, b.khasra);
      if (sort === "severity" && res) return RANK[severityOf(res.flags, b.khasra)] - RANK[severityOf(res.flags, a.khasra)] || byKhasra(a.khasra, b.khasra);
      return byKhasra(a.khasra, b.khasra);
    });
  }, [plots, q, sort, filter, res]);

  if (!authed) return <Page title={t.rec_title} lead={t.rec_lead}><Gate t={t} /></Page>;
  if (!rec || plots.length === 0) {
    return (
      <Page title={t.rec_title} lead={t.rec_lead}>
        <div className="card gate">
          <span className="tile"><IconUpload size={24} /></span>
          <h2>{t.rec_empty_title}</h2>
          <p className="muted">{t.rec_empty_text}</p>
          <a className="btn primary" href={href("start")}>{t.rec_empty_btn} <IconNext size={18} /></a>
        </div>
      </Page>
    );
  }

  const exportCsv = () => {
    const L = { head: t.csv_head, none: t.csv_none, unchecked: t.csv_unchecked, sev: s.sev };
    downloadText(`zameen-saathi-khasra-${new Date().toISOString().slice(0, 10)}.csv`, recordToCsv(rec, res ? res.flags : null, lang, L));
  };
  const sevText = (v: Severity | "none") => (v === "none" ? t.rec_f_none : s.sev[v]);

  return (
    <Page title={t.rec_title} lead={t.rec_lead}>
      <div className="toolbar">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.rec_search} aria-label={t.rec_search_aria} />
        <label className="sortbox"><span className="sr">{t.rec_sort}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t.rec_sort}>
            <option value="khasra">{t.rec_sort_khasra}</option>
            {res && <option value="severity">{t.rec_sort_severity}</option>}
            <option value="area">{t.rec_sort_area}</option>
          </select>
        </label>
      </div>
      {res ? (
        <div className="filters" role="group" aria-label={t.rec_filter_aria}>
          {(["all", "high", "medium", "low", "none"] as Filter[]).filter((f) => f === "all" || counts[f] > 0).map((f) => (
            <button type="button" key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f !== "all" && f !== "none" && <SeverityMark sev={f} size={14} />} {f === "all" ? s.filter_all : sevText(f)} <b>{counts[f]}</b>
            </button>
          ))}
        </div>
      ) : <p className="muted small">{t.rec_unchecked_note}</p>}

      <p className="muted small" role="status">{t.rec_count(shown.length, plots.length)}</p>
      {shown.length === 0 ? <p className="card muted">{t.rec_none_match}</p> : (
        <ul className="reclist">
          {shown.map((p) => {
            const sv = sevOf(p.khasra), st = shareState(p), mine = res ? res.flags.filter((f) => f.plot === p.khasra) : [];
            return (
              <li key={p.khasra} className={`card rec sev-${sv}`}>
                <div className="rec-head">
                  <h2>{s.plot_n(p.khasra)}</h2>
                  {res ? <span className={`tag sev ${sv}`}>{sv !== "none" && <SeverityMark sev={sv} size={14} />} {sevText(sv)}</span> : <span className="tag">{t.rec_unchecked}</span>}
                </div>
                <dl className="rec-meta">
                  <div><dt>{t.rec_khata}</dt><dd>{p.khata}</dd></div>
                  <div><dt>{t.rec_area}</dt><dd>{fmt(p.area_ha, 3)} {t.rec_ha}</dd></div>
                  <div><dt>{s.f_share}</dt><dd><span className={`share-state ${st}`}>{st === "ok" ? s.share_ok : st === "off" ? s.share_total(fmt(shareSum(p), 3)) : s.share_none}</span></dd></div>
                </dl>
                <p className="rec-owners"><b>{t.rec_owners}:</b> {p.owners.map((o) => `${o.name} ${pct(o.share)}`).join(", ") || "—"}</p>
                {mine.length > 0 && <ul className="flaglines">{mine.map((f, i) => <li key={i}><SeverityMark sev={f.severity} /> <span>{lang === "en" ? f.reason_en : f.reason_hi}</span></li>)}</ul>}
              </li>
            );
          })}
        </ul>
      )}

      <div className="actionbar">
        <button type="button" className="btn" onClick={onReview}>{t.rec_review}</button>
        {res && <button type="button" className="btn" onClick={onReport}>{t.rec_report}</button>}
        <button type="button" className="btn primary" onClick={exportCsv}><IconDownload size={18} /> {t.rec_csv}</button>
      </div>
    </Page>
  );
}
