import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "zs-theme";
const COLOR: Record<Theme, string> = { dark: "#0a0f1e", light: "#f4f7fb" };

/** गहरा/हल्का रंग-रूप। चुनाव याद रखता है (सिर्फ़ यही और भाषा; खतौनी का कुछ नहीं)। पहली बार: गहरा, जैसा Refoodify में है।
    `index.html` की छोटी स्क्रिप्ट पन्ना बनने से पहले यही रंग लगा देती है, ताकि हल्के रंग पर चमक न दिखे। */
export function useTheme(): [Theme, () => void, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try { const v = localStorage.getItem(KEY); if (v === "dark" || v === "light") return v; } catch { /* private window */ }
    return "dark";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COLOR[theme]);
  }, [theme]);
  const set = useCallback((t: Theme) => {
    setTheme(t);
    try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  }, []);
  const toggle = useCallback(() => set(theme === "dark" ? "light" : "dark"), [set, theme]);
  return [theme, toggle, set];
}
