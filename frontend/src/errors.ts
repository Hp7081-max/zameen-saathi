import { ApiError, errorText } from "./api";
import type { Lang } from "./api";
import type { Strings } from "./i18n";

/** किसी भी त्रुटि से उपयोगकर्ता को दिखाने लायक पाठ, चुनी हुई भाषा में। */
export function describeError(e: unknown, lang: Lang, s: Strings): string {
  if (e instanceof ApiError) return errorText(e, lang, s.generic_err);
  if (e instanceof DOMException && e.name === "AbortError") return s.timeout_err;
  if (e instanceof TypeError) return s.net_err; // fetch का नेटवर्क-विफल
  return s.generic_err;
}
