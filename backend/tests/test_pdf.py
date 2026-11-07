"""PDF -> पन्ने -> OCR। असली PDF (Pillow से बनी), असली pypdfium2 और (जहाँ उपलब्ध) असली Tesseract।"""
import io
import random
import shutil

import pytest
from PIL import Image

from app import pdf
from app.ocr import TesseractOcr, _installed
from app.synth import has_devanagari_font, make_village, render_page, scan_effect

needs_tesseract = pytest.mark.skipif(not shutil.which("tesseract"), reason="tesseract नहीं है")


def _pdf_bytes(pages: list[Image.Image]) -> bytes:
    buf = io.BytesIO()
    rgb = [p.convert("RGB") for p in pages]
    rgb[0].save(buf, "PDF", save_all=True, append_images=rgb[1:], resolution=150)
    return buf.getvalue()


def _scan_pages(lang: str, seed: int = 11):
    rng = random.Random(seed)
    plots = make_village(rng, 0, anomaly_rate=0.0, soft_rate=0.0)["record"]["plots"]
    chunks = [plots[:12], plots[12:24]]
    return chunks, [scan_effect(render_page(c, lang=lang), rng) for c in chunks]


def _matched(rec, chunks) -> float:
    want = {(p["khasra"], p["khata"], p["area_ha"]) for c in chunks for p in c}
    got = {(p.khasra, p.khata, p.area_ha) for p in rec.plots}
    return len(want & got) / len(want)


def test_is_pdf():
    assert pdf.is_pdf(b"%PDF-1.7\n...") and not pdf.is_pdf(b"\x89PNG....")


def test_pages_are_rendered():
    _, imgs = _scan_pages("en")
    out = pdf.pdf_to_png_pages(_pdf_bytes(imgs))
    assert len(out) == 2
    first = Image.open(io.BytesIO(out[0]))
    assert first.mode == "L" and first.width >= 1600 and max(first.size) <= pdf.MAX_SIDE


def test_too_many_pages_rejected():
    page = Image.new("L", (200, 200), 255)
    with pytest.raises(pdf.PdfError, match="पन्ने"):
        pdf.pdf_to_png_pages(_pdf_bytes([page] * (pdf.MAX_PAGES + 1)))


def test_page_limit_comes_from_env(monkeypatch):
    for raw, want in [("3", 3), ("0", 1), ("abc", 8), ("", 8)]:
        monkeypatch.setenv("MAX_PDF_PAGES", raw)
        assert pdf.max_pages_from_env() == want
    monkeypatch.delenv("MAX_PDF_PAGES")
    assert pdf.max_pages_from_env() == 8


def test_broken_pdf_gives_hindi_error():
    with pytest.raises(pdf.PdfError, match="PDF खुल नहीं पाई"):
        pdf.pdf_to_png_pages(b"%PDF-1.4\nthis is not really a pdf")


@needs_tesseract
def test_english_pdf_two_pages():
    chunks, imgs = _scan_pages("en")
    rec = TesseractOcr().extract(_pdf_bytes(imgs), "k.pdf")
    assert _matched(rec, chunks) >= 0.85


@needs_tesseract
@pytest.mark.skipif("hin" not in _installed() or not has_devanagari_font(), reason="hin मॉडल / देवनागरी फ़ॉन्ट नहीं है")
def test_hindi_pdf_two_pages():
    chunks, imgs = _scan_pages("hi")
    rec = TesseractOcr().extract(_pdf_bytes(imgs), "k.pdf")
    assert _matched(rec, chunks) >= 0.8
