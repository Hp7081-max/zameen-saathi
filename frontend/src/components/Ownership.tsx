import { useState } from "react";
import type { LandRecord } from "../api";
import type { Strings } from "../i18n";
import { fmt, pct, shareState, shareSum } from "../util";

/** हर खसरे की एक पट्टी: मालिकों के हिस्से रंगों में। पूरी न भरे (या बाहर निकले) तो वही गड़बड़ी है। */
export default function Ownership({ s, rec }: { s: Strings; rec: LandRecord }) {
  const [all, setAll] = useState(false);
  const LIMIT = 10;
  const plots = rec.plots.map((p, i) => ({ p, i }));
  // जिनमें गड़बड़ी है वे पहले, ताकि छोटी सूची में भी दिखें
  plots.sort((a, b) => Number(shareState(b.p) !== "ok") - Number(shareState(a.p) !== "ok") || a.i - b.i);
  const shown = all ? plots : plots.slice(0, LIMIT);
  return (
    <div className="ownership">
      <ul>
        {shown.map(({ p, i }) => {
          const sum = shareSum(p), base = Math.max(1, sum), st = shareState(p);
          return (
            <li key={i} className={st}>
              <p className="own-title">{s.plot_n(p.khasra)} <span className="hint">· {s.f_khata} {p.khata}</span>
                {st !== "ok" && <span className="share-state off">{s.share_total(fmt(sum, 3))}</span>}
              </p>
              <div className="bar" role="img" aria-label={`${s.plot_n(p.khasra)}: ${p.owners.map((o) => `${o.name} ${pct(o.share)}`).join(", ")}; ${s.share_total(fmt(sum, 3))}`}>
                {p.owners.map((o, j) => <span key={j} className={`bseg c${j % 6}`} style={{ width: `${(o.share / base) * 100}%` }} />)}
                {sum < 0.999 && <span className="bseg rest" style={{ width: `${((1 - sum) / base) * 100}%` }} title={s.owners_missing} />}
                {sum > 1.001 && <span className="over-mark" style={{ left: `${(1 / sum) * 100}%` }} title={s.owners_over} />}
              </div>
              <ul className="own-legend">
                {p.owners.map((o, j) => <li key={j}><span className={`dot c${j % 6}`} aria-hidden="true" />{o.name} {pct(o.share)}</li>)}
                {sum < 0.999 && <li><span className="dot rest" aria-hidden="true" />{s.owners_missing} {pct(1 - sum)}</li>}
                {sum > 1.001 && <li><span className="dot over" aria-hidden="true" />{s.owners_over}</li>}
              </ul>
            </li>
          );
        })}
      </ul>
      {plots.length > LIMIT && (
        <button type="button" className="btn ghost small" onClick={() => setAll(!all)}>{all ? s.show_less : s.show_all(plots.length)}</button>
      )}
    </div>
  );
}
