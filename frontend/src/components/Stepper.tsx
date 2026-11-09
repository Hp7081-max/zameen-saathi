import type { Lang } from "../api";
import type { Strings } from "../i18n";
import { digits } from "../util";
import { IconCheck } from "./Icons";

export type StepKey = "login" | "upload" | "review" | "report";
const ORDER: StepKey[] = ["login", "upload", "review", "report"];

type Props = { s: Strings; lang: Lang; current: StepKey; reachable: Record<StepKey, boolean>; onGo: (k: StepKey) => void };

/** चारों चरण हमेशा दिखते हैं (क्रम सचमुच का है: लॉगिन → फ़ाइल → सुधार → रिपोर्ट)। पूरे हो चुके चरण पर लौट सकते हैं। */
export default function Stepper({ s, lang, current, reachable, onGo }: Props) {
  const label: Record<StepKey, string> = { login: s.step_login, upload: s.step_upload, review: s.step_review, report: s.step_report };
  const at = ORDER.indexOf(current);
  return (
    <nav className="stepper no-print" aria-label={s.steps_label}>
      <ol>
        {ORDER.map((k, i) => {
          const state = i < at ? "done" : i === at ? "current" : "todo";
          const clickable = reachable[k] && k !== current && k !== "login";
          const inner = (
            <>
              <span className="step-no" aria-hidden="true">{state === "done" ? <IconCheck size={14} /> : digits(i + 1, lang)}</span>
              <span className="step-label">{label[k]}</span>
            </>
          );
          return (
            <li key={k} className={`step ${state}`} aria-current={state === "current" ? "step" : undefined}>
              {clickable ? <button type="button" onClick={() => onGo(k)}>{inner}</button> : <span>{inner}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
