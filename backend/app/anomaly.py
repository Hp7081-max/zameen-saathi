"""ML हिस्सा: संदर्भ-आधारित पैटर्न (जो नियम नहीं पकड़ते) पर supervised classifier।
`python -m app.train` से बना models/anomaly.joblib मिले तो वही; वरना synthetic पर यहीं (कुछ सेकंड में) train हो जाता है।

ध्यान: मॉडल पूरे रिकॉर्ड को "गाँव" मानकर तुलना करता है (एक नाम कितने खातों में, क्षेत्रफल बाकी से कितना अलग)।
उपयोगकर्ता सिर्फ़ अपना एक खाता डाले तो संदर्भ वाले फ़ीचर कमज़ोर रहते हैं। यह जानी हुई सीमा है (PENDING.md)।"""
from functools import lru_cache
from pathlib import Path

import numpy as np

from .features import NAMES
from .features import plot_features
from .schemas import Flag, Record

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "anomaly.joblib"
VERSION = 2
_I = {n: i for i, n in enumerate(NAMES)}


@lru_cache
def _bundle() -> dict:
    if MODEL_PATH.exists():
        import joblib
        b = joblib.load(MODEL_PATH)
        # पुराने ढाँचे की फ़ाइल (सीधा IsolationForest) या अलग फ़ीचर-सूची हो तो नज़रअंदाज़ करके नया बना लेते हैं
        if isinstance(b, dict) and b.get("version") == VERSION and b.get("names") == NAMES:
            return b
    from .train import fit_bundle
    return fit_bundle()


def _reason(p: dict, x: np.ndarray, b: dict) -> tuple[str, str]:
    """जो फ़ीचर इस प्लॉट पर साफ़-साफ़ से ज़्यादा अलग है, उसी के हिसाब से कारण (पक्के टेम्पलेट, कोई LLM नहीं)।"""
    z = np.abs((x - b["mu"]) / b["sd"])
    top = NAMES[int(np.argmax(z))]
    if top == "owner_khata_spread":
        n = int(x[_I[top]])
        return (f"इस प्लॉट के एक मालिक का नाम इस रिकॉर्ड के {n} अलग-अलग खातों में आता है। कृपया दोबारा जाँचें।",
                f"One owner name appears under {n} different khatas in this record.")
    if top in ("n_owners", "owners_per_ha", "min_share"):
        n = int(x[_I["n_owners"]])
        return (f"{p['area_ha']} हे. के इस छोटे प्लॉट के {n} हिस्सेदार हैं, यानी यह बहुत टुकड़ों में बँटा है। कृपया दोबारा जाँचें।",
                f"A small plot ({p['area_ha']} ha) is split among {n} owners.")
    if top in ("area_ha", "area_vs_median"):
        return (f"इस प्लॉट का क्षेत्रफल ({p['area_ha']} हे.) इस रिकॉर्ड के बाकी प्लॉटों से काफ़ी अलग है। कृपया दोबारा जाँचें।",
                "Plot area is very different from the other plots in this record.")
    if top == "transfers":
        t = int(x[_I[top]])
        return (f"2 साल में {t} बार मालिकाना बदला, जो आम पैटर्न से ज़्यादा है। कृपया दोबारा जाँचें।",
                f"Ownership changed {t} times recently, more than typical.")
    if top == "khata_plots":
        k = int(x[_I[top]])
        return (f"इस खाते में {k} प्लॉट हैं, जो इस रिकॉर्ड के बाकी खातों से ज़्यादा है। कृपया दोबारा जाँचें।",
                f"This khata holds {k} plots, more than the others in this record.")
    return ("यह प्लॉट इस रिकॉर्ड के आम पैटर्न से अलग दिखता है। कृपया दोबारा जाँचें।",
            "Plot pattern differs from the rest of this record (model).")


def run_anomaly(rec: Record) -> list[Flag]:
    if not rec.plots:
        return []
    try:
        b = _bundle()
    except ImportError:  # scikit-learn / joblib नहीं हैं
        return []
    plots = [p.model_dump() for p in rec.plots]
    X = plot_features(plots)
    proba = b["clf"].predict_proba(X)[:, 1]
    flags = []
    for p, x, pr in zip(plots, X, proba):
        if pr >= b["threshold"]:
            hi, en = _reason(p, x, b)
            flags.append(Flag(code="ANOMALY", severity="medium", plot=p["khasra"],
                              reason_hi=hi, reason_en=en, source="model"))
    return flags
