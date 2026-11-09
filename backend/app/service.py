"""फ्रेमवर्क से अलग लॉजिक, ताकि FastAPI के बिना भी टेस्ट हो सके। main.py सिर्फ़ इन्हें HTTP से जोड़ता है।"""
from .anomaly import run_anomaly
from .explain import explain, explain_en
from .guide import checklist
from .messages import Msg, detail_of
from .ocr import get_engine
from .pdf import is_pdf
from .rules import run_rules
from .schemas import AnalyzeResponse, Record

MAX_BYTES = 10 * 1024 * 1024
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp")
_ORDER = ["high", "medium", "low"]


class DocError(Exception):
    """अपलोड में गड़बड़ी: HTTP status + उपयोगकर्ता को दिखाने लायक संदेश (`.msg` हिंदी, `.detail` हिंदी + English)।"""

    def __init__(self, status: int, msg):
        super().__init__(msg)
        self.status, self.msg, self.detail = status, str(msg), detail_of(msg)


def extract_document(data: bytes, filename: str) -> Record:
    name = (filename or "").lower()
    if len(data) > MAX_BYTES:
        raise DocError(413, Msg("फ़ाइल 10 MB से छोटी रखें।", "Keep the file under 10 MB."))
    if not (name.endswith(IMAGE_EXT) or name.endswith(".pdf") or is_pdf(data)):
        raise DocError(415, Msg("सिर्फ़ फ़ोटो (PNG/JPG) या PDF चलती है।", "Only photos (PNG/JPG/WebP) or PDF files are accepted."))
    try:
        return get_engine().extract(data, name)
    except ValueError as e:      # साफ़ न पढ़ी जा सकी, ख़राब/पासवर्ड वाली PDF, बहुत पन्ने
        raise DocError(422, e.args[0] if e.args else str(e)) from e
    except RuntimeError as e:    # Tesseract नहीं चला / समय ख़त्म
        raise DocError(503, e.args[0] if e.args else str(e)) from e


def analyze_record(rec: Record) -> AnalyzeResponse:
    rule_flags = run_rules(rec)
    # जिस प्लॉट पर नियम पहले ही गड़बड़ी बता चुके हैं, वहाँ मॉडल का दोहराव दिखाकर शोर नहीं बढ़ाते
    seen = {f.plot for f in rule_flags}
    model_flags = [f for f in run_anomaly(rec) if f.plot not in seen]
    flags = sorted(rule_flags + model_flags, key=lambda f: _ORDER.index(f.severity))
    n, k = len(rec.plots), len(flags)
    return AnalyzeResponse(
        summary_hi=f"{n} प्लॉट मिले। {k} जगह दोबारा जाँचने की ज़रूरत है।",
        summary_en=f"{n} plots found. {k} places need a second look.",
        plain_hi=explain(rec), plain_en=explain_en(rec),
        flags=flags, checklist=checklist(flags))


SAMPLE_SEED, SAMPLE_PLOTS = 1132, 14  # इस seed पर सातों तरह के संकेत दिखते हैं (जाँचा गया)


def sample_record(lang: str = "hi") -> Record:
    """आज़माने के लिए एक काल्पनिक गाँव (synthetic; कोई असली व्यक्ति/ज़मीन नहीं), नक्शे की जगह के साथ।
    हर बार एक ही (seed तय है), ताकि डेमो और टेस्ट दोहराए जा सकें। हिंदी में नाम देवनागरी में।"""
    import random

    from . import synth
    v = synth.make_village(random.Random(SAMPLE_SEED), 1, n_plots=SAMPLE_PLOTS, anomaly_rate=0.3)
    rec = v["record"]
    if lang != "en":
        for p in rec["plots"]:
            for o in p["owners"]:
                o["name"] = synth._hi(o["name"])
    return Record(district="नमूना गाँव" if lang != "en" else "Sample village", plots=rec["plots"])
