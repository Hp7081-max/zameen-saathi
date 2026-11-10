import type { ReactNode } from "react";
import type { Severity } from "../api";

type P = { size?: number; className?: string };
const Svg = ({ size = 20, className, children }: P & { children: ReactNode }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
);

export const IconUpload = (p: P) => <Svg {...p}><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></Svg>;
export const IconCamera = (p: P) => <Svg {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Svg>;
export const IconFile = (p: P) => <Svg {...p}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></Svg>;
export const IconPdf = (p: P) => <Svg {...p}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 15h1.5a1.2 1.2 0 000-2.4H9V17" /></Svg>;
export const IconCheck = (p: P) => <Svg {...p}><path d="M4 12.5l5 5L20 6.5" /></Svg>;
export const IconX = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const IconPlus = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconTrash = (p: P) => <Svg {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>;
export const IconSpeaker = (p: P) => <Svg {...p}><path d="M4 9.5v5h4l5 4v-13l-5 4zM16.5 9a4 4 0 010 6M19 6.5a8 8 0 010 11" /></Svg>;
export const IconStop = (p: P) => <Svg {...p}><rect x="6" y="6" width="12" height="12" rx="1.5" /></Svg>;
export const IconMic = (p: P) => <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" /></Svg>;
export const IconPrint = (p: P) => <Svg {...p}><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" /></Svg>;
export const IconBack = (p: P) => <Svg {...p}><path d="M11 6l-6 6 6 6M5 12h14" /></Svg>;
export const IconNext = (p: P) => <Svg {...p}><path d="M13 6l6 6-6 6M19 12H5" /></Svg>;
export const IconRefresh = (p: P) => <Svg {...p}><path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6" /></Svg>;
export const IconMap = (p: P) => <Svg {...p}><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" /></Svg>;
export const IconLock = (p: P) => <Svg {...p}><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 018 0v3" /></Svg>;
export const IconClock = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>;
export const IconPhone = (p: P) => <Svg {...p}><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></Svg>;
export const IconWifiOff = (p: P) => <Svg {...p}><path d="M3 3l18 18M5 10a10 10 0 015-2.5M19 10a10 10 0 00-4.5-2.4M8.5 13.5a5.5 5.5 0 016.2-.6M12 18h.01" /></Svg>;
export const IconAsk = (p: P) => <Svg {...p}><path d="M5 5h14v10H11l-4 4v-4H5z" /><path d="M10 9.5a2 2 0 114 0c0 1.2-2 1.5-2 2.8M12 13.7h.01" /></Svg>;

export const IconMenu = (p: P) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>;
export const IconSun = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></Svg>;
export const IconMoon = (p: P) => <Svg {...p}><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" /></Svg>;
export const IconHome = (p: P) => <Svg {...p}><path d="M4 11l8-7 8 7M6 10v10h12V10M10 20v-6h4v6" /></Svg>;
export const IconUser = (p: P) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></Svg>;
export const IconList = (p: P) => <Svg {...p}><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></Svg>;
export const IconPin = (p: P) => <Svg {...p}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></Svg>;
export const IconInfo = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></Svg>;
export const IconMail = (p: P) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></Svg>;
export const IconShield = (p: P) => <Svg {...p}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></Svg>;
export const IconDoc = (p: P) => <Svg {...p}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h4" /></Svg>;
export const IconDownload = (p: P) => <Svg {...p}><path d="M12 4v12M7 11l5 5 5-5M4 20h16" /></Svg>;
export const IconExternal = (p: P) => <Svg {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></Svg>;
export const IconChevron = (p: P) => <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>;
export const IconTrend = (p: P) => <Svg {...p}><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></Svg>;
export const IconLeaf = (p: P) => <Svg {...p}><path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15M5 19c2-5 5-8 9-10" /></Svg>;
export const IconPhoneCall = (p: P) => <Svg {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></Svg>;

/** गंभीरता का आकार: रंग के बिना भी पहचाना जाए (त्रिकोण / हीरा / गोला)। */
export function SeverityMark({ sev, size = 18 }: { sev: Severity; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 20 20", "aria-hidden": true, focusable: "false" as const, className: `sevmark ${sev}` };
  if (sev === "high") return <svg {...common}><path d="M10 2.5L18.2 17H1.8z" strokeLinejoin="round" /><path d="M10 7.5v5M10 14.6v.1" stroke="var(--on-red)" strokeWidth="1.9" strokeLinecap="round" /></svg>;
  if (sev === "medium") return <svg {...common}><path d="M10 2l8 8-8 8-8-8z" strokeLinejoin="round" /><path d="M10 6.8v4M10 13.2v.1" stroke="var(--on-amber)" strokeWidth="1.9" strokeLinecap="round" /></svg>;
  return <svg {...common}><circle cx="10" cy="10" r="8" /><path d="M10 9v5M10 6v.1" stroke="var(--card)" strokeWidth="1.9" strokeLinecap="round" /></svg>;
}

/** लोगो: रंगीन चौकोर के भीतर चार खेत-टुकड़े, एक पर तिरछी रेखाएँ (जाँचने लायक खेत)। रंग थीम से आते हैं। */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="logo">
      <defs>
        <pattern id="logo-h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--logo-hatch-bg)" /><rect width="2.2" height="6" fill="var(--logo-hatch)" />
        </pattern>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="12" fill="var(--logo-bg)" stroke="var(--logo-line)" strokeWidth="1.5" />
      <g stroke="var(--logo-gap)" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M9 12l16-2 2 14-17 2z" fill="var(--logo-a)" /><path d="M29 10l10 3-2 11-9-1z" fill="url(#logo-h)" />
        <path d="M10 29l17-2 2 12-16-1z" fill="var(--logo-b)" /><path d="M31 27l7 1-1 11-7 1z" fill="var(--logo-c)" />
      </g>
    </svg>
  );
}
