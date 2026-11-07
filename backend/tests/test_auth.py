"""सहमति + OTP + session का लॉजिक सीधे (HTTP के बिना)। HTTPException Starlette का है; FastAPI का
HTTPException उसी का उपवर्ग है, इसलिए ये टेस्ट दोनों पर चलते हैं।"""
import pytest
from starlette.exceptions import HTTPException

from app import auth

PHONE = "9876543210"


@pytest.fixture(autouse=True)
def fresh(monkeypatch):
    monkeypatch.setenv("OTP_MODE", "demo")
    monkeypatch.setenv("AUTH_REQUIRED", "1")
    monkeypatch.delenv("SMS_PROVIDER", raising=False)
    monkeypatch.setattr(auth, "_store", auth.MemoryStore())  # हर टेस्ट को खाली store; टेस्ट ख़त्म होते ही पुराना लौट आता है


def _status(fn, *a, **k) -> int:
    with pytest.raises(HTTPException) as e:
        fn(*a, **k)
    return e.value.status_code


def _login() -> str:
    otp = auth.request_otp(PHONE, True)["debug_otp"]
    return auth.verify_otp(PHONE, otp)["token"]


def test_consent_is_required():
    assert _status(auth.request_otp, PHONE, False) == 400


@pytest.mark.parametrize("bad", ["12345", "5876543210", "98765abcde", ""])
def test_bad_phone_numbers(bad):
    assert _status(auth.request_otp, bad, True) == 400


def test_country_code_and_spaces_accepted():
    assert auth.request_otp("+91 98765 43210", True)["sent"]


@pytest.mark.parametrize("raw", ["9123456789", "91234-56789", "+919123456789", "919123456789", "09123456789"])
def test_phone_forms_normalise_to_same_ten_digits(raw):
    # 91 से शुरू होने वाला 10 अंकों का मोबाइल नंबर सही है; देश का कोड तभी हटना चाहिए जब नंबर लंबा हो
    assert auth._phone(raw) == "9123456789"


def test_full_flow_and_logout():
    t = _login()
    assert auth.require_session(x_session=t) == t
    auth.logout(t)
    assert _status(auth.require_session, x_session=t) == 401


def test_missing_or_fake_session_is_401():
    assert _status(auth.require_session, x_session=None) == 401
    assert _status(auth.require_session, x_session="fake") == 401


def test_auth_can_be_switched_off(monkeypatch):
    monkeypatch.setenv("AUTH_REQUIRED", "0")
    assert auth.require_session(x_session=None) == "anon"


def test_phone_and_otp_are_not_stored_in_clear():
    otp = auth.request_otp(PHONE, True)["debug_otp"]
    dump = repr(auth.store()._d)
    assert PHONE not in dump and otp not in dump


def test_otp_is_single_use():
    otp = auth.request_otp(PHONE, True)["debug_otp"]
    auth.verify_otp(PHONE, otp)
    assert _status(auth.verify_otp, PHONE, otp) == 400


def test_wrong_otp_locks_after_max_tries():
    auth.request_otp(PHONE, True)
    codes = [_status(auth.verify_otp, PHONE, "000000") for _ in range(auth.MAX_TRIES + 1)]
    assert codes[:-1] == [400] * auth.MAX_TRIES and codes[-1] == 429


def test_otp_request_rate_limit():
    for _ in range(3):
        auth.request_otp(PHONE, True)
    assert _status(auth.request_otp, PHONE, True) == 429


def test_otp_and_session_expire(monkeypatch):
    now = [1_000_000.0]
    monkeypatch.setattr(auth.time, "time", lambda: now[0])
    otp = auth.request_otp(PHONE, True)["debug_otp"]
    now[0] += auth.OTP_TTL + 1
    assert _status(auth.verify_otp, PHONE, otp) == 400
    now[0] += 1
    t = _login()
    now[0] += auth.SESSION_TTL + 1
    assert _status(auth.require_session, x_session=t) == 401


def test_sms_mode_without_provider_fails_loudly(monkeypatch):
    monkeypatch.setenv("OTP_MODE", "sms")
    assert _status(auth.request_otp, PHONE, True) == 501
