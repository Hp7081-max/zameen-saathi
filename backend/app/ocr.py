"""OCR adapter: demo या Tesseract (hin+eng). Parser अभी हमारे synthetic खतौनी टेम्पलेट के लिए है;
असली खतौनी के लिए parse_text को field-wise सुधारना होगा (HANDOFF.md देखें)।"""
import io
import os
import re
import subprocess
from fractions import Fraction
from functools import lru_cache
from typing import Protocol

from .schemas import Owner, Plot, Record

DEMO_RECORD = Record(district="demo", plots=[
    Plot(khasra="101", khata="12", area_ha=0.52, map_area_ha=0.52,
         owners=[Owner(name="Ramesh", share=0.5), Owner(name="Suresh", share=0.5)]),
    Plot(khasra="102", khata="12", area_ha=1.20, map_area_ha=0.80,
         owners=[Owner(name="Sita Devi", share=0.6), Owner(name="Mohan", share=0.3)]),
    Plot(khasra="101", khata="15", area_ha=0.52, map_area_ha=0.52,
         owners=[Owner(name="Ramesh Kr.", share=1.0)], transfers_last_2y=4),
])

DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
ROW = re.compile(r"(\d+(?:/\d+)?)\s+(\d+)\s+(\d+\.\d+|\d+)\s+(.+)")
OWNER = re.compile(r"([^\d,]+?)\s*(\d*\.\d+|\d+(?:/\d+)?)\s*(?:,|$)")


def _share(s: str) -> float:
    try:
        return float(Fraction(s))
    except (ValueError, ZeroDivisionError):
        return 0.0


def parse_text(text: str) -> dict:
    plots = []
    for line in text.translate(DIGITS).splitlines():
        m = ROW.search(line.strip())
        if not m:
            continue
        khasra, khata, area, rest = m.groups()
        owners = [{"name": n.strip(" |"), "share": _share(s)} for n, s in OWNER.findall(rest)]
        plots.append({"khasra": khasra, "khata": khata, "area_ha": float(area), "owners": owners})
    return {"district": "", "plots": plots}


class OcrEngine(Protocol):
    def extract(self, data: bytes, filename: str) -> Record: ...


class DemoOcr:
    def extract(self, data: bytes, filename: str) -> Record:
        return DEMO_RECORD


@lru_cache
def _lang() -> str:
    try:
        langs = subprocess.run(["tesseract", "--list-langs"], capture_output=True, text=True).stdout
    except FileNotFoundError:
        return "eng"
    return "hin+eng" if "hin" in langs.split() else "eng"


MAX_PDF_PAGES = int(os.getenv("MAX_PDF_PAGES", "8"))
PDF_DPI, MAX_SIDE = 200, 3500


def is_pdf(data: bytes) -> bool:
    return data[:5] == b"%PDF-"


def _ocr_image(img) -> str:
    from PIL import ImageOps
    img = ImageOps.autocontrast(img.convert("L"))
    if img.width < 1600:
        img = img.resize((img.width * 2, img.height * 2))
    buf = io.BytesIO()
    img.save(buf, "PNG")
    try:
        out = subprocess.run(["tesseract", "stdin", "stdout", "-l", _lang(), "--psm", "6"],
                             input=buf.getvalue(), capture_output=True, timeout=40, check=True)
    except (FileNotFoundError, subprocess.SubprocessError) as e:
        raise RuntimeError("Tesseract नहीं चल पाया। Docker image इस्तेमाल करें।") from e
    return out.stdout.decode("utf-8", "ignore")


def ocr_text(data: bytes) -> str:
    from PIL import Image
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception as e:  # टूटी फ़ाइल, बहुत बड़ी तस्वीर (decompression bomb) वगैरह
        raise ValueError("फ़ोटो पढ़ी नहीं जा सकी। PNG या JPG की साफ़ फ़ोटो डालें।") from e
    return _ocr_image(img)


def pdf_text(data: bytes) -> str:
    """हर पन्ने का पाठ। पहले PDF की अपनी text-layer आज़माते हैं; उसमें खसरा-पंक्तियाँ न मिलें
    (स्कैन वाली PDF, या टूटे फ़ॉन्ट) तो पन्ने को तस्वीर बनाकर OCR करते हैं।
    pypdfium2 सिर्फ़ pip से आता है, poppler जैसा सिस्टम पैकेज नहीं चाहिए।"""
    try:
        import pypdfium2 as pdfium
    except ImportError as e:
        raise RuntimeError("PDF पढ़ने वाला पैकेज (pypdfium2) नहीं मिला।") from e
    try:
        pdf = pdfium.PdfDocument(data)
    except Exception as e:
        raise ValueError("PDF खुल नहीं पाई। (पासवर्ड वाली या खराब फ़ाइल हो सकती है।)") from e
    try:
        if len(pdf) > MAX_PDF_PAGES:
            raise ValueError(f"PDF में {len(pdf)} पन्ने हैं; अभी {MAX_PDF_PAGES} तक चलेंगे। ज़रूरी पन्ने अलग करके डालें।")
        parts = []
        for i in range(len(pdf)):
            page = pdf[i]
            txt = page.get_textpage().get_text_range()
            if not parse_text(txt)["plots"]:
                scale = min(PDF_DPI / 72, MAX_SIDE / max(page.get_size()))
                txt = _ocr_image(page.render(scale=scale).to_pil())
            parts.append(txt)
        return "\n".join(parts)
    finally:
        pdf.close()


def document_text(data: bytes) -> str:
    return pdf_text(data) if is_pdf(data) else ocr_text(data)


class TesseractOcr:
    def extract(self, data: bytes, filename: str) -> Record:
        rec = parse_text(document_text(data))
        if not rec["plots"]:
            raise ValueError("फ़ोटो/PDF से कोई खसरा नहीं पढ़ पाए। साफ़ और सीधी फ़ोटो डालें।")
        return Record(**rec)


def get_engine() -> OcrEngine:
    name = os.getenv("OCR_ENGINE", "demo")
    if name == "demo":
        return DemoOcr()
    if name == "tesseract":
        return TesseractOcr()
    raise NotImplementedError(f"OCR engine '{name}' अभी नहीं बना")
