"""synthetic डेटा पर anomaly मॉडल train + मापन।  python -m app.synth && python -m app.train
सिर्फ़ 'साफ़' प्लॉट पर fit होता है (novelty detection); फिर लेबल वाले प्लॉट पर recall/precision छपता है।"""
import json
import random
from pathlib import Path

import numpy as np

from .anomaly import MODEL_PATH, features_of
from .synth import make_village

DATA = Path("data/synthetic/villages.jsonl")
ML_KINDS = {"AREA_MISMATCH", "MANY_TRANSFERS", "SHARE_SUM"}  # जो फ़ीचर्स से दिख सकते हैं


def _x(p: dict) -> list[float]:
    return features_of(p["area_ha"], p.get("map_area_ha"), len(p["owners"]), p["transfers_last_2y"],
                       sum(o["share"] for o in p["owners"]))


def _villages(n: int, seed: int) -> list[dict]:
    if DATA.exists():
        return [json.loads(l) for l in DATA.read_text(encoding="utf-8").splitlines()][:n]
    rng = random.Random(seed)
    return [make_village(rng, i) for i in range(n)]


def build(vs: list[dict]):
    clean, test_x, test_y = [], [], []
    for v in vs:
        for p in v["record"]["plots"]:
            kinds = set(v["labels"].get(p["khasra"], []))
            if not kinds:
                clean.append(_x(p))
            test_x.append(_x(p))
            test_y.append(bool(kinds & ML_KINDS))
    return np.array(clean), np.array(test_x), np.array(test_y)


def main():
    from sklearn.ensemble import IsolationForest
    import joblib
    vs = _villages(200, 1)
    split = int(len(vs) * 0.7)
    clean, _, _ = build(vs[:split])
    model = IsolationForest(n_estimators=200, contamination=0.1, random_state=0).fit(clean)
    _, tx, ty = build(vs[split:])
    pred = model.predict(tx) == -1
    tp = int((pred & ty).sum())
    prec, rec = tp / max(pred.sum(), 1), tp / max(ty.sum(), 1)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    metrics = {"train_plots": len(clean), "test_plots": len(tx), "precision": round(float(prec), 3), "recall": round(float(rec), 3)}
    (MODEL_PATH.parent / "metrics.json").write_text(json.dumps(metrics))
    print("मॉडल सेव:", MODEL_PATH, metrics)


if __name__ == "__main__":
    main()
