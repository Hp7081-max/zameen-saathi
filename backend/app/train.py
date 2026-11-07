"""ML मॉडल train + मापन।   python -m app.train [--villages 400] [--seed 1]

क्या सिखाते हैं: "संदर्भ-आधारित" गड़बड़ियाँ (synth.SOFT_KINDS): जैसे एक ही नाम का कई खातों में आना, या छोटे प्लॉट का
बहुत टुकड़ों में बँटना। इन्हें rules.py नहीं पकड़ता। पुराने IsolationForest (सिर्फ़ 5 फ़ीचर) से तुलना भी छापते हैं।

ज़रूरी चेतावनी: सारा डेटा synthetic है और गड़बड़ियाँ हमारे ही जनरेटर ने डाली हैं। ये आँकड़े बताते हैं कि पाइपलाइन
सही चल रही है, यह नहीं कि असली खतौनियों पर मॉडल कितना भरोसेमंद होगा। असली डेटा पर दोबारा मापना ज़रूरी है।
गाँवों को train/val/test में गाँव के हिसाब से बाँटते हैं (एक ही गाँव के प्लॉट दोनों तरफ़ नहीं जाते)।"""
import argparse
import json
import random

import numpy as np

from .anomaly import MODEL_PATH, VERSION
from .features import BASE_N, NAMES, plot_features
from .synth import make_village

HARD_NUMERIC = {"AREA_MISMATCH", "MANY_TRANSFERS", "SHARE_SUM"}  # पुराने मॉडल का लक्ष्य (नियम इन्हें पहले से पकड़ते हैं)
TARGET_PRECISION = 0.85


def make_villages(n: int, seed: int) -> list[dict]:
    rng = random.Random(seed)
    return [make_village(rng, i) for i in range(n)]


def build(vs: list[dict]):
    """X, और अलग-अलग लक्ष्य: soft (संदर्भ वाली), hard_numeric (पुराना लक्ष्य), clean (कोई लेबल नहीं)।"""
    X, soft, hard_num, clean, vidx, khasra = [], [], [], [], [], []
    for vi, v in enumerate(vs):
        plots = v["record"]["plots"]
        X.append(plot_features(plots))
        for p in plots:
            k = p["khasra"]
            hard = set(v["labels"].get(k, []))
            s = bool(v["soft_labels"].get(k))
            soft.append(s)
            hard_num.append(bool(hard & HARD_NUMERIC))
            clean.append(not hard and not s)
            vidx.append(vi)
            khasra.append(k)
    return (np.vstack(X), np.array(soft), np.array(hard_num), np.array(clean), np.array(vidx), khasra)


def _pr(pred: np.ndarray, truth: np.ndarray) -> dict:
    tp = int((pred & truth).sum())
    return {"precision": round(tp / max(int(pred.sum()), 1), 3), "recall": round(tp / max(int(truth.sum()), 1), 3)}


def _pick_threshold(proba: np.ndarray, y: np.ndarray) -> float:
    """validation पर: precision >= TARGET_PRECISION रखते हुए सबसे ज़्यादा recall वाली सीमा; न मिले तो F1 सबसे ज़्यादा।"""
    from sklearn.metrics import precision_recall_curve
    if y.sum() == 0:
        return 0.5
    p, r, t = precision_recall_curve(y, proba)
    p, r = p[:-1], r[:-1]
    ok = p >= TARGET_PRECISION
    if ok.any():
        # सबसे ज़्यादा recall वाली सभी सीमाओं के बीच की सीमा लेते हैं। किनारे की सीमा (सबसे नीची या सबसे ऊँची)
        # validation पर ठीक बैठती है पर नए डेटा पर टिकती नहीं।
        best = t[ok & (r >= r[ok].max() - 1e-9)]
        return float((best.min() + best.max()) / 2)
    f1 = 2 * p * r / np.maximum(p + r, 1e-9)
    return float(t[int(np.argmax(f1))])


def train_model(vs: list[dict]) -> tuple[dict, dict]:
    from sklearn.ensemble import IsolationForest, RandomForestClassifier
    from sklearn.metrics import average_precision_score
    from .rules import run_rules
    from .schemas import Record

    a, b = int(len(vs) * 0.6), int(len(vs) * 0.8)
    tr, va, te = vs[:a], vs[a:b], vs[b:]
    Xtr, ytr, _, ctr, _, _ = build(tr)
    Xva, yva, *_ = build(va)
    Xte, yte, hte, _, vte, kte = build(te)

    clf = RandomForestClassifier(n_estimators=200, min_samples_leaf=2, class_weight="balanced_subsample",
                                 random_state=0, n_jobs=1).fit(Xtr, ytr)
    thr = _pick_threshold(clf.predict_proba(Xva)[:, 1], yva)
    proba = clf.predict_proba(Xte)[:, 1]
    pred = proba >= thr

    # पुराना baseline: IsolationForest, सिर्फ़ 5 फ़ीचर, साफ़ प्लॉट पर fit (पहले जैसा)
    iso = IsolationForest(n_estimators=200, contamination=0.1, random_state=0).fit(Xtr[ctr][:, :BASE_N])
    iso_pred = iso.predict(Xte[:, :BASE_N]) == -1

    # नियम बनाम नियम+मॉडल, संदर्भ वाली गड़बड़ियों पर
    flagged = set()
    for vi, v in enumerate(te):
        for f in run_rules(Record(**v["record"])):
            flagged.add((vi, f.plot))
    rule_hit = np.array([(int(v), k) in flagged for v, k in zip(vte, kte)])

    metrics = {
        "version": VERSION, "synthetic_only": True,
        "villages": {"train": len(tr), "val": len(va), "test": len(te)},
        "test_plots": int(len(yte)), "test_soft_positive": int(yte.sum()), "test_hard_numeric_positive": int(hte.sum()),
        "threshold": round(thr, 3),
        "model_soft": {**_pr(pred, yte), "avg_precision": round(float(average_precision_score(yte, proba)), 3)},
        "baseline_iforest_soft": _pr(iso_pred, yte),
        "baseline_iforest_hard_numeric": _pr(iso_pred, hte),
        "rules_only_soft_recall": round(float((rule_hit & yte).sum() / max(yte.sum(), 1)), 3),
        "rules_plus_model_soft_recall": round(float(((rule_hit | pred) & yte).sum() / max(yte.sum(), 1)), 3),
    }
    mu = Xtr[ctr].mean(axis=0)
    sd = np.maximum(Xtr[ctr].std(axis=0), 1e-6)
    bundle = {"version": VERSION, "names": NAMES, "clf": clf, "threshold": thr, "mu": mu, "sd": sd}
    return bundle, metrics


def fit_bundle(n_villages: int = 300, seed: int = 1) -> dict:
    """models/ में फ़ाइल न हो तो anomaly.py इसे बुलाकर यहीं train कर लेता है।"""
    return train_model(make_villages(n_villages, seed))[0]


def main():
    import joblib
    ap = argparse.ArgumentParser()
    ap.add_argument("--villages", type=int, default=400)
    ap.add_argument("--seed", type=int, default=1)
    a = ap.parse_args()
    bundle, metrics = train_model(make_villages(a.villages, a.seed))
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_PATH)
    (MODEL_PATH.parent / "metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")
    print("मॉडल सेव:", MODEL_PATH)
    print(json.dumps(metrics, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
