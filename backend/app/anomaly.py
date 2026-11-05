"""ML hissa: IsolationForest. Baseline abhi synthetic hai; asli/synthetic dataset aane par yahi badlo."""
import numpy as np

from .schemas import Flag, Plot, Record


def _features(p: Plot) -> list[float]:
    ratio = (p.area_ha / p.map_area_ha) if p.map_area_ha else 1.0
    return [p.area_ha, ratio, float(len(p.owners)), float(p.transfers_last_2y)]


def _baseline(n: int = 500) -> np.ndarray:
    rng = np.random.default_rng(42)
    area = rng.gamma(2.0, 0.4, n)
    ratio = rng.normal(1.0, 0.02, n)
    owners = rng.integers(1, 5, n)
    transfers = rng.poisson(0.3, n)
    return np.column_stack([area, ratio, owners, transfers])


def run_anomaly(rec: Record) -> list[Flag]:
    try:
        from sklearn.ensemble import IsolationForest
    except ImportError:
        return []
    model = IsolationForest(contamination=0.02, random_state=0).fit(_baseline())
    X = np.array([_features(p) for p in rec.plots])
    preds = model.predict(X)
    return [
        Flag(code="ANOMALY", severity="medium", plot=p.khasra,
             reason_hi="यह प्लॉट आम रिकॉर्ड के पैटर्न से अलग दिखता है। कृपया दोबारा जाँचें।",
             reason_en="Plot pattern differs from typical records (anomaly model).",
             source="model")
        for p, y in zip(rec.plots, preds) if y == -1
    ]
