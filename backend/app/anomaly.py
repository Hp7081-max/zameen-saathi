"""ML हिस्सा: IsolationForest। `python -m app.train` से बना मॉडल मिले तो वही, वरना synthetic baseline।"""
from functools import lru_cache
from pathlib import Path

import numpy as np

from .schemas import Flag, Plot, Record

MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "anomaly.joblib"


def features_of(area, map_area, n_owners, transfers, share_total) -> list[float]:
    ratio = (area / map_area) if map_area else 1.0
    return [area, ratio, float(n_owners), float(transfers), abs(share_total - 1.0) if n_owners else 0.0]


def _features(p: Plot) -> list[float]:
    return features_of(p.area_ha, p.map_area_ha, len(p.owners), p.transfers_last_2y, sum(o.share for o in p.owners))


def _baseline(n: int = 500) -> np.ndarray:
    rng = np.random.default_rng(42)
    return np.column_stack([rng.gamma(2.0, 0.4, n), rng.normal(1.0, 0.02, n),
                            rng.integers(1, 5, n), rng.poisson(0.3, n), np.zeros(n)])


@lru_cache
def _model():
    from sklearn.ensemble import IsolationForest
    if MODEL_PATH.exists():
        import joblib
        return joblib.load(MODEL_PATH)
    return IsolationForest(contamination=0.02, random_state=0).fit(_baseline())


def run_anomaly(rec: Record) -> list[Flag]:
    if not rec.plots:
        return []
    try:
        model = _model()
    except ImportError:
        return []
    preds = model.predict(np.array([_features(p) for p in rec.plots]))
    return [
        Flag(code="ANOMALY", severity="medium", plot=p.khasra,
             reason_hi="यह प्लॉट आम रिकॉर्ड के पैटर्न से अलग दिखता है। कृपया दोबारा जाँचें।",
             reason_en="Plot pattern differs from typical records (anomaly model).", source="model")
        for p, y in zip(rec.plots, preds) if y == -1
    ]
