"""ML हिस्सा: वे 'हल्के संकेत' जिन्हें rules की पक्की सीमा नहीं पकड़ती (जैसे सीमा से नीचे का क्षेत्रफल-फ़र्क,
एक ही नाम का कई खातों में आना)। supervised RandomForest, गाँव-स्तर के फ़ीचर्स के साथ।
`python -m app.train` से बना मॉडल मिले तो वही; न मिले तो ML बंद रहता है (rules फिर भी चलते हैं)।"""
import warnings
from collections import defaultdict
from functools import lru_cache
from pathlib import Path

import numpy as np

from .rules import _inter, _similar
from .schemas import Flag, Record

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "anomaly.joblib"
FEATURES = ["area_ha", "area_rel_diff", "area_z", "n_owners", "min_share", "share_dev", "transfers",
            "name_khata_max", "name_plot_max", "similar_names", "max_overlap", "dup_khasra", "village_plots"]


def plot_features(rec: Record) -> np.ndarray:
    """हर प्लॉट के लिए एक पंक्ति। कुछ फ़ीचर्स पूरे गाँव को देखकर बनते हैं (जैसे एक नाम कितने खातों में)।"""
    plots = rec.plots
    if not plots:
        return np.zeros((0, len(FEATURES)))
    areas = np.array([p.area_ha for p in plots], dtype=float)
    mu, sd = areas.mean(), areas.std()
    name_khatas, name_plots, khasra_n, similar = defaultdict(set), defaultdict(int), defaultdict(int), defaultdict(int)
    for p in plots:
        khasra_n[p.khasra] += 1
        for o in p.owners:
            name_khatas[o.name].add(p.khata)
            name_plots[o.name] += 1
    names = list(name_khatas)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            if _similar(a, b):
                similar[a] += 1
                similar[b] += 1
    rows = []
    for p, a in zip(plots, areas):
        total = sum(o.share for o in p.owners)
        ov = 0.0
        if p.bbox:
            for q in plots:
                if q is not p and q.bbox and q.khasra != p.khasra:
                    ov = max(ov, _inter(p.bbox, q.bbox) / max(min(p.bbox[2] * p.bbox[3], q.bbox[2] * q.bbox[3]), 1e-9))
        rows.append([
            a,
            abs(a / p.map_area_ha - 1) if p.map_area_ha else 0.0,
            (a - mu) / sd if sd else 0.0,
            len(p.owners),
            min((o.share for o in p.owners), default=0.0),
            abs(total - 1) if p.owners else 0.0,
            p.transfers_last_2y,
            max((len(name_khatas[o.name]) for o in p.owners), default=0),
            max((name_plots[o.name] for o in p.owners), default=0),
            max((similar[o.name] for o in p.owners), default=0),
            ov,
            khasra_n[p.khasra],
            len(plots),
        ])
    return np.array(rows, dtype=float)


def _reason(f: dict, proba: float) -> tuple[str, str]:
    """कारण फ़ीचर्स के मान से बनता है, ताकि वही लिखें जो सच में रिकॉर्ड में दिख रहा है।"""
    pct = f"{proba:.0%}"
    if f["name_khata_max"] >= 3:
        k = int(f["name_khata_max"])
        return (f"इस प्लॉट के एक मालिक का नाम गाँव के {k} अलग खातों में आता है। यह जाँचने लायक है (अनुमान {pct})।",
                f"An owner name of this plot appears under {k} different khatas (model estimate {pct}).")
    if f["area_rel_diff"] >= 0.02:
        d = f["area_rel_diff"] * 100
        return (f"खतौनी और नक्शे के क्षेत्रफल में {d:.1f}% का फ़र्क है। यह 5% की सीमा से कम है, पर आम से ज़्यादा है (अनुमान {pct})।",
                f"Record and map area differ by {d:.1f}%: under the 5% rule but unusual (model estimate {pct}).")
    return (f"कई छोटे संकेत मिलकर यह प्लॉट आम पैटर्न से अलग दिखा रहे हैं (अनुमान {pct})।",
            f"Several weak signals together make this plot look unusual (model estimate {pct}).")


@lru_cache
def _bundle():
    if not MODEL_PATH.exists():
        return None
    try:
        import joblib
        return joblib.load(MODEL_PATH)
    except Exception as e:  # sklearn का version बदला हो, फ़ाइल टूटी हो वगैरह
        warnings.warn(f"ML मॉडल लोड नहीं हुआ, सिर्फ़ rules चलेंगे: {e}")
        return None


def run_anomaly(rec: Record, skip=()) -> list[Flag]:
    """skip: वे खसरा जिन्हें rules पहले पकड़ चुके हैं (उन पर ML दोबारा नहीं बोलता)।"""
    b = _bundle()
    if b is None or not rec.plots:
        return []
    X = plot_features(rec)
    proba = b["clf"].predict_proba(X)[:, 1]
    out = []
    for p, x, pr in zip(rec.plots, X, proba):
        if p.khasra in skip or pr < b["threshold"]:
            continue
        hi, en = _reason(dict(zip(FEATURES, x)), float(pr))
        out.append(Flag(code="SOFT_SIGNAL", severity="low", plot=p.khasra, reason_hi=hi, reason_en=en, source="model"))
    return out
