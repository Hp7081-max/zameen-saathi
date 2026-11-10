import type { Site } from "../site";
import { href } from "../router";
import { IconLock, IconNext } from "./Icons";

/** लॉगिन के बिना खुलने वाले पन्नों पर: साफ़ बताओ कि क्या करना है, और वहीं पहुँचा दो। */
export default function Gate({ t }: { t: Site }) {
  return (
    <div className="card gate">
      <span className="tile"><IconLock size={24} /></span>
      <h2>{t.gate_title}</h2>
      <p className="muted">{t.gate_text}</p>
      <a className="btn primary" href={href("start")}>{t.gate_btn} <IconNext size={18} /></a>
    </div>
  );
}
