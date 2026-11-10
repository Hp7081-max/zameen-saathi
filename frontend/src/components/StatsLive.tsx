import { useEffect, useState } from "react";
import { fetchStats } from "../api";
import type { Lang, Stats } from "../api";
import type { Site } from "../site";
import { digits } from "../util";
import { IconDoc, IconMap, IconShield } from "./Icons";

/** "अब तक का काम": सर्वर की अनाम गिनतियाँ (हर 30 सेकंड में, पन्ना दिखता हो तभी)। न मिलें तो "—" और साफ़ वजह; झूठे अंक कभी नहीं। */
export default function StatsLive({ t, lang }: { t: Site; lang: Lang }) {
  const [st, setSt] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    const load = () => {
      if (document.hidden) return;
      fetchStats().then((r) => { if (live) { setSt(r); setFailed(false); } }).catch(() => { if (live) setFailed(true); });
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { live = false; clearInterval(id); };
  }, []);

  const num = (n: number | undefined) => (n === undefined ? "—" : digits(n.toLocaleString("en-IN"), lang));
  const cards = [
    { k: "analyses", tone: "green", Icon: IconDoc, n: st?.analyses },
    { k: "plots_read", tone: "blue", Icon: IconMap, n: st?.plots_read },
    { k: "flags_found", tone: "purple", Icon: IconShield, n: st?.flags_found },
  ] as const;
  const since = st ? new Date(st.since).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

  return (
    <div>
      <ul className="stats" aria-busy={st === null && !failed}>
        {cards.map(({ k, tone, Icon, n }) => (
          <li key={k} className={`stat ${tone}`}>
            <span className="tile"><Icon size={24} /></span>
            <strong className="stat-n">{num(n)}</strong>
            <span className="stat-l">{t.st_labels[k]}</span>
          </li>
        ))}
      </ul>
      <p className="muted small stats-note" role="status">{failed ? t.st_fail : st ? t.st_note(since) : ""}</p>
    </div>
  );
}
