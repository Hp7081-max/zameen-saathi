import random
import shutil

import pytest

from app.ocr import parse_text
from app.rules import run_rules
from app.schemas import Record
from app.synth import SOFT_KINDS, make_village, render_page, scan_effect


def _villages(n=60):
    rng = random.Random(3)
    return [make_village(rng, i) for i in range(n)]


def test_rules_catch_injected_anomalies():
    """हर injected गड़बड़ी (SHARE_SUM, AREA_MISMATCH, ...) को rules पकड़ें: recall >= 95%।"""
    hit = tot = 0
    for v in _villages():
        flags = {(f.plot, f.code) for f in run_rules(Record(**v["record"]))}
        for khasra, kinds in v["labels"].items():
            for k in kinds:
                if k in SOFT_KINDS:  # इन्हें rules नहीं, ML देखता है
                    continue
                tot += 1
                hit += (khasra, k) in flags or (k == "SIMILAR_NAMES" and any(c == k for _, c in flags))
    assert tot > 20 and hit / tot >= 0.95


def test_clean_village_has_no_hard_flags():
    rng = random.Random(1)
    v = make_village(rng, 0, anomaly_rate=0.0)
    hard = {f.code for f in run_rules(Record(**v["record"]))} - {"SIMILAR_NAMES"}
    assert hard == set()


@pytest.mark.skipif(not shutil.which("tesseract"), reason="tesseract नहीं है")
def test_ocr_roundtrip():
    import io
    from app.ocr import ocr_text
    rng = random.Random(5)
    v = make_village(rng, 0, anomaly_rate=0.0)
    page = v["record"]["plots"][:8]
    buf = io.BytesIO()
    scan_effect(render_page(page), rng).save(buf, "PNG")
    got = {(p["khasra"], p["khata"], p["area_ha"]) for p in parse_text(ocr_text(buf.getvalue()))["plots"]}
    want = {(p["khasra"], p["khata"], p["area_ha"]) for p in page}
    assert len(got & want) / len(want) >= 0.8
