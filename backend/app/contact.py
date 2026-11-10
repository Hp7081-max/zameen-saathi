"""संपर्क / सुझाव / साझेदारी के संदेश। framework से अलग, ताकि FastAPI के बिना टेस्ट हो।

संदेश `DATA_DIR/contact.jsonl` में एक पंक्ति प्रति संदेश (डिफ़ॉल्ट `backend/data/`)। Render जैसी जगह पर डिस्क
स्थायी नहीं होती: असली इस्तेमाल में `DATA_DIR` किसी स्थायी disk पर रखो या संदेश जल्दी पढ़ लो।
फ़ोटो/खतौनी इस रास्ते से कभी नहीं आती; सिर्फ़ वही लिखा पाठ जो उपयोगकर्ता खुद यहाँ लिखता है।
"""
import hmac
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

from .messages import Msg

KINDS = ("feedback", "partner", "problem", "other")
MAX_NAME, MAX_CONTACT, MAX_MESSAGE, MIN_MESSAGE = 80, 120, 1500, 5
_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


class ContactError(ValueError):
    """उपयोगकर्ता को दिखाने लायक त्रुटि; args[0] एक `Msg` (हिंदी + English)।"""

    def __init__(self, status: int, msg: Msg):
        super().__init__(msg)
        self.status = status


def _data_dir() -> Path:
    d = os.getenv("DATA_DIR", "").strip()
    return Path(d) if d else Path(__file__).resolve().parent.parent / "data"


def _file() -> Path:
    return _data_dir() / "contact.jsonl"


def _clean(text: str, limit: int) -> str:
    return _CTRL.sub("", text or "").strip()[:limit]


def clean(name: str, contact: str, message: str, kind: str, website: str = "") -> dict | None:
    """जाँचकर साफ़ प्रविष्टि बनाता है। `website` एक छिपा खाना है जिसे इंसान नहीं भरता: भरा हो तो None (चुपचाप छोड़ दो)।"""
    if (website or "").strip():
        return None
    msg = _clean(message, 100_000)
    if len(msg) < MIN_MESSAGE:
        raise ContactError(422, Msg("संदेश थोड़ा और लिखिए।", "Please write a little more in your message."))
    if len(msg) > MAX_MESSAGE:
        raise ContactError(422, Msg(f"संदेश {MAX_MESSAGE} अक्षरों से छोटा रखें।", f"Keep the message under {MAX_MESSAGE} characters."))
    return {
        "t": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "kind": kind if kind in KINDS else "other",
        "name": _clean(name, MAX_NAME),
        "contact": _clean(contact, MAX_CONTACT),
        "message": msg,
    }


def save(entry: dict) -> None:
    p = _file()
    cap = int(float(os.getenv("MAX_CONTACT_FILE_MB", "5")) * 1024 * 1024)
    try:
        if p.exists() and p.stat().st_size > cap:  # डिस्क भरने से बचाव
            raise ContactError(503, Msg("अभी संदेश नहीं ले पा रहे। बाद में कोशिश करें।", "We cannot take messages right now. Try again later."))
        p.parent.mkdir(parents=True, exist_ok=True)
        with p.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except OSError as e:
        raise ContactError(503, Msg("संदेश सेव नहीं हो पाया। बाद में कोशिश करें।", "The message could not be saved. Try again later.")) from e


def read_all(limit: int = 200) -> list[dict]:
    """सबसे नए पहले। ख़राब पंक्ति छोड़ दी जाती है।"""
    p = _file()
    if not p.exists():
        return []
    rows: list[dict] = []
    for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            rows.append(json.loads(line))
        except ValueError:
            continue
    return rows[::-1][: max(1, limit)]


def admin_enabled() -> bool:
    return bool(os.getenv("ADMIN_TOKEN", ""))


def admin_ok(token: str | None) -> bool:
    want = os.getenv("ADMIN_TOKEN", "")
    return bool(want) and bool(token) and hmac.compare_digest(token.encode(), want.encode())
