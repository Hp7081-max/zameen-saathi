import random
import shutil

import pytest

from app.ocr import parse_text
from app.ocr_eval import compare, summarize
from app.schemas import Owner, Plot


def _plot(k, kh, area, owners):
    return Plot(khasra=k, khata=kh, area_ha=area, owners=[Owner(name=n, share=s) for n, s in owners])


def test_compare_counts_each_field():
    truth = [{"khasra": "1", "khata": "1", "area_ha": 1.0, "owners": [{"name": "Ram", "share": 0.5}, {"name": "Sita", "share": 0.5}]},
             {"khasra": "2", "khata": "1", "area_ha": 0.5, "owners": [{"name": "Ram", "share": 1.0}]}]
    got = [_plot("1", "1", 1.0, [("Ram", 0.5), ("Sita", 0.25)]),  # एक हिस्सा गलत
           _plot("3", "9", 2.0, [("X", 1.0)])]                      # फ़ालतू पंक्ति, खसरा 2 छूटा
    c = compare(truth, got)
    assert (c["rows"], c["found"], c["area"], c["names"], c["shares"], c["extra"]) == (2, 1, 1, 1, 0, 1)
    s = summarize(c)
    assert s["मिलीं %"] == 50.0 and s["हिस्से सही %"] == 0.0


def test_parser_tolerates_pipes_and_comma_decimal():
    r = parse_text("| 101 | 12 | 0,52 | Ramesh 0.5, Suresh 0.5 |")
    assert r["plots"][0]["area_ha"] == 0.52 and r["plots"][0]["owners"][1]["name"] == "Suresh"


@pytest.mark.skipif(not shutil.which("tesseract"), reason="tesseract नहीं है")
def test_eval_on_synthetic_scans():
    import io
    from app.ocr import TesseractOcr
    from app.synth import make_village, render_page, scan_effect
    rng = random.Random(21)
    plots = make_village(rng, 0, anomaly_rate=0.0)["record"]["plots"][:10]
    buf = io.BytesIO()
    scan_effect(render_page(plots), rng).save(buf, "PNG")
    s = summarize(compare(plots, TesseractOcr().extract(buf.getvalue(), "x.png").plots))
    assert s["मिलीं %"] >= 80 and s["हिस्से सही %"] >= 80
