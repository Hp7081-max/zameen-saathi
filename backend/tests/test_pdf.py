import io
import random
import shutil

import pytest

from app.ocr import MAX_PDF_PAGES, document_text, is_pdf, parse_text, pdf_text
from app.synth import make_village, render_page, scan_effect


def _text_pdf(lines):
    """हाथ से बनी छोटी PDF जिसमें text-layer है (OCR की ज़रूरत नहीं)।"""
    stream = "BT /F1 12 Tf 14 TL 50 700 Td " + " ".join(f"({l}) Tj T*" for l in lines) + " ET"
    objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
            f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    out, offs = b"%PDF-1.4\n", []
    for i, o in enumerate(objs, 1):
        offs.append(len(out))
        out += f"{i} 0 obj\n{o}\nendobj\n".encode()
    x = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    out += b"".join(f"{o:010d} 00000 n \n".encode() for o in offs)
    return out + f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{x}\n%%EOF".encode()


def test_is_pdf():
    assert is_pdf(b"%PDF-1.7 ...") and not is_pdf(b"\x89PNG")


def test_text_layer_pdf_needs_no_ocr():
    plots = parse_text(pdf_text(_text_pdf(["101 12 0.52 Ramesh 0.5, Suresh 0.5", "102 12 1.20 Sita 1"])))["plots"]
    assert [p["khasra"] for p in plots] == ["101", "102"]
    assert plots[0]["owners"][1]["share"] == 0.5


def test_broken_pdf_is_a_clean_error():
    with pytest.raises(ValueError):
        pdf_text(b"%PDF-1.4 yeh pdf nahi hai")


def test_too_many_pages_rejected():
    from PIL import Image
    pages = [Image.new("L", (50, 50), 255) for _ in range(MAX_PDF_PAGES + 1)]
    buf = io.BytesIO()
    pages[0].save(buf, "PDF", save_all=True, append_images=pages[1:])
    with pytest.raises(ValueError):
        pdf_text(buf.getvalue())


@pytest.mark.skipif(not shutil.which("tesseract"), reason="tesseract नहीं है")
def test_scanned_two_page_pdf_via_ocr():
    rng = random.Random(11)
    plots = make_village(rng, 0, anomaly_rate=0.0)["record"]["plots"][:10]
    imgs = [scan_effect(render_page(plots[:5]), rng).convert("RGB"), scan_effect(render_page(plots[5:]), rng).convert("RGB")]
    buf = io.BytesIO()
    imgs[0].save(buf, "PDF", save_all=True, append_images=imgs[1:], resolution=150)
    got = {(p["khasra"], p["khata"], p["area_ha"]) for p in parse_text(document_text(buf.getvalue()))["plots"]}
    want = {(p["khasra"], p["khata"], p["area_ha"]) for p in plots}
    assert len(got & want) / len(want) >= 0.8
