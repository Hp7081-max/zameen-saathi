"""Pakki galtiyan pakadne wale rule-based checks. Verdict nahi, sirf flag + kaaran."""
from collections import defaultdict
from difflib import SequenceMatcher

from .schemas import Flag, Record


def _f(code, sev, plot, hi, en):
    return Flag(code=code, severity=sev, plot=plot, reason_hi=hi, reason_en=en, source="rule")


def _norm(name: str) -> str:
    return " ".join(name.lower().replace(".", "").split())


def _similar(a: str, b: str) -> bool:
    a, b = _norm(a), _norm(b)
    if a == b:
        return False
    ta, tb = set(a.split()), set(b.split())
    return ta < tb or tb < ta or SequenceMatcher(None, a, b).ratio() >= 0.9


def run_rules(rec: Record) -> list[Flag]:
    flags: list[Flag] = []
    khatas = defaultdict(set)
    for p in rec.plots:
        khatas[p.khasra].add(p.khata)
        if p.owners:
            total = sum(o.share for o in p.owners)
            if abs(total - 1) > 0.001:
                flags.append(_f("SHARE_SUM", "high", p.khasra,
                                f"हिस्सेदारों का कुल हिस्सा {total:.2f} है, 1 होना चाहिए।",
                                f"Owner shares add up to {total:.2f}, expected 1."))
        if p.map_area_ha and abs(p.area_ha - p.map_area_ha) / p.map_area_ha > 0.05:
            flags.append(_f("AREA_MISMATCH", "high", p.khasra,
                            f"खतौनी में {p.area_ha} हे. है, नक्शे में {p.map_area_ha} हे.।",
                            "Record area and map area differ by more than 5%."))
        if p.transfers_last_2y >= 3:
            flags.append(_f("MANY_TRANSFERS", "medium", p.khasra,
                            f"2 साल में {p.transfers_last_2y} बार मालिकाना बदला।",
                            "Ownership changed several times in a short period."))
    for khasra, ks in khatas.items():
        if len(ks) > 1:
            flags.append(_f("DUP_KHASRA", "high", khasra,
                            "यह खसरा एक से ज़्यादा खातों में दर्ज है।",
                            "Same plot appears under more than one khata."))
    names = sorted({o.name for p in rec.plots for o in p.owners})
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            if _similar(a, b):
                flags.append(_f("SIMILAR_NAMES", "low", "-",
                                f"मिलते-जुलते नाम: {a} / {b}। हो सकता है एक ही व्यक्ति हो।",
                                f"Near-identical names: {a} / {b}."))
    return flags
