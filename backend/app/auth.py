"""सहमति + OTP + session। फ़ोन सिर्फ़ hash में रखा जाता है। सब कुछ memory में है:
production में Redis लगाओ और send_sms में असली provider (MSG91/Twilio) जोड़ो।"""
import hashlib
import hmac
import os
import re
import secrets
import time

from fastapi import Header, HTTPException

OTP_TTL, SESSION_TTL, MAX_TRIES = 300, 1800, 5
_otps: dict[str, list] = {}       # phone_hash -> [otp_hash, expires, tries]
_sessions: dict[str, float] = {}  # token -> expires
_requests: dict[str, list[float]] = {}


def _h(s: str) -> str:
    return hashlib.sha256((os.getenv("AUTH_SALT", "dev-salt") + s).encode()).hexdigest()


def _purge() -> None:
    now = time.time()
    for k in [k for k, v in _otps.items() if v[1] < now]:
        del _otps[k]
    for k in [k for k, v in _sessions.items() if v < now]:
        del _sessions[k]


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


def send_sms(phone: str, otp: str) -> None:
    raise HTTPException(501, "SMS provider अभी जुड़ा नहीं है (OTP_MODE=demo इस्तेमाल करें)।")


def request_otp(phone: str, consent: bool) -> dict:
    if not consent:
        raise HTTPException(400, "आगे बढ़ने के लिए सहमति ज़रूरी है।")
    _purge()
    clean = _phone(phone)
    ph, now = _h(clean), time.time()
    recent = [t for t in _requests.get(ph, []) if now - t < 600]
    if len(recent) >= 3:
        raise HTTPException(429, "बहुत बार कोशिश हुई। 10 मिनट बाद फिर करें।")
    _requests[ph] = recent + [now]
    otp = f"{secrets.randbelow(10**6):06d}"
    _otps[ph] = [_h(otp), now + OTP_TTL, 0]
    if os.getenv("OTP_MODE", "demo") == "demo":
        return {"sent": True, "debug_otp": otp}
    send_sms(clean, otp)
    return {"sent": True}


def verify_otp(phone: str, otp: str) -> dict:
    _purge()
    ph = _h(_phone(phone))
    entry = _otps.get(ph)
    if not entry:
        raise HTTPException(400, "OTP की समय सीमा खत्म हो गई। दोबारा भेजें।")
    entry[2] += 1
    if entry[2] > MAX_TRIES:
        del _otps[ph]
        raise HTTPException(429, "बहुत गलत OTP। नया OTP मँगवाएँ।")
    if not hmac.compare_digest(entry[0], _h(otp.strip())):
        raise HTTPException(400, "OTP गलत है।")
    del _otps[ph]
    token = secrets.token_urlsafe(32)
    _sessions[token] = time.time() + SESSION_TTL
    return {"token": token, "expires_in": SESSION_TTL}


def require_session(x_session: str | None = Header(default=None)) -> str:
    if os.getenv("AUTH_REQUIRED", "1") == "0":
        return "anon"
    _purge()
    if not x_session or x_session not in _sessions:
        raise HTTPException(401, "लॉगिन ज़रूरी है।")
    return x_session


def logout(token: str) -> None:
    _sessions.pop(token, None)
