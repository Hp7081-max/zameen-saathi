"""सहमति + OTP + session। फ़ोन और टोकन सिर्फ़ hash के रूप में रखे जाते हैं।
Store: डिफ़ॉल्ट memory (एक instance); REDIS_URL हो तो Redis (कई instance)।
SMS: OTP_MODE=demo (OTP जवाब में दिखता है, सिर्फ़ डेमो के लिए) या OTP_MODE=sms + SMS_PROVIDER=msg91|twilio।
सीमाएँ: हर फ़ोन/session पर (नीचे request_otp, verify_otp, limit_extract) और हर IP पर (`ip_limit`)।
IP गिनती सिर्फ़ hash के रूप में रखी जाती है। सर्वर proxy के पीछे हो (Render, nginx) तो TRUSTED_PROXY_HOPS रखो।"""
import base64
import hashlib
import hmac
import ipaddress
import json
import os
import re
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request

from fastapi import Depends, Header, HTTPException, Request

from .messages import Msg

OTP_TTL, SESSION_TTL, MAX_TRIES = 300, 1800, 5
DEFAULT_SALT = "dev-salt"
SMS_FAILED = Msg("SMS भेज नहीं पाए। थोड़ी देर बाद कोशिश करें।", "Could not send the SMS. Try again shortly.")


def _err(status: int, msg: Msg, retry: int | None = None) -> HTTPException:
    """HTTP त्रुटि; detail = {"hi", "en"} ताकि frontend अपनी चुनी भाषा दिखा सके।"""
    return HTTPException(status, msg.detail(), headers={"Retry-After": str(retry)} if retry else None)


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
        raise RuntimeError("OTP_MODE 'demo' या 'sms' होना चाहिए। / OTP_MODE must be 'demo' or 'sms'.")
    if os.getenv("AUTH_SALT", DEFAULT_SALT) == DEFAULT_SALT:
        raise RuntimeError("OTP_MODE=sms में AUTH_SALT बदलना ज़रूरी है। / Change AUTH_SALT when OTP_MODE=sms.")
    if os.getenv("SMS_PROVIDER", "") not in ("msg91", "twilio"):
        raise RuntimeError("SMS_PROVIDER 'msg91' या 'twilio' रखें। / Set SMS_PROVIDER to 'msg91' or 'twilio'.")


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
        raise _err(400, Msg("सही 10 अंकों का मोबाइल नंबर डालें।", "Enter a valid 10-digit mobile number."))
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
            raise _err(501, Msg("SMS provider जुड़ा नहीं है।", "No SMS provider is connected."))
    except KeyError as e:
        raise _err(503, Msg(f"SMS की सेटिंग अधूरी है: {e.args[0]}", f"SMS settings are incomplete: {e.args[0]}"))
    except (urllib.error.URLError, TimeoutError, OSError):
        raise _err(502, SMS_FAILED)
    if status >= 300:
        raise _err(502, SMS_FAILED)


def request_otp(phone: str, consent: bool) -> dict:
    if not consent:
        raise _err(400, Msg("आगे बढ़ने के लिए सहमति ज़रूरी है।", "Consent is needed to continue."))
    clean = _phone(phone)
    ph = _h(clean)
    if store().incr("rq:" + ph, 600) > 3:
        raise _err(429, Msg("बहुत बार कोशिश हुई। 10 मिनट बाद फिर करें।", "Too many attempts. Try again in 10 minutes."), retry=600)
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
        raise _err(400, Msg("OTP की समय सीमा खत्म हो गई। दोबारा भेजें।", "The OTP has expired. Send a new one."))
    e = json.loads(raw)
    e["t"] += 1
    if e["t"] > MAX_TRIES:
        store().delete("otp:" + ph)
        raise _err(429, Msg("बहुत गलत OTP। नया OTP मँगवाएँ।", "Too many wrong OTPs. Request a new one."))
    if not hmac.compare_digest(e["h"], _h(otp.strip())):
        store().set("otp:" + ph, json.dumps(e), OTP_TTL)
        raise _err(400, Msg("OTP गलत है।", "The OTP is wrong."))
    store().delete("otp:" + ph)
    token = secrets.token_urlsafe(32)
    store().set("s:" + _h(token), "1", SESSION_TTL)
    return {"token": token, "expires_in": SESSION_TTL}


def require_session(x_session: str | None = Header(default=None)) -> str:
    if os.getenv("AUTH_REQUIRED", "1") == "0":
        return "anon"
    if not x_session or store().get("s:" + _h(x_session)) is None:
        raise _err(401, Msg("लॉगिन ज़रूरी है।", "Please sign in."))
    return x_session


def limit_extract(token: str = Depends(require_session)) -> str:
    """फ़ोटो/PDF पढ़ना भारी काम है: हर session पर 10 मिनट में सीमित बार।"""
    if store().incr("ex:" + _h(token), 600) > int(os.getenv("MAX_EXTRACT_PER_10MIN", "20")):
        raise _err(429, Msg("बहुत ज़्यादा फ़ाइलें हो गईं। 10 मिनट बाद फिर कोशिश करें।",
                            "Too many files. Try again in 10 minutes."), retry=600)
    return token


def logout(token: str) -> None:
    store().delete("s:" + _h(token))


# ---------- IP के हिसाब से सीमा ----------
def client_ip(request: Request) -> str:
    """असली client का IP। X-Forwarded-For पर तभी भरोसा जब TRUSTED_PROXY_HOPS > 0 (यानी सर्वर अपने proxy के पीछे है):
    हर भरोसेमंद proxy अपने सामने वाले का IP सूची के अंत में जोड़ता है, इसलिए असली client अंत से `hops`-वाँ है;
    उससे बाईं तरफ़ का सब कुछ client का लिखा हो सकता है (नकली), उसे नहीं मानते।
    IPv6 में पूरा /64 एक गिना जाता है, वरना हर नए पते से सीमा लाँघी जा सकती है।"""
    peer = request.client.host if request.client else "unknown"
    try:
        hops = max(0, int(os.getenv("TRUSTED_PROXY_HOPS", "0")))
    except ValueError:
        hops = 0
    ip = peer
    if hops:
        parts = [x.strip() for x in request.headers.get("x-forwarded-for", "").split(",") if x.strip()]
        if len(parts) >= hops:
            ip = parts[-hops]
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return peer  # गलत/नकली मान: असली TCP पते पर लौटो
    if addr.version == 6:
        return str(ipaddress.ip_network(f"{addr}/64", strict=False).network_address)
    return str(addr)


def ip_limit(bucket: str, env: str, default: int, window: int = 600):
    """FastAPI dependency बनाता है: हर IP पर `window` सेकंड में `default` (या env) से ज़्यादा अनुरोध नहीं।
    सीमा उदार रखी है: एक CSC/साइबर कैफ़े के कई लोग एक ही IP से आ सकते हैं।"""
    def dep(request: Request) -> None:
        try:
            cap = int(os.getenv(env, str(default)))
        except ValueError:
            cap = default
        if cap > 0 and store().incr(f"ip:{bucket}:{_h(client_ip(request))}", window) > cap:
            raise _err(429, Msg("इस नेटवर्क से बहुत ज़्यादा अनुरोध आए। थोड़ी देर बाद फिर कोशिश करें।",
                                "Too many requests from this network. Try again shortly."), retry=window)
    dep.__name__ = f"ip_limit_{bucket}"
    return dep


limit_otp_ip = ip_limit("otp", "MAX_OTP_PER_IP_10MIN", 30)
limit_verify_ip = ip_limit("verify", "MAX_VERIFY_PER_IP_10MIN", 60)
limit_extract_ip = ip_limit("extract", "MAX_EXTRACT_PER_IP_10MIN", 100)
