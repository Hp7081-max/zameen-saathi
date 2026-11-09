"""IP के हिसाब से सीमा और proxy के पीछे असली IP की पहचान (HTTP सर्वर के बिना, असली starlette Request पर)।"""
import pytest
from starlette.exceptions import HTTPException
from starlette.requests import Request

from app import auth


def req(peer="10.0.0.9", xff=None) -> Request:
    headers = [(b"x-forwarded-for", xff.encode())] if xff is not None else []
    return Request({"type": "http", "method": "POST", "path": "/", "headers": headers, "client": (peer, 5000),
                    "query_string": b"", "scheme": "http", "server": ("t", 80)})


@pytest.fixture(autouse=True)
def fresh(monkeypatch):
    monkeypatch.setattr(auth, "_store", auth.MemoryStore())
    monkeypatch.delenv("TRUSTED_PROXY_HOPS", raising=False)


def test_without_trusted_proxy_forwarded_header_is_ignored(monkeypatch):
    # सर्वर सीधे इंटरनेट पर: client खुद X-Forwarded-For लिखकर सीमा से नहीं बच सकता
    assert auth.client_ip(req("1.2.3.4", xff="9.9.9.9")) == "1.2.3.4"


def test_one_trusted_proxy_uses_last_entry(monkeypatch):
    monkeypatch.setenv("TRUSTED_PROXY_HOPS", "1")
    # "6.6.6.6" client ने खुद लिखा (नकली); proxy ने असली पता अंत में जोड़ा
    assert auth.client_ip(req("10.0.0.1", xff="6.6.6.6, 203.0.113.7")) == "203.0.113.7"


def test_two_trusted_proxies(monkeypatch):
    monkeypatch.setenv("TRUSTED_PROXY_HOPS", "2")
    assert auth.client_ip(req("10.0.0.1", xff="6.6.6.6, 203.0.113.7, 10.0.0.2")) == "203.0.113.7"


def test_missing_or_short_header_falls_back_to_peer(monkeypatch):
    monkeypatch.setenv("TRUSTED_PROXY_HOPS", "2")
    assert auth.client_ip(req("10.0.0.1")) == "10.0.0.1"
    assert auth.client_ip(req("10.0.0.1", xff="203.0.113.7")) == "10.0.0.1"


def test_garbage_header_value_falls_back_to_peer(monkeypatch):
    monkeypatch.setenv("TRUSTED_PROXY_HOPS", "1")
    assert auth.client_ip(req("10.0.0.1", xff="not-an-ip")) == "10.0.0.1"


def test_ipv6_is_counted_per_64(monkeypatch):
    a = auth.client_ip(req("2001:db8:1:2:aaaa:bbbb:cccc:dddd"))
    b = auth.client_ip(req("2001:db8:1:2:1111:2222:3333:4444"))
    c = auth.client_ip(req("2001:db8:1:3::1"))
    assert a == b == "2001:db8:1:2::" and c != a


def _status(dep, request):
    try:
        dep(request)
    except HTTPException as e:
        return e.status_code, e
    return 200, None


def test_limit_blocks_after_cap_and_is_per_ip(monkeypatch):
    monkeypatch.setenv("MAX_OTP_PER_IP_10MIN", "3")
    codes = [_status(auth.limit_otp_ip, req("1.1.1.1"))[0] for _ in range(4)]
    assert codes == [200, 200, 200, 429]
    assert _status(auth.limit_otp_ip, req("2.2.2.2"))[0] == 200  # दूसरा IP अछूता


def test_limit_error_is_bilingual_with_retry_after(monkeypatch):
    monkeypatch.setenv("MAX_VERIFY_PER_IP_10MIN", "1")
    _status(auth.limit_verify_ip, req("3.3.3.3"))
    code, e = _status(auth.limit_verify_ip, req("3.3.3.3"))
    assert code == 429 and set(e.detail) == {"hi", "en"} and e.detail["hi"] != e.detail["en"]
    assert e.headers["Retry-After"] == "600"


def test_buckets_do_not_share_counts(monkeypatch):
    monkeypatch.setenv("MAX_OTP_PER_IP_10MIN", "1")
    monkeypatch.setenv("MAX_EXTRACT_PER_IP_10MIN", "1")
    assert _status(auth.limit_otp_ip, req("4.4.4.4"))[0] == 200
    assert _status(auth.limit_extract_ip, req("4.4.4.4"))[0] == 200


def test_zero_or_garbage_cap(monkeypatch):
    monkeypatch.setenv("MAX_OTP_PER_IP_10MIN", "0")  # 0 = सीमा बंद
    assert all(_status(auth.limit_otp_ip, req("5.5.5.5"))[0] == 200 for _ in range(50))
    monkeypatch.setenv("MAX_OTP_PER_IP_10MIN", "abc")  # गलत मान पर डिफ़ॉल्ट (30)
    assert _status(auth.limit_otp_ip, req("5.5.5.6"))[0] == 200


def test_ip_is_stored_only_as_hash(monkeypatch):
    _status(auth.limit_otp_ip, req("198.51.100.23"))
    assert not any("198.51.100.23" in k for k in auth.store()._d)


def test_auth_errors_are_bilingual():
    with pytest.raises(HTTPException) as e:
        auth.request_otp("9876543210", False)
    d = e.value.detail
    assert e.value.status_code == 400 and "सहमति" in d["hi"] and "Consent" in d["en"]
    with pytest.raises(HTTPException) as e:
        auth.require_session(x_session="fake")
    assert e.value.status_code == 401 and set(e.value.detail) == {"hi", "en"}
