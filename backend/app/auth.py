"""सहमति + OTP + session। फ़ोन और टोकन सिर्फ़ hash के रूप में रखे जाते हैं।
Store: डिफ़ॉल्ट memory (एक instance); REDIS_URL हो तो Redis (कई instance)।
SMS: OTP_MODE=demo (OTP जवाब में दिखता है, सिर्फ़ डेमो के लिए) या OTP_MODE=sms + SMS_PROVIDER=msg91|twilio।"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request

from fastapi import Depends, Header, HTTPException

OTP_TTL, SESSION_TTL, MAX_TRIES = 300, 1800, 5
DEFAULT_SALT = "dev-salt"


class MemoryStore:
    def __init__(self):
        self._d: dict[str, tuple[str, float]] = {}

    def get(self, k):
        v = self._d.get(k)
        if v and v[1] < time.time():
            del self._d[k]
            return None
        return v[0] if v else None

    def set(self, k, val, ttl):
        self._d[k] = (val, time.time() + ttl)

    def delete(self, k):
        self._d.pop(k, None)

    def incr(self, k, ttl):  # fixed-window गिनती
        cur = self.get(k)
        n = (int(cur) if cur else 0) + 1
        self._d[k] = (str(n), self._d[k][1] if cur else time.time() + ttl)
        return n


class RedisStore:
    def __init__(self, url):
        import redis
        self.r = redis.Redis.from_url(url, decode_responses=True)

    def get(self, k):
        return self.r.get(k)

    def set(self, k, val, ttl):
        self.r.set(k, val, ex=ttl)

    def delete(self, k):
        self.r.delete(k)

    def incr(self, k, ttl):
        n = self.r.incr(k)
        if n == 1:
            self.r.expire(k, ttl)
        return n


_store = None


def store():
    global _store
    if _store is None:
        url = os.getenv("REDIS_URL")
        _store = RedisStore(url) if url else MemoryStore()
    return _store


def _h(s: str) -> str:
    return hashlib.sha256((os.getenv("AUTH_SALT", DEFAULT_SALT) + s).encode()).hexdigest()


def check_config() -> None:
    """असली SMS मोड में कमज़ोर सेटिंग के साथ सर्वर शुरू ही न हो।"""
    mode = os.getenv("OTP_MODE", "demo")
    if mode == "demo":
        return
    if mode != "sms":
        raise RuntimeError("OTP_MODE 'demo' या 'sms' होना चाहिए।")
    if os.getenv("AUTH_SALT", DEFAULT_SALT) == DEFAULT_SALT:
        raise RuntimeError("OTP_MODE=sms में AUTH_SALT बदलना ज़रूरी है।")
    if os.getenv("SMS_PROVIDER", "") not in ("msg91", "twilio"):
        raise RuntimeError("SMS_PROVIDER 'msg91' या 'twilio' रखें।")


def _phone(raw: str) -> str:
    p = raw.strip().replace(" ", "").replace("-", "")
    # देश का कोड तभी हटाओ जब नंबर लंबा हो: 91 से शुरू होने वाला 10 अंकों का मोबाइल नंबर भी सही हो सकता है
    if p.startswith("+91"):
        p = p[3:]
    elif len(p) == 12 and p.startswith("91"):
        p = p[2:]
    elif len(p) == 11 and p.startswith("0"):
        p = p[1:]
    if not re.fullmatch(r"[6-9]\d{9}", p):
        raise HTTPException(400, "सही 10 अंकों का मोबाइल नंबर डालें।")
    return p


def _http_post(url, data=None, headers=None, timeout=10):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read()


SMS_TRANSPORT = _http_post  # टेस्ट में बदला जाता है


def send_sms(phone: str, otp: str) -> None:
    """भारत में SMS के लिए DLT-पंजीकृत टेम्पलेट चाहिए (MSG91 इसे अपने template_id से सँभालता है)।
    नोट: दोनों provider की API बनावट दस्तावेज़ों से ली है; असली keys से अभी परखी नहीं।"""
    prov = os.getenv("SMS_PROVIDER", "")
    try:
        if prov == "msg91":
            q = urllib.parse.urlencode({"template_id": os.environ["MSG91_TEMPLATE_ID"], "mobile": "91" + phone,
                                        "otp": otp, "otp_expiry": OTP_TTL // 60})
            status, body = SMS_TRANSPORT("https://control.msg91.com/api/v5/otp?" + q, b"{}",
                                         {"authkey": os.environ["MSG91_AUTHKEY"], "Content-Type": "application/json",
                                          "Accept": "application/json"})
            try:
                if json.loads(body).get("type") == "error":
                    status = 502
            except ValueError:
                pass
        elif prov == "twilio":
            sid, tok = os.environ["TWILIO_SID"], os.environ["TWILIO_TOKEN"]
            data = urllib.parse.urlencode({"To": "+91" + phone, "From": os.environ["TWILIO_FROM"],
                                           "Body": f"Zameen-Saathi OTP: {otp}. 5 minute me use karein."}).encode()
            basic = base64.b64encode(f"{sid}:{tok}".encode()).decode()
            status, _ = SMS_TRANSPORT(f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json", data,
                                      {"Authorization": "Basic " + basic,
                                       "Content-Type": "application/x-www-form-urlencoded"})
        else:
            raise HTTPException(501, "SMS provider जुड़ा नहीं है।")
    except KeyError as e:
        raise HTTPException(503, f"SMS की सेटिंग अधूरी है: {e.args[0]}")
    except (urllib.error.URLError, TimeoutError, OSError):
        raise HTTPException(502, "SMS भेज नहीं पाए। थोड़ी देर बाद कोशिश करें।")
    if status >= 300:
        raise HTTPException(502, "SMS भेज नहीं पाए। थोड़ी देर बाद कोशिश करें।")


def request_otp(phone: str, consent: bool) -> dict:
    if not consent:
        raise HTTPException(400, "आगे बढ़ने के लिए सहमति ज़रूरी है।")
    clean = _phone(phone)
    ph = _h(clean)
    if store().incr("rq:" + ph, 600) > 3:
        raise HTTPException(429, "बहुत बार कोशिश हुई। 10 मिनट बाद फिर करें।")
    otp = f"{secrets.randbelow(10**6):06d}"
    store().set("otp:" + ph, json.dumps({"h": _h(otp), "t": 0}), OTP_TTL)
    if os.getenv("OTP_MODE", "demo") == "demo":
        return {"sent": True, "debug_otp": otp}
    try:
        send_sms(clean, otp)
    except HTTPException:
        store().delete("otp:" + ph)  # भेजा ही नहीं गया तो अटका OTP न रहे
        raise
    return {"sent": True}


def verify_otp(phone: str, otp: str) -> dict:
    ph = _h(_phone(phone))
    raw = store().get("otp:" + ph)
    if not raw:
        raise HTTPException(400, "OTP की समय सीमा खत्म हो गई। दोबारा भेजें।")
    e = json.loads(raw)
    e["t"] += 1
    if e["t"] > MAX_TRIES:
        store().delete("otp:" + ph)
        raise HTTPException(429, "बहुत गलत OTP। नया OTP मँगवाएँ।")
    if not hmac.compare_digest(e["h"], _h(otp.strip())):
        store().set("otp:" + ph, json.dumps(e), OTP_TTL)
        raise HTTPException(400, "OTP गलत है।")
    store().delete("otp:" + ph)
    token = secrets.token_urlsafe(32)
    store().set("s:" + _h(token), "1", SESSION_TTL)
    return {"token": token, "expires_in": SESSION_TTL}


def require_session(x_session: str | None = Header(default=None)) -> str:
    if os.getenv("AUTH_REQUIRED", "1") == "0":
        return "anon"
    if not x_session or store().get("s:" + _h(x_session)) is None:
        raise HTTPException(401, "लॉगिन ज़रूरी है।")
    return x_session


def limit_extract(token: str = Depends(require_session)) -> str:
    """फ़ोटो/PDF पढ़ना भारी काम है: हर session पर 10 मिनट में सीमित बार।"""
    if store().incr("ex:" + _h(token), 600) > int(os.getenv("MAX_EXTRACT_PER_10MIN", "20")):
        raise HTTPException(429, "बहुत ज़्यादा फ़ाइलें हो गईं। 10 मिनट बाद फिर कोशिश करें।")
    return token


def logout(token: str) -> None:
    store().delete("s:" + _h(token))
