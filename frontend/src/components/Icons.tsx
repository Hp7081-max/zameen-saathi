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

/** गंभीरता का आकार: रंग के बिना भी पहचाना जाए (त्रिकोण / हीरा / गोला)। */
export function SeverityMark({ sev, size = 18 }: { sev: Severity; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 20 20", "aria-hidden": true, focusable: "false" as const, className: `sevmark ${sev}` };
  if (sev === "high") return <svg {...common}><path d="M10 2.5L18.2 17H1.8z" strokeLinejoin="round" /><path d="M10 7.5v5M10 14.6v.1" stroke="var(--paper)" strokeWidth="1.9" strokeLinecap="round" /></svg>;
  if (sev === "medium") return <svg {...common}><path d="M10 2l8 8-8 8-8-8z" strokeLinejoin="round" /><path d="M10 6.8v4M10 13.2v.1" stroke="var(--ink)" strokeWidth="1.9" strokeLinecap="round" /></svg>;
  return <svg {...common}><circle cx="10" cy="10" r="8" /><path d="M10 9v5M10 6v.1" stroke="var(--paper)" strokeWidth="1.9" strokeLinecap="round" /></svg>;
}

/** लोगो: चार खेत-टुकड़े, एक पर तिरछी रेखाएँ (जाँचने लायक खेत)। */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="logo-h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#f2c6c0" /><rect width="2.2" height="6" fill="#a3281f" />
        </pattern>
      </defs>
      <rect width="48" height="48" rx="10" fill="#1b2a57" />
      <g stroke="#fffefb" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M8 11l17-2 2 15-18 2z" fill="#dcebd6" /><path d="M29 9l11 3-2 12-9-1z" fill="url(#logo-h)" />
        <path d="M9 28l18-2 2 14-17-1z" fill="#d5deee" /><path d="M31 26l8 1-1 12-8 1z" fill="#f7e2a8" />
      </g>
    </svg>
  );
}
