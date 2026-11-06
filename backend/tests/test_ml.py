from pathlib import Path

import app.anomaly as A
from app.schemas import Owner, Plot, Record


def _plot(khasra, khata, name, share=1.0, area=1.0, map_area=1.0, transfers=0):
    return Plot(khasra=khasra, khata=khata, area_ha=area, map_area_ha=map_area,
                owners=[Owner(name=name, share=share)], transfers_last_2y=transfers)


def test_village_level_features():
    rec = Record(plots=[_plot("1", "1", "Ram"), _plot("2", "2", "Ram"), _plot("3", "3", "Ram"),
                        _plot("4", "4", "Ram"), _plot("5", "5", "Shyam", area=1.04)])
    X = A.plot_features(rec)
    col = {k: i for i, k in enumerate(A.FEATURES)}
    assert X.shape == (5, len(A.FEATURES))
    assert X[0][col["name_khata_max"]] == 4 and X[4][col["name_khata_max"]] == 1
    assert abs(X[4][col["area_rel_diff"]] - 0.04) < 1e-9


def test_no_model_means_no_ml_flags():
    old = A.MODEL_PATH
    A.MODEL_PATH = Path("/nonexistent/anomaly.joblib")
    A._bundle.cache_clear()
    try:
        assert A.run_anomaly(Record(plots=[_plot("1", "1", "Ram")])) == []
    finally:
        A.MODEL_PATH = old
        A._bundle.cache_clear()
