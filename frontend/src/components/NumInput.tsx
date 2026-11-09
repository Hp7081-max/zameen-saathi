import { useEffect, useState } from "react";

type Props = {
  value: number; onChange: (n: number) => void; parse: (raw: string) => number; show?: (n: number) => string;
  ariaLabel: string; invalid?: boolean; className?: string; placeholder?: string; id?: string;
};

/** संख्या का खाना जो अधूरा लिखा हुआ ("0.", "1/") भी सह ले: पाठ अपना, मान तभी बदले जब समझ आए। */
export default function NumInput({ value, onChange, parse, show = String, ariaLabel, invalid, className, placeholder, id }: Props) {
  const [text, setText] = useState(() => show(value));
  // बाहर से मान बदले (जैसे पंक्ति हटी) और हमारा पाठ उससे अलग मान दे रहा हो, तभी पाठ बदलो
  useEffect(() => {
    const parsed = parse(text);
    if (!(Object.is(parsed, value) || (Number.isNaN(parsed) && Number.isNaN(value)))) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const bad = invalid || Number.isNaN(parse(text));
  return (
    <input id={id} className={`num ${className ?? ""}`} inputMode="decimal" autoComplete="off" value={text} placeholder={placeholder}
      aria-label={ariaLabel} aria-invalid={bad || undefined}
      onChange={(e) => { const t = e.target.value; setText(t); const n = parse(t); onChange(Number.isNaN(n) ? NaN : n); }}
      onBlur={() => { const n = parse(text); if (!Number.isNaN(n)) setText(show(n)); }} />
  );
}
