import type { Flag, Lang, Plot, Severity } from "../api";
import type { Strings } from "../i18n";
import { fmt, pct, RANK, severityOf, squarify, uniqueByKhasra } from "../util";
import { SeverityMark } from "./Icons";

type Sev = Severity | "none";
type Cell = { plot: Plot; x: number; y: number; w: number; h: number; sev: Sev };

const hasBox = (p: Plot) => Array.isArray(p.bbox) && p.bbox.length === 4 && p.bbox.every(Number.isFinite) && p.bbox[2] > 0 && p.bbox[3] > 0;

/** नक्शे का नाप: असली bbox हों तो मीटर में, वरना क्षेत्रफल के अनुपात वाला योजनाबद्ध चित्र (100 x 62)। */
function layout(plots: Plot[], flags: Flag[]): { cells: Cell[]; W: number; H: number; x0: number; y0: number; schematic: boolean } {
  const uniq = uniqueByKhasra(plots);
  const sev = (p: Plot) => severityOf(flags, p.khasra);
  if (uniq.length > 0 && uniq.every(hasBox)) {
    const xs = uniq.map((p) => p.bbox![0]), ys = uniq.map((p) => p.bbox![1]);
    const x1 = Math.max(...uniq.map((p) => p.bbox![0] + p.bbox![2])), y1 = Math.max(...uniq.map((p) => p.bbox![1] + p.bbox![3]));
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    const pad = Math.max(x1 - x0, y1 - y0) * 0.04;
    return {
      cells: uniq.map((p) => ({ plot: p, x: p.bbox![0], y: p.bbox![1], w: p.bbox![2], h: p.bbox![3], sev: sev(p) })),
      W: x1 - x0 + 2 * pad, H: y1 - y0 + 2 * pad + pad * 2.2, x0: x0 - pad, y0: y0 - pad, schematic: false,
    };
  }
  const rects = squarify(uniq.map((p) => p.area_ha), 100, 62);
  return { cells: uniq.map((p, i) => ({ plot: p, ...rects[i], sev: sev(p) })), W: 100, H: 62, x0: 0, y0: 0, schematic: true };
}

const niceLen = (target: number) => [5, 10, 20, 25, 50, 100, 200, 250, 500].reduce((b, v) => (Math.abs(v - target) < Math.abs(b - target) ? v : b), 5);

type Props = { s: Strings; lang: Lang; plots: Plot[]; flags: Flag[]; selected: string | null; onSelect: (k: string | null) => void };

export default function PlotMap({ s, lang, plots, flags, selected, onSelect }: Props) {
  const { cells, W, H, x0, y0, schematic } = layout(plots, flags);
  const u = W / 100; // 1 इकाई = चौड़ाई का 1%
  const ordered = [...cells].sort((a, b) => RANK[a.sev] - RANK[b.sev]); // गंभीर ऊपर बनें, ओवरलैप में दिखें
  const scale = schematic ? 0 : niceLen(W / 5);
  const sevName = (v: Sev) => (v === "none" ? s.legend_ok : s.sev[v]);

  return (
    <div className="mapwrap">
      <svg className="shajra" viewBox={`${x0} ${y0} ${W} ${H}`} role="group" aria-label={s.map_title}
        onClick={(e) => { if (e.target === e.currentTarget) onSelect(null); }}>
        <defs>
          <pattern id="pat-high" width={3.2 * u} height={3.2 * u} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={3.2 * u} height={3.2 * u} fill="var(--red-bg)" /><rect width={1.1 * u} height={3.2 * u} fill="var(--red)" />
          </pattern>
          <pattern id="pat-medium" width={3 * u} height={3 * u} patternUnits="userSpaceOnUse">
            <rect width={3 * u} height={3 * u} fill="var(--tur-bg)" /><circle cx={1.5 * u} cy={1.5 * u} r={0.55 * u} fill="var(--tur-dark)" />
          </pattern>
        </defs>
        {ordered.map((c) => {
          const label = `${s.khasra_word} ${c.plot.khasra}: ${sevName(c.sev)}`;
          const pick = () => onSelect(selected === c.plot.khasra ? null : c.plot.khasra);
          return (
            <g key={c.plot.khasra} className={`parcel ${c.sev}${selected === c.plot.khasra ? " selected" : ""}`} role="button" tabIndex={0}
              aria-label={label} aria-pressed={selected === c.plot.khasra} onClick={pick}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }}>
              <rect x={c.x} y={c.y} width={c.w} height={c.h} />
            </g>
          );
        })}
        {/* नंबर सबसे ऊपर की परत में: एक-दूसरे पर चढ़े खसरों के नंबर भी पढ़े जाएँ */}
        <g className="labels" aria-hidden="true">
          {ordered.map((c) => (
            <text key={c.plot.khasra} x={c.x + c.w / 2} y={c.y + c.h / 2} fontSize={Math.min(Math.max(W * 0.03, Math.min(c.w, c.h) * 0.3), 22 * u)}
              textAnchor="middle" dominantBaseline="central">{c.plot.khasra}</text>
          ))}
        </g>
        {!schematic && (
          <g className="scalebar" aria-hidden="true">
            <path d={`M${x0 + W * 0.03} ${y0 + H - W * 0.035} h${scale} M${x0 + W * 0.03} ${y0 + H - W * 0.035 - W * 0.01} v${W * 0.02} M${x0 + W * 0.03 + scale} ${y0 + H - W * 0.035 - W * 0.01} v${W * 0.02}`} />
            <text x={x0 + W * 0.03 + scale + W * 0.012} y={y0 + H - W * 0.035} fontSize={W * 0.026} dominantBaseline="central">{scale} m</text>
          </g>
        )}
      </svg>
      {schematic && <p className="hint small map-note">{s.map_schematic}</p>}

      <ul className="legend" aria-label={s.map_title}>
        {(["none", "low", "medium", "high"] as Sev[]).map((v) => (
          <li key={v}><span className={`swatch ${v}`} aria-hidden="true" />{sevName(v)}{v === "medium" || v === "high" ? <span className="hint small"> ({s.sev_pattern[v]})</span> : null}</li>
        ))}
      </ul>

      <PlotDetail s={s} lang={lang} plots={plots} flags={flags} selected={selected} />
    </div>
  );
}

function PlotDetail({ s, lang, plots, flags, selected }: { s: Strings; lang: Lang; plots: Plot[]; flags: Flag[]; selected: string | null }) {
  if (!selected) return <p className="detail empty" role="status">{s.map_pick}</p>;
  const rows = plots.filter((p) => p.khasra === selected);
  const fl = flags.filter((f) => f.plot === selected);
  return (
    <div className="detail" role="status">
      <h4>{s.plot_n(selected)}</h4>
      {rows.map((p, i) => (
        <p key={i} className="detail-row">
          <span>{s.f_khata} {p.khata}</span><span>{fmt(p.area_ha)} ha</span>
          <span>{p.owners.map((o) => `${o.name} ${pct(o.share)}`).join(", ")}</span>
        </p>
      ))}
      {fl.length === 0 && <p className="hint">{s.map_none}</p>}
      <FlagLines lang={lang} flags={fl} />
    </div>
  );
}

function FlagLines({ lang, flags }: { lang: Lang; flags: Flag[] }) {
  return (
    <ul className="flaglines">
      {flags.map((f, i) => <li key={i}><SeverityMark sev={f.severity} size={16} /> <span>{lang === "en" ? f.reason_en : f.reason_hi}</span></li>)}
    </ul>
  );
}
