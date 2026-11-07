"""OCR: अंग्रेज़ी और हिंदी स्कैन, और भाषा का सही चुनाव (hin बनाम eng)।"""
import io
import random
import shutil

import pytest

from app.ocr import _installed, ocr_page, parse_text
from app.synth import has_devanagari_font, make_village, render_page, scan_effect

pytestmark = pytest.mark.skipif(not shutil.which("tesseract"), reason="tesseract नहीं है")
needs_hin = pytest.mark.skipif("hin" not in _installed() or not has_devanagari_font(),
                               reason="hin मॉडल / देवनागरी फ़ॉन्ट नहीं है")


def _png(lang: str, seed: int):
    rng = random.Random(seed)
    page = make_village(rng, 0, anomaly_rate=0.0, soft_rate=0.0)["record"]["plots"][:12]
    buf = io.BytesIO()
    scan_effect(render_page(page, lang=lang), rng).save(buf, "PNG")
    return buf.getvalue(), page


def _frac(text: str, page) -> float:
    got = {(p["khasra"], p["khata"], p["area_ha"]) for p in parse_text(text)["plots"]}
    want = {(p["khasra"], p["khata"], p["area_ha"]) for p in page}
    return len(got & want) / len(want)


def test_english_scan_uses_eng_and_reads_all_fields():
    data, page = _png("en", 21)
    text, conf, lang = ocr_page(data)
    assert lang == "eng" and conf > 85
    assert _frac(text, page) >= 0.9


@needs_hin
def test_hindi_scan_uses_hin_and_reads_fields():
    data, page = _png("hi", 22)
    text, conf, lang = ocr_page(data)
    assert lang == "hin" and conf > 85
    assert _frac(text, page) >= 0.8


@needs_hin
def test_hindi_owner_names_come_back_in_devanagari():
    data, page = _png("hi", 23)
    plots = parse_text(ocr_page(data)[0])["plots"]
    names = [o["name"] for p in plots for o in p["owners"]]
    assert names and sum(any("ऀ" <= ch <= "ॿ" for ch in n) for n in names) / len(names) > 0.8
