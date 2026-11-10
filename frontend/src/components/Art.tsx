/** होम पन्ने के चित्र: सब इनलाइन SVG (कोई बाहरी फ़ोटो नहीं, ऑफ़लाइन चलते हैं)। रंग थीम से आते हैं। */
const base = { viewBox: "0 0 320 180", role: "img" as const, focusable: "false" as const, className: "art" };

/** पढ़ना: खतौनी की तालिका, एक पंक्ति पर आवर्धक काँच और "जोड़ 0.9" की मुहर। */
export function ArtRead({ label }: { label: string }) {
  return (
    <svg {...base} aria-label={label}>
      <rect x="26" y="20" width="268" height="140" rx="12" className="a-card" />
      <rect x="26" y="20" width="268" height="30" rx="12" className="a-head" />
      {[62, 88, 114, 140].map((y, i) => (
        <g key={y}>
          <rect x="42" y={y} width="34" height="8" rx="4" className="a-bar" />
          <rect x="92" y={y} width="30" height="8" rx="4" className="a-bar" />
          <rect x="140" y={y} width={i === 1 ? 70 : 110} height="8" rx="4" className={i === 1 ? "a-hot" : "a-bar"} />
        </g>
      ))}
      <g className="a-stamp" transform="rotate(-8 240 100)"><rect x="206" y="82" width="72" height="30" rx="7" /><text x="242" y="103" textAnchor="middle">0.9</text></g>
      <circle cx="116" cy="94" r="30" className="a-lens" /><path d="M138 116l22 22" className="a-handle" />
    </svg>
  );
}

/** शजरा: खेत के टुकड़े, एक पर धारियाँ (ऊँचा संकेत), एक पर बिंदियाँ (मध्यम)। */
export function ArtMap({ label }: { label: string }) {
  return (
    <svg {...base} aria-label={label}>
      <defs>
        <pattern id="art-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" className="a-hatch-bg" /><rect width="3" height="9" className="a-hatch" /></pattern>
        <pattern id="art-dots" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" className="a-dots-bg" /><circle cx="4.5" cy="4.5" r="1.6" className="a-dots" /></pattern>
      </defs>
      <g className="a-parcels">
        <path d="M24 24l128-10 12 70-132 12z" className="a-ok" /><path d="M164 14l130 14-8 66-122-10z" fill="url(#art-hatch)" />
        <path d="M32 108l132-14 10 60-134 10z" className="a-low" /><path d="M176 92l110-4 8 66-108 8z" fill="url(#art-dots)" />
      </g>
    </svg>
  );
}

/** तहसील की फ़ाइल: खाकी फ़ोल्डर पर टिक की पंक्तियाँ। */
export function ArtChecklist({ label }: { label: string }) {
  return (
    <svg {...base} aria-label={label}>
      <path d="M30 34h80l14 16h166v110H30z" className="a-folder" />
      <rect x="46" y="62" width="228" height="86" rx="8" className="a-paper" />
      {[78, 100, 122].map((y, i) => (
        <g key={y}>
          <rect x="62" y={y - 9} width="16" height="16" rx="4" className={i < 2 ? "a-tick-on" : "a-tick-off"} />
          {i < 2 && <path d={`M65 ${y - 1}l4 4 7-8`} className="a-tickmark" />}
          <rect x="92" y={y - 5} width={i === 2 ? 90 : 140} height="8" rx="4" className="a-bar" />
        </g>
      ))}
    </svg>
  );
}

/** निजता: ढाल पर ताला, बगल में 30 मिनट का घेरा। */
export function ArtShield({ label }: { label: string }) {
  return (
    <svg {...base} aria-label={label}>
      <path d="M110 22l56 22v44c0 34-24 58-56 72-32-14-56-38-56-72V44z" className="a-shield" />
      <rect x="92" y="78" width="36" height="30" rx="6" className="a-lock" /><path d="M99 78v-8a11 11 0 0122 0v8" className="a-lockring" />
      <circle cx="238" cy="92" r="46" className="a-clock" /><path d="M238 92V62" className="a-hand" /><path d="M238 92l22 12" className="a-hand" />
      <path d="M238 42a50 50 0 0150 50" className="a-arc" />
    </svg>
  );
}
