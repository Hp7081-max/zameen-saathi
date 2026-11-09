import type { Lang, LandRecord, Plot } from "../api";
import type { Strings } from "../i18n";
import { blankOwner, blankPlot, fmt, parseNumber, parseShare, pct, shareState, shareSum } from "../util";
import type { Problem } from "../util";
import NumInput from "./NumInput";
import { IconCheck, IconNext, IconPlus, IconTrash, IconUpload, IconX } from "./Icons";

type Props = {
  s: Strings; lang: Lang; rec: LandRecord; setRec: (f: (r: LandRecord) => LandRecord) => void; problems: Problem[];
  busy: boolean; online: boolean; error: string; onCheck: () => void; onAddFiles: () => void; onClear: () => void;
};

const show4 = (n: number) => (Number.isFinite(n) ? fmt(n, 4) : "");

export default function Review({ s, rec, setRec, problems, busy, online, error, onCheck, onAddFiles, onClear }: Props) {
  const byRow = new Map<number, Problem[]>();
  problems.forEach((p) => byRow.set(p.row, [...(byRow.get(p.row) ?? []), p]));

  const upPlot = (i: number, patch: Partial<Plot>) =>
    setRec((r) => ({ ...r, plots: r.plots.map((p, k) => (k === i ? { ...p, ...patch } : p)) }));
  const upOwner = (i: number, j: number, patch: Partial<{ name: string; share: number }>) =>
    setRec((r) => ({ ...r, plots: r.plots.map((p, k) => (k !== i ? p : { ...p, owners: p.owners.map((o, m) => (m === j ? { ...o, ...patch } : o)) })) }));
  const addOwner = (i: number) => setRec((r) => ({ ...r, plots: r.plots.map((p, k) => (k === i ? { ...p, owners: [...p.owners, { ...blankOwner(), share: 0 }] } : p)) }));
  const delOwner = (i: number, j: number) => setRec((r) => ({ ...r, plots: r.plots.map((p, k) => (k === i ? { ...p, owners: p.owners.filter((_, m) => m !== j) } : p)) }));
  const delPlot = (i: number) => setRec((r) => ({ ...r, plots: r.plots.filter((_, k) => k !== i) }));
  const addPlot = () => setRec((r) => ({ ...r, plots: [...r.plots, blankPlot()] }));

  return (
    <section aria-labelledby="view-title">
      <h2 id="view-title" tabIndex={-1}>{s.review_title}</h2>
      <p className="hint">{s.review_hint}</p>

      <ol className="plots">
        {rec.plots.map((p, i) => {
          const st = shareState(p);
          const probs = byRow.get(i) ?? [];
          const label = p.khasra || String(i + 1);
          return (
            <li key={i} className={`plot-row${probs.length ? " has-problem" : ""}`}>
              <div className="plot-head">
                <label>
                  <span className="lbl">{s.f_khasra}</span>
                  <input className="num" value={p.khasra} aria-label={s.f_khasra_aria(i + 1)} aria-invalid={!p.khasra.trim() || undefined}
                    autoComplete="off" onChange={(e) => upPlot(i, { khasra: e.target.value })} />
                </label>
                <label>
                  <span className="lbl">{s.f_khata}</span>
                  <input className="num" value={p.khata} aria-label={s.f_khata_aria(label)} aria-invalid={!p.khata.trim() || undefined}
                    autoComplete="off" onChange={(e) => upPlot(i, { khata: e.target.value })} />
                </label>
                <label>
                  <span className="lbl">{s.f_area}</span>
                  <NumInput value={p.area_ha} parse={parseNumber} show={show4} ariaLabel={s.f_area_aria(label)} invalid={!(p.area_ha > 0)}
                    onChange={(n) => upPlot(i, { area_ha: n })} />
                </label>
                <button type="button" className="btn ghost small icon" onClick={() => delPlot(i)} aria-label={`${s.remove_plot}: ${label}`} title={s.remove_plot}><IconTrash size={18} /></button>
              </div>

              <div className="owners-edit">
                <div className="owners-head">
                  <span className="lbl">{s.f_owners}</span>
                  <span className={`share-state ${st}`} role="status">
                    {st === "ok" ? <IconCheck size={14} /> : <IconX size={14} />}
                    {st === "none" ? s.share_none : `${s.share_total(fmt(shareSum(p), 3))} · ${st === "ok" ? s.share_ok : s.share_off}`}
                  </span>
                </div>
                {p.owners.map((o, j) => (
                  <div className="owner-row" key={j}>
                    <input className="name" value={o.name} placeholder={s.f_name} aria-label={s.f_name_aria(label, j + 1)} aria-invalid={!o.name.trim() || undefined}
                      autoComplete="off" onChange={(e) => upOwner(i, j, { name: e.target.value })} />
                    <NumInput className="share" value={o.share} parse={parseShare} show={show4} placeholder={s.f_share}
                      ariaLabel={s.f_share_aria(label, o.name || String(j + 1))} onChange={(n) => upOwner(i, j, { share: n })} />
                    <span className="pct" aria-hidden="true">{Number.isFinite(o.share) ? pct(o.share) : ""}</span>
                    <button type="button" className="btn ghost small icon" disabled={p.owners.length <= 1} onClick={() => delOwner(i, j)} aria-label={s.remove_owner} title={s.remove_owner}><IconX size={16} /></button>
                  </div>
                ))}
                <button type="button" className="btn ghost small" onClick={() => addOwner(i)}><IconPlus size={16} /> {s.add_owner}</button>
              </div>

              {probs.length > 0 && (
                <ul className="row-problems">
                  {[...new Set(probs.map((x) => x.key))].map((k) => <li key={k}>{s[k]}</li>)}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      <div className="row wrap">
        <button type="button" className="btn" onClick={addPlot}><IconPlus size={18} /> {s.add_plot}</button>
        <button type="button" className="btn" onClick={onAddFiles}><IconUpload size={18} /> {s.add_more}</button>
        <button type="button" className="btn ghost danger" onClick={() => { if (window.confirm(s.confirm_clear)) onClear(); }}>{s.clear_all}</button>
      </div>

      <div className="actionbar sticky no-print">
        <span className={`problems${problems.length ? " bad" : ""}`} role="status">{problems.length > 0 && s.problems(problems.length)}</span>
        <button type="button" className="btn primary big" disabled={busy || !online || problems.length > 0} onClick={onCheck}>
          {busy ? s.checking : s.check} {!busy && <IconNext size={20} />}
        </button>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
    </section>
  );
}
