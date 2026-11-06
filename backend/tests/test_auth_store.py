import contextlib
import json
import os
import urllib.error

import pytest
from fastapi import HTTPException

import app.auth as auth


@contextlib.contextmanager
def env(**kw):
    old = {k: os.environ.get(k) for k in kw}
    os.environ.update({k: v for k, v in kw.items() if v is not None})
    for k, v in kw.items():
        if v is None:
            os.environ.pop(k, None)
    try:
        yield
    finally:
        for k, v in old.items():
            os.environ.pop(k, None) if v is None else os.environ.__setitem__(k, v)


def fresh():
    auth._store = auth.MemoryStore()


def login(phone="9876543210"):
    otp = auth.request_otp(phone, True)["debug_otp"]
    return auth.verify_otp(phone, otp)["token"]


def code(fn, *a):
    try:
        fn(*a)
    except HTTPException as e:
        return e.status_code
    return 200


def test_session_is_stored_hashed_and_logout_removes_it():
    fresh()
    with env(OTP_MODE="demo", AUTH_REQUIRED="1"):
        tok = login()
        assert auth.require_session(tok) == tok
        assert tok not in "".join(auth.store()._d)  # असली टोकन कहीं सेव नहीं
        auth.logout(tok)
        assert code(auth.require_session, tok) == 401


def test_wrong_otp_locks_after_five_tries():
    fresh()
    with env(OTP_MODE="demo"):
        auth.request_otp("9876543210", True)
        codes = [code(auth.verify_otp, "9876543210", "000000") for _ in range(6)]
        assert codes[:5] == [400] * 5 and codes[5] == 429


def test_otp_request_limit_is_three_per_window():
    fresh()
    with env(OTP_MODE="demo"):
        codes = [code(auth.request_otp, "9876543210", True) for _ in range(4)]
        assert codes == [200, 200, 200, 429]


def test_extract_limit_per_session():
    fresh()
    with env(OTP_MODE="demo", AUTH_REQUIRED="1", MAX_EXTRACT_PER_10MIN="2"):
        tok = login()
        assert [code(auth.limit_extract, tok) for _ in range(3)] == [200, 200, 429]


def test_sms_mode_refuses_weak_config():
    with env(OTP_MODE="sms", AUTH_SALT=None, SMS_PROVIDER="msg91"):
        with pytest.raises(RuntimeError):
            auth.check_config()
    with env(OTP_MODE="sms", AUTH_SALT="kuch-lamba-aur-gupt", SMS_PROVIDER=None):
        with pytest.raises(RuntimeError):
            auth.check_config()
    with env(OTP_MODE="sms", AUTH_SALT="kuch-lamba-aur-gupt", SMS_PROVIDER="twilio"):
        auth.check_config()


def test_msg91_request_shape():
    sent = []
    old = auth.SMS_TRANSPORT
    auth.SMS_TRANSPORT = lambda url, data=None, headers=None, timeout=10: sent.append((url, data, headers)) or (200, b'{"type":"success"}')
    try:
        with env(SMS_PROVIDER="msg91", MSG91_AUTHKEY="K", MSG91_TEMPLATE_ID="T"):
            auth.send_sms("9876543210", "123456")
    finally:
        auth.SMS_TRANSPORT = old
    url, _, headers = sent[0]
    assert url.startswith("https://control.msg91.com/api/v5/otp?") and "mobile=919876543210" in url and "otp=123456" in url
    assert headers["authkey"] == "K" and "authkey" not in url


def test_twilio_request_shape():
    sent = []
    old = auth.SMS_TRANSPORT
    auth.SMS_TRANSPORT = lambda url, data=None, headers=None, timeout=10: sent.append((url, data, headers)) or (201, b"{}")
    try:
        with env(SMS_PROVIDER="twilio", TWILIO_SID="AC1", TWILIO_TOKEN="tok", TWILIO_FROM="+1555"):
            auth.send_sms("9876543210", "123456")
    finally:
        auth.SMS_TRANSPORT = old
    url, data, headers = sent[0]
    assert url.endswith("/Accounts/AC1/Messages.json") and b"%2B919876543210" in data and headers["Authorization"].startswith("Basic ")


def test_sms_failure_returns_502_and_leaves_no_otp():
    fresh()

    def boom(*a, **k):
        raise urllib.error.URLError("down")
    old = auth.SMS_TRANSPORT
    auth.SMS_TRANSPORT = boom
    try:
        with env(OTP_MODE="sms", SMS_PROVIDER="twilio", TWILIO_SID="a", TWILIO_TOKEN="b", TWILIO_FROM="c"):
            assert code(auth.request_otp, "9876543210", True) == 502
    finally:
        auth.SMS_TRANSPORT = old
    assert not auth.store()._d.get("otp:" + auth._h("9876543210"))


def test_redis_store_flow_with_fake_client():
    """असली Redis यहाँ नहीं है; नकली client से सिर्फ़ हमारा wrapper (get/set/delete/incr) परखा जाता है।"""
    import sys
    import types

    class FakeRedis:
        def __init__(self):
            self.d = {}

        @classmethod
        def from_url(cls, url, decode_responses=False):
            return cls()

        def get(self, k):
            return self.d.get(k)

        def set(self, k, v, ex=None):
            self.d[k] = str(v)

        def delete(self, k):
            self.d.pop(k, None)

        def incr(self, k):
            self.d[k] = str(int(self.d.get(k, 0)) + 1)
            return int(self.d[k])

        def expire(self, k, t):
            pass

    sys.modules["redis"] = types.SimpleNamespace(Redis=FakeRedis)
    try:
        auth._store = auth.RedisStore("redis://x")
        with env(OTP_MODE="demo", AUTH_REQUIRED="1"):
            tok = login()
            assert auth.require_session(tok) == tok
            auth.logout(tok)
            assert code(auth.require_session, tok) == 401
            assert [code(auth.request_otp, "9876543210", True) for _ in range(3)] == [200, 200, 429]  # login() की 1 गिनती पहले जुड़ चुकी है, यानी कुल 3 की सीमा
    finally:
        sys.modules.pop("redis", None)
        fresh()
