"""PDF -> पन्नों की PNG तस्वीरें। pypdfium2 सिर्फ़ pip से आता है (poppler जैसा system package नहीं चाहिए),
इसलिए Render के सादे Python environment पर भी चलता है। आगे वही तस्वीरें OCR को जाती हैं।"""
import io
import os


def max_pages_from_env() -> int:
    """MAX_PDF_PAGES से सीमा (.env.example में); गलत या खाली मान पर 8।"""
    try:
        return max(1, int(os.getenv("MAX_PDF_PAGES", "8")))
    except ValueError:
        return 8


MAX_PAGES = max_pages_from_env()  # एक बार में इतने पन्ने; ज़्यादा हों तो सर्वर देर तक अटकता है
DPI = 200          # OCR के लिए काफ़ी साफ़, और तेज़
MAX_SIDE = 3200    # पिक्सेल; बहुत बड़े पन्ने (नक्शा आदि) पर मेमोरी/समय बचाने के लिए


class PdfError(ValueError):
    """संदेश सीधे उपयोगकर्ता को दिखाने लायक (हिंदी) है।"""


def is_pdf(data: bytes) -> bool:
    return b"%PDF-" in data[:1024]


def pdf_to_png_pages(data: bytes, max_pages: int = MAX_PAGES) -> list[bytes]:
    import pypdfium2 as pdfium

    try:
        pdf = pdfium.PdfDocument(data)
    except pdfium.PdfiumError as e:
        raise PdfError("PDF खुल नहीं पाई। हो सकता है वह पासवर्ड वाली या ख़राब हो।") from e
    try:
        n = len(pdf)
        if n == 0:
            raise PdfError("PDF में कोई पन्ना नहीं मिला।")
        if n > max_pages:
            raise PdfError(f"PDF में {n} पन्ने हैं। एक बार में अधिकतम {max_pages} पन्ने डालें।")
        out: list[bytes] = []
        for i in range(n):
            page = pdf[i]
            try:
                w, h = page.get_size()
                if w <= 0 or h <= 0:
                    continue
                scale = min(DPI / 72, MAX_SIDE / max(w, h))
                img = page.render(scale=scale).to_pil().convert("L")
            finally:
                page.close()
            buf = io.BytesIO()
            img.save(buf, "PNG")
            out.append(buf.getvalue())
        if not out:
            raise PdfError("PDF में कोई पढ़ने लायक पन्ना नहीं मिला।")
        return out
    finally:
        pdf.close()
