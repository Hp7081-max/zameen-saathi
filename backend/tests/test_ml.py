"""ML: फ़ीचर्स, train/मापन, और end-to-end (हाथ से बने रिकॉर्ड पर flag + हिंदी कारण)।

ये सब synthetic डेटा पर हैं: टेस्ट पास होने का मतलब है कि पाइपलाइन सही चल रही है, यह नहीं कि असली खतौनी पर
मॉडल भरोसेमंद है (वह असली नमूनों पर अलग से मापना है; PENDING.md देखें)।"""
import pytest

from app import anomaly
from app.features import BASE_N, NAMES, plot_features
from app.schemas import Owner, Plot, Record
from app.train import make_villages, train_model


@pytest.fixture(scope="module")
def trained():
    return train_model(make_villages(300, 1))


def _plot(i, khata, names, area=0.4, transfers=0, shares=None):
    shares = shares or [1 / len(names)] * len(names)
    return Plot(khasra=str(100 + i), khata=str(khata), area_ha=area, map_area_ha=area, transfers_last_2y=transfers,
                owners=[Owner(name=n, share=s) for n, s in zip(names, shares)])


def _normal_record(n=10):
    people = ["Ramesh Kumar", "Sita Devi", "Mohan Lal", "Geeta Yadav", "Hari Singh", "Anil Verma", "Radha Pal",
              "Vijay Gupta", "Kamla Devi", "Dinesh Maurya"]
    return [_plot(i, i + 1, [people[i % 10]], area=0.3 + 0.03 * i) for i in range(n)]


# ---------- फ़ीचर्स ----------
def test_feature_shape_and_values():
    rec = Record(plots=[_plot(0, 1, ["A B", "C D"], area=0.5, transfers=2),
                        _plot(1, 2, ["A B"], area=0.5),
                        _plot(2, 3, ["A B"], area=0.5),
                        _plot(3, 4, ["E F"], area=0.5)])
    X = plot_features([p.model_dump() for p in rec.plots])
    f = {n: X[0][i] for i, n in enumerate(NAMES)}
    assert X.shape == (4, len(NAMES)) and BASE_N == 5
    assert f["owner_khata_spread"] == 3          # "A B" तीन खातों में है
    assert f["n_owners"] == 2 and f["transfers"] == 2 and f["min_share"] == 0.5
    assert f["area_vs_median"] == pytest.approx(1.0)


def test_features_handle_empty_and_ownerless():
    assert plot_features([]).shape == (0, len(NAMES))
    X = plot_features([{"khasra": "1", "khata": "1", "area_ha": 0.2, "owners": []}])
    assert X.shape == (1, len(NAMES)) and X[0][NAMES.index("share_dev")] == 0.0


def test_name_matching_ignores_case_and_dots():
    plots = [{"khasra": str(i), "khata": str(i), "area_ha": 0.3, "map_area_ha": 0.3, "transfers_last_2y": 0,
              "owners": [{"name": n, "share": 1.0}]} for i, n in enumerate(["Ram Kr.", "ram kr", "RAM  KR"])]
    assert plot_features(plots)[0][NAMES.index("owner_khata_spread")] == 3


# ---------- train + मापन ----------
def test_model_beats_baseline_on_context_patterns(trained):
    _, m = trained
    assert m["test_soft_positive"] >= 50, "मापन के लिए पर्याप्त उदाहरण नहीं"
    assert m["model_soft"]["recall"] >= 0.85 and m["model_soft"]["precision"] >= 0.8
    assert m["model_soft"]["precision"] > m["baseline_iforest_soft"]["precision"] + 0.3
    assert m["model_soft"]["recall"] > m["baseline_iforest_soft"]["recall"] + 0.3


def test_rules_alone_miss_these_patterns_and_model_complements(trained):
    _, m = trained
    assert m["rules_only_soft_recall"] < 0.1
    assert m["rules_plus_model_soft_recall"] >= m["model_soft"]["recall"]


def test_metrics_say_synthetic_only(trained):
    assert trained[1]["synthetic_only"] is True


def test_training_is_deterministic():
    a = train_model(make_villages(80, 4))[1]
    b = train_model(make_villages(80, 4))[1]
    assert a == b


# ---------- end-to-end: run_anomaly ----------
@pytest.fixture
def model_in_use(trained, monkeypatch):
    monkeypatch.setattr(anomaly, "_bundle", lambda: trained[0])


def test_accumulation_pattern_is_flagged_with_hindi_reason(model_in_use):
    plots = _normal_record(10)
    for i in (0, 2, 4, 6, 8):  # एक ही नाम 5 खातों में, सबमें हाल का transfer
        plots[i] = _plot(i, i + 1, ["Raju Sethi"], area=0.3 + 0.03 * i, transfers=1)
    flags = anomaly.run_anomaly(Record(plots=plots))
    hit = {f.plot for f in flags}
    assert {"100", "102", "104", "106", "108"} <= hit
    f = next(f for f in flags if f.plot == "100")
    assert f.source == "model" and f.severity == "medium" and "5 अलग-अलग खातों" in f.reason_hi


def test_fragmented_plot_is_flagged_with_hindi_reason(model_in_use):
    plots = _normal_record(10)
    plots[3] = _plot(3, 4, [f"Owner {k} Name" for k in range(6)], area=0.05, transfers=2)
    flags = [f for f in anomaly.run_anomaly(Record(plots=plots)) if f.plot == "103"]
    assert flags and "6 हिस्सेदार" in flags[0].reason_hi


def test_ordinary_record_gets_no_model_flags(model_in_use):
    assert anomaly.run_anomaly(Record(plots=_normal_record(10))) == []


def test_empty_record(model_in_use):
    assert anomaly.run_anomaly(Record(plots=[])) == []


def test_stale_or_missing_model_file_falls_back_to_training(tmp_path, monkeypatch):
    """models/ में पुराने ढाँचे की फ़ाइल हो या कोई फ़ाइल ही न हो तो crash नहीं, चुपचाप नया मॉडल बनता है।"""
    import joblib
    from sklearn.ensemble import IsolationForest
    stale = tmp_path / "anomaly.joblib"
    joblib.dump(IsolationForest().fit([[0.0] * 5, [1.0] * 5, [2.0] * 5]), stale)
    for path in (stale, tmp_path / "does_not_exist.joblib"):
        monkeypatch.setattr(anomaly, "MODEL_PATH", path)
        anomaly._bundle.cache_clear()
        b = anomaly._bundle()
        assert b["version"] == anomaly.VERSION and b["names"] == NAMES
    anomaly._bundle.cache_clear()


def test_synthetic_data_is_identical_across_processes():
    """अलग PYTHONHASHSEED पर भी वही डेटा (set का क्रम हर process में बदलता है; उसी से पहले आँकड़े हिलते थे)।"""
    import os
    import subprocess
    import sys
    from pathlib import Path
    code = ("import json, random; from app.synth import make_village; "
            "print(json.dumps(make_village(random.Random(3), 0), sort_keys=True))")
    outs = {subprocess.run([sys.executable, "-c", code], cwd=Path(__file__).resolve().parents[1],
                           env={**os.environ, "PYTHONHASHSEED": h}, capture_output=True, text=True, check=True).stdout
            for h in ("1", "2", "3")}
    assert len(outs) == 1
