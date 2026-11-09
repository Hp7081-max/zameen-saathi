"""OCR adapter: demo या Tesseract। फ़ोटो और PDF (कई पन्ने) दोनों।

भाषा का चुनाव: पहले `hin` चलाते हैं (असली खतौनी देवनागरी में होती है)। Tesseract की अपनी औसत confidence
>= 85 हो तो वही नतीजा; वरना `eng` भी चलाकर जिसकी confidence ज़्यादा हो वह चुनते हैं।
वजह (नापकर देखा): `hin+eng` एक साथ चलाने पर लैटिन अंक बिगड़ते हैं ("100" -> "00", "1.0" -> "3.0"), और अकेला
`hin` अंग्रेज़ी पन्ने पर पूरी देवनागरी बकवास निकालता है (देवनागरी-अनुपात से फ़र्क़ नहीं पकड़ा जाता), जबकि
सही भाषा पर confidence ~94-95 और ग़लत पर 33-61 आई।

Parser अभी हमारे synthetic खतौनी टेम्पलेट के लिए है; असली खतौनी के लिए parse_text को field-wise
सुधारना होगा (HANDOFF.md / PENDING.md देखें)।"""
import csv
import io
import os
import re
import subprocess
import time
from fractions import Fraction
from functools import lru_cache
from typing import Protocol

from .messages import Msg
from .pdf import is_pdf, pdf_to_png_pages
from .schemas import Owner, Plot, Record

DEMO_RECORD = Record(district="demo", plots=[
    Plot(khasra="101", khata="12", area_ha=0.52, map_area_ha=0.52, bbox=[0, 0, 100, 80],
         owners=[Owner(name="Ramesh", share=0.5), Owner(name="Suresh", share=0.5)]),
    Plot(khasra="102", khata="12", area_ha=1.20, map_area_ha=0.80, bbox=[100, 0, 100, 80],
         owners=[Owner(name="Sita Devi", share=0.6), Owner(name="Mohan", share=0.3)]),
    Plot(khasra="101", khata="15", area_ha=0.52, map_area_ha=0.52, bbox=[0, 0, 100, 80],
         owners=[Owner(name="Ramesh Kr.", share=1.0)], transfers_last_2y=4),
])

DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
ROW = re.compile(r"(\d+(?:/\d+)?)\s+(\d+)\s+(\d+[.,]\d+|\d+)\s+(.+)")
OWNER = re.compile(r"([^\d,]+?)\s*(\d*\.\d+|\d+(?:/\d+)?)\s*(?:,|$)")

PAGE_TIMEOUT = 60     # सेकंड, एक पन्ने के लिए
TOTAL_BUDGET = 150    # सेकंड, पूरी फ़ाइल के लिए
MAX_SIDE = 3200       # पिक्सेल
CONF_OK = 85.0        # hin की औसत confidence इतनी हो तो eng चलाने की ज़रूरत नहीं


def _share(s: str) -> float:
    try:
        return float(Fraction(s))
    except (ValueError, ZeroDivisionError):
        return 0.0


def parse_text(text: str) -> dict:
    plots = []
    for line in text.translate(DIGITS).replace("|", " ").splitlines():  # तालिका की खड़ी रेखा (|) को खाली जगह मानो
        m = ROW.search(line.strip())
        if not m:
            continue
        khasra, khata, area, rest = m.groups()
        owners = [{"name": n.strip(" |"), "share": _share(s)} for n, s in OWNER.findall(rest)]
        plots.append({"khasra": khasra, "khata": khata, "area_ha": float(area.replace(",", ".")), "owners": owners})
    return {"district": "", "plots": plots}


class OcrEngine(Protocol):
    def extract(self, data: bytes, filename: str) -> Record: ...


class DemoOcr:
    def extract(self, data: bytes, filename: str) -> Record:
        return DEMO_RECORD


@lru_cache
def _installed() -> frozenset[str]:
    try:
        out = subprocess.run(["tesseract", "--list-langs"], capture_output=True, text=True, timeout=20).stdout
    except (FileNotFoundError, subprocess.SubprocessError):
        return frozenset()
    return frozenset(out.split())


def _prep(data: bytes) -> bytes:
    from PIL import Image, ImageOps
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except (OSError, ValueError, SyntaxError, Image.DecompressionBombError) as e:
        raise ValueError(Msg("फ़ाइल पढ़ी नहीं जा सकी। साफ़ PNG/JPG फ़ोटो या PDF डालें।",
                             "The file could not be read. Upload a clear PNG/JPG photo or a PDF.")) from e
    img = ImageOps.autocontrast(img.convert("L"))
    if img.width < 1600:
        img = img.resize((img.width * 2, img.height * 2))
    if max(img.size) > MAX_SIDE:
        k = MAX_SIDE / max(img.size)
        img = img.resize((max(1, int(img.width * k)), max(1, int(img.height * k))))
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def _tesseract(png: bytes, lang: str, timeout: float) -> tuple[str, float]:
    """(पाठ, औसत confidence 0-100)। TSV से पंक्तियाँ और confidence दोनों एक ही बार में मिलती हैं।"""
    try:
        out = subprocess.run(["tesseract", "stdin", "stdout", "-l", lang, "--psm", "6", "tsv"],
                             input=png, capture_output=True, timeout=timeout, check=True)
    except (FileNotFoundError, subprocess.SubprocessError) as e:
        raise RuntimeError(Msg("Tesseract नहीं चल पाया। Docker image इस्तेमाल करें।",
                               "Tesseract could not run. Use the Docker image.")) from e
    rows = list(csv.reader(out.stdout.decode("utf-8", "ignore").splitlines(), delimiter="\t", quoting=csv.QUOTE_NONE))[1:]
    words = [r for r in rows if len(r) >= 12 and r[0] == "5" and r[11].strip()]
    confs = [float(r[10]) for r in words if r[10].lstrip("-").replace(".", "", 1).isdigit() and float(r[10]) >= 0]
    lines: dict[tuple, list[str]] = {}
    for r in words:
        lines.setdefault((r[2], r[3], r[4]), []).append(r[11])
    return "\n".join(" ".join(w) for w in lines.values()), (sum(confs) / len(confs) if confs else 0.0)


def ocr_page(data: bytes, timeout: float = PAGE_TIMEOUT) -> tuple[str, float, str]:
    """(पाठ, confidence, चुनी गई भाषा)।"""
    png = _prep(data)
    best: tuple[str, float, str] | None = None
    for lang in (["hin"] if "hin" in _installed() else []) + ["eng"]:
        text, conf = _tesseract(png, lang, timeout)
        if best is None or conf > best[1]:
            best = (text, conf, lang)
        if conf >= CONF_OK:
            break
    return best  # type: ignore[return-value]


def ocr_text(data: bytes, timeout: float = PAGE_TIMEOUT) -> str:
    return ocr_page(data, timeout)[0]


class TesseractOcr:
    def extract(self, data: bytes, filename: str) -> Record:
        pages = pdf_to_png_pages(data) if is_pdf(data) else [data]
        start, plots = time.monotonic(), []
        for page in pages:
            left = TOTAL_BUDGET - (time.monotonic() - start)
            if left <= 0:
                raise RuntimeError(Msg("फ़ाइल पढ़ने में बहुत समय लग रहा है। कम पन्नों की PDF डालें।",
                                   "Reading is taking too long. Upload a PDF with fewer pages."))
            plots += parse_text(ocr_text(page, min(PAGE_TIMEOUT, left)))["plots"]
        if not plots:
            raise ValueError(Msg("फ़ाइल से कोई खसरा नहीं पढ़ पाए। साफ़ और सीधी फ़ोटो/PDF डालें।",
                                 "No khasra rows could be read. Upload a clear, straight photo or PDF."))
        return Record(district="", plots=plots)


def get_engine() -> OcrEngine:
    name = os.getenv("OCR_ENGINE", "demo")
    if name == "demo":
        return DemoOcr()
    if name == "tesseract":
        return TesseractOcr()
    raise NotImplementedError(f"OCR engine '{name}' अभी नहीं बना")
