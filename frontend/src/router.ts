import { useCallback, useEffect, useState } from "react";

/** हल्का hash-router (`#/records`)। सर्वर में कुछ बदलना नहीं पड़ता, nginx/Render पर सीधा चलता है, और ऑफ़लाइन भी। */
export const ROUTES = ["home", "start", "records", "profile", "find", "about", "contact", "faq", "terms"] as const;
export type Route = (typeof ROUTES)[number];

export function parseHash(hash: string): { route: Route; query: URLSearchParams } {
  const [path, qs = ""] = hash.replace(/^#\/?/, "").split("?");
  const name = path || "home";
  return { route: (ROUTES as readonly string[]).includes(name) ? (name as Route) : "home", query: new URLSearchParams(qs) };
}

export function href(route: Route, query?: Record<string, string>): string {
  const q = query ? `?${new URLSearchParams(query).toString()}` : "";
  return `#/${route === "home" ? "" : route}${q}`;
}

export function useRoute() {
  const [loc, setLoc] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setLoc(parseHash(window.location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = useCallback((route: Route, query?: Record<string, string>) => {
    const h = href(route, query);
    if (window.location.hash === h) setLoc(parseHash(h)); else window.location.hash = h;
  }, []);
  return { route: loc.route, query: loc.query, go };
}
