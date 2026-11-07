"""फ्रेमवर्क से अलग लॉजिक, ताकि FastAPI के बिना भी टेस्ट हो सके। main.py सिर्फ़ इन्हें HTTP से जोड़ता है।"""
from .anomaly import run_anomaly
from .explain import explain
from .ocr import get_engine
from .pdf import is_pdf
from .rules import run_rules
from .schemas import AnalyzeResponse, Record

MAX_BYTES = 10 * 1024 * 1024
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp")
_ORDER = ["high", "medium", "low"]


class DocError(Exception):
    """अपलोड में गड़बड़ी: HTTP status + उपयोगकर्ता को दिखाने लायक हिंदी संदेश।"""

    def __init__(self, status: int, msg: str):
        super().__init__(msg)
        self.status, self.msg = status, msg


def extract_document(data: bytes, filename: str) -> Record:
    name = (filename or "").lower()
    if len(data) > MAX_BYTES:
        raise DocError(413, "फ़ाइल 10 MB से छोटी रखें।")
    if not (name.endswith(IMAGE_EXT) or name.endswith(".pdf") or is_pdf(data)):
        raise DocError(415, "सिर्फ़ फ़ोटो (PNG/JPG) या PDF चलती है।")
    try:
        return get_engine().extract(data, name)
    except ValueError as e:      # साफ़ न पढ़ी जा सकी, ख़राब/पासवर्ड वाली PDF, बहुत पन्ने
        raise DocError(422, str(e)) from e
    except RuntimeError as e:    # Tesseract नहीं चला / समय ख़त्म
        raise DocError(503, str(e)) from e


def analyze_record(rec: Record) -> AnalyzeResponse:
    rule_flags = run_rules(rec)
    # जिस प्लॉट पर नियम पहले ही गड़बड़ी बता चुके हैं, वहाँ मॉडल का दोहराव दिखाकर शोर नहीं बढ़ाते
    seen = {f.plot for f in rule_flags}
    model_flags = [f for f in run_anomaly(rec) if f.plot not in seen]
    flags = sorted(rule_flags + model_flags, key=lambda f: _ORDER.index(f.severity))
    summary = f"{len(rec.plots)} प्लॉट मिले। {len(flags)} जगह दोबारा जाँचने की ज़रूरत है।"
    return AnalyzeResponse(summary_hi=summary, plain_hi=explain(rec), flags=flags)
