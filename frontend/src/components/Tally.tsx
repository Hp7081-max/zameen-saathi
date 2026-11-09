/** गिनती के निशान (||||/): बही-खाते की पुरानी आदत। 15 तक निशान, उससे ऊपर सिर्फ़ अंक। अंक हमेशा लिखा रहता है। */
export default function Tally({ n }: { n: number }) {
  const groups = n > 15 ? 0 : Math.ceil(n / 5);
  return (
    <span className="tally">
      {groups > 0 && (
        <svg width={groups * 34} height={26} viewBox={`0 0 ${groups * 34} 26`} aria-hidden="true" focusable="false">
          {Array.from({ length: groups }, (_, g) => {
            const left = n - g * 5;
            const strokes = Math.min(5, left);
            return (
              <g key={g} transform={`translate(${g * 34 + 3} 0)`} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                {Array.from({ length: Math.min(4, strokes) }, (_, k) => <path key={k} d={`M${k * 7 + 2} 3V23`} />)}
                {strokes === 5 && <path d="M0 20L28 6" />}
              </g>
            );
          })}
        </svg>
      )}
      <span className="tally-n">{n}</span>
    </span>
  );
}
