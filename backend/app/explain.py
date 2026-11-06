"""रिकॉर्ड को सरल हिंदी में समझाना। यहाँ कोई LLM नहीं, पक्के टेम्पलेट हैं ताकि गलत बात न बने।"""
from .schemas import Plot, Record

_WORDS = {1.0: "पूरा", 0.5: "आधा", 0.25: "चौथाई", 0.75: "तीन-चौथाई"}


def share_hi(s: float) -> str:
    for k, v in _WORDS.items():
        if abs(s - k) < 0.001:
            return v
    return f"{s * 100:.0f}%"


def plot_hi(p: Plot) -> str:
    own = ", ".join(f"{o.name} ({share_hi(o.share)})" for o in p.owners) or "मालिक का नाम नहीं पढ़ा गया"
    extra = f" नक्शे में क्षेत्रफल {p.map_area_ha} हेक्टेयर है।" if p.map_area_ha else ""
    return f"खसरा {p.khasra} (खाता {p.khata}): क्षेत्रफल {p.area_ha} हेक्टेयर।{extra} मालिक: {own}।"


def explain(rec: Record) -> list[str]:
    return [plot_hi(p) for p in rec.plots]
