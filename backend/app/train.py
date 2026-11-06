"""ML मॉडल train + ईमानदार मापन।   python -m app.synth --villages 400 --no-images && python -m app.train

मॉडल सिर्फ़ उन प्लॉट को देखता है जिन्हें rules ने नहीं पकड़ा (असल इस्तेमाल में भी यही होता है)।
लक्ष्य: हल्के संकेत (SOFT_KINDS)। गाँव के हिसाब से 60/20/20 बँटवारा: train / threshold चुनने के लिए / अंतिम test।
चेतावनी: लेबल हमने खुद डाले हैं, इसलिए ये अंक असली दुनिया के नहीं हैं।"""
import json
import random
from pathlib import Path

import numpy as np

from .anomaly import FEATURES, MODEL_PATH, plot_features
from .rules import run_rules
from .schemas import Record
from .synth import SOFT_KINDS, make_village

DATA = Path("data/synthetic/villages.jsonl")


def _villages(n: int, seed: int) -> list[dict]:
    if DATA.exists():
        return [json.loads(l) for l in DATA.read_text(encoding="utf-8").splitlines()]
    rng = random.Random(seed)
    return [make_village(rng, i) for i in range(n)]


def build(vs: list[dict]):
    X, y, kinds = [], [], []
    for v in vs:
        rec = Record(**v["record"])
        ruled = {f.plot for f in run_rules(rec)}
        for p, x in zip(rec.plots, plot_features(rec)):
            ks = set(v["labels"].get(p.khasra, []))
            if p.khasra in ruled or ks == {"SIMILAR_NAMES"}:  # rules पकड़ चुके
                continue
            X.append(x)
            soft = sorted(ks & set(SOFT_KINDS))
            y.append(int(bool(soft)))
            kinds.append(soft)
    return np.array(X), np.array(y), kinds


def _pr(y, pred):
    tp = int(((pred == 1) & (y == 1)).sum())
    return {"precision": round(tp / max(int(pred.sum()), 1), 3), "recall": round(tp / max(int(y.sum()), 1), 3)}


def _threshold(y, p):
    """सबसे ज़्यादा recall, शर्त: precision >= 0.8। न मिले तो सबसे अच्छा F1।"""
    best, best_f1, f1_thr = None, -1.0, 0.5
    for t in np.linspace(0.05, 0.95, 91):
        m = _pr(y, (p >= t).astype(int))
        if m["precision"] >= 0.8 and m["recall"] > 0 and (best is None or m["recall"] > best[1]):
            best = (float(t), m["recall"])
        f1 = 2 * m["precision"] * m["recall"] / max(m["precision"] + m["recall"], 1e-9)
        if f1 > best_f1:
            best_f1, f1_thr = f1, float(t)
    return round(best[0] if best else f1_thr, 2)


def main():
    import joblib
    from sklearn.ensemble import IsolationForest, RandomForestClassifier
    from sklearn.metrics import roc_auc_score
    vs = _villages(400, 1)
    a, b = int(len(vs) * 0.6), int(len(vs) * 0.8)
    (Xtr, ytr, _), (Xva, yva, _), (Xte, yte, kte) = build(vs[:a]), build(vs[a:b]), build(vs[b:])
    if len(set(ytr)) < 2 or yva.sum() == 0 or yte.sum() == 0:
        raise SystemExit("लेबल बहुत कम हैं। गाँव बढ़ाओ: python -m app.synth --villages 400 --no-images")
    clf = RandomForestClassifier(n_estimators=300, min_samples_leaf=2, class_weight="balanced_subsample",
                                 random_state=0, n_jobs=-1).fit(Xtr, ytr)
    thr = _threshold(yva, clf.predict_proba(Xva)[:, 1])
    pte = clf.predict_proba(Xte)[:, 1]
    pred = (pte >= thr).astype(int)
    # तुलना: बिना लेबल वाला IsolationForest (असली डेटा में लेबल नहीं होंगे, तब यही रास्ता बचता है)
    iso = IsolationForest(n_estimators=200, contamination=float(min(max(ytr.mean(), 0.01), 0.3)), random_state=0).fit(Xtr[ytr == 0])
    iso_pred = (iso.predict(Xte) == -1).astype(int)
    by_kind = {k: round(float(np.mean([pred[i] for i, ks in enumerate(kte) if k in ks])), 3) for k in SOFT_KINDS}
    imp = sorted(zip(FEATURES, clf.feature_importances_), key=lambda t: -t[1])[:5]
    metrics = {
        "population": "वे प्लॉट जिन्हें rules ने नहीं पकड़ा",
        "plots": {"train": len(ytr), "val": len(yva), "test": len(yte), "test_positives": int(yte.sum())},
        "supervised_forest": {"threshold": thr, **_pr(yte, pred), "roc_auc": round(float(roc_auc_score(yte, pte)), 3)},
        "isolation_forest_baseline": {**_pr(yte, iso_pred), "roc_auc": round(float(roc_auc_score(yte, -iso.score_samples(Xte))), 3)},
        "recall_by_kind": by_kind,
        "top_features": {k: round(float(v), 3) for k, v in imp},
        "note": "लेबल synthetic हैं (हमने खुद डाले)। असली, सहमति वाले नमूनों पर जाँच बाकी है।",
    }
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"clf": clf, "threshold": thr, "features": FEATURES}, MODEL_PATH)
    (MODEL_PATH.parent / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(metrics, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
