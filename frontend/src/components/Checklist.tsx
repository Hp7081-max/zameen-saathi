import { useMemo, useState } from "react";
import type { ChecklistItem, Lang } from "../api";
import type { Strings } from "../i18n";

type Doc = { k: string; t: string };

/** तहसील जाने की सूची। कई संकेतों में एक जैसे कागज़ (पहचान पत्र, ताज़ा नकल) बार-बार आते हैं, उन्हें एक बार ऊपर रखा है।
    टिक की कुंजी हिंदी पाठ है, इसलिए भाषा बदलने पर निशान बने रहते हैं। */
export default function Checklist({ s, lang, items }: { s: Strings; lang: Lang; items: ChecklistItem[] }) {
  const [done, setDone] = useState<Set<string>>(new Set());

  const { common, own, valid } = useMemo(() => {
    const docs = (c: ChecklistItem): Doc[] => c.docs_hi.map((k, i) => ({ k, t: (lang === "en" ? c.docs_en[i] : c.docs_hi[i]) ?? k }));
    const count = new Map<string, number>();
    items.forEach((c) => new Set(c.docs_hi).forEach((d) => count.set(d, (count.get(d) ?? 0) + 1)));
    const commonKeys = items.length > 1 ? new Set([...count].filter(([, n]) => n >= 2).map(([d]) => d)) : new Set<string>();
    const common: Doc[] = [];
    items.forEach((c) => docs(c).forEach((d) => { if (commonKeys.has(d.k) && !common.some((x) => x.k === d.k)) common.push(d); }));
    const own = items.map((c) => docs(c).filter((d) => !commonKeys.has(d.k)));
    const valid = new Set([...common.map((d) => `*${d.k}`), ...items.flatMap((c, i) => own[i].map((d) => `${c.code}|${d.k}`))]);
    return { common, own, valid };
  }, [items, lang]);

  const toggle = (k: string) => setDone((d) => { const n = new Set(d); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const Box = ({ k, text }: { k: string; text: string }) => (
    <li><label className="check"><input type="checkbox" checked={done.has(k)} onChange={() => toggle(k)} /><span>{text}</span></label></li>
  );
  const plotsText = (p: string[]) => { const real = p.filter((x) => x && x !== "-"); return real.length ? s.check_plots(real.join(", ")) : s.whole_record; };
  const total = valid.size;
  const ready = [...done].filter((k) => valid.has(k)).length;

  return (
    <div className="folder">
      <p className="hint">{s.check_intro}</p>
      <p className="progress" role="status"><span className="meter" aria-hidden="true"><i style={{ width: `${total ? (ready / total) * 100 : 0}%` }} /></span>{s.check_progress(ready, total)}</p>
      {common.length > 0 && (
        <div className="check-block">
          <h4>{s.check_common}</h4>
          <ul>{common.map((d) => <Box key={d.k} k={`*${d.k}`} text={d.t} />)}</ul>
        </div>
      )}
      {items.map((c, i) => (
        <div className="check-block" key={c.code}>
          <h4>{lang === "en" ? c.who_en : c.who_hi}</h4>
          <p className="hint small">{plotsText(c.plots)}</p>
          {own[i].length > 0 && <><p className="sub">{s.check_carry}</p><ul>{own[i].map((d) => <Box key={d.k} k={`${c.code}|${d.k}`} text={d.t} />)}</ul></>}
          <p className="sub">{s.check_ask}</p>
          <p className="ask-line">{lang === "en" ? c.ask_en : c.ask_hi}</p>
        </div>
      ))}
    </div>
  );
}
