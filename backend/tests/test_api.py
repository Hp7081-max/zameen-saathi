import os

os.environ["AUTH_REQUIRED"] = "1"
os.environ["OTP_MODE"] = "demo"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

c = TestClient(app)
PHONE = "9876543210"


def _login(phone=PHONE):
    r = c.post("/api/consent/request", json={"phone": phone, "consent": True}).json()
    t = c.post("/api/consent/verify", json={"phone": phone, "otp": r["debug_otp"]}).json()["token"]
    return {"x-session": t}


def test_needs_login():
    assert c.post("/api/ask", json={"question": "x"}).status_code == 401


def test_consent_required():
    assert c.post("/api/consent/request", json={"phone": PHONE, "consent": False}).status_code == 400


def test_wrong_otp():
    c.post("/api/consent/request", json={"phone": "9000000001", "consent": True})
    assert c.post("/api/consent/verify", json={"phone": "9000000001", "otp": "000000"}).status_code in (400, 429)


def test_full_flow_and_logout():
    h = _login()
    rec = {"district": "t", "plots": [{"khasra": "1", "khata": "1", "area_ha": 1.0,
                                       "owners": [{"name": "A", "share": 0.6}]}]}
    r = c.post("/api/analyze", json=rec, headers=h).json()
    assert any(f["code"] == "SHARE_SUM" for f in r["flags"]) and r["plain_hi"]
    assert c.delete("/api/session", headers=h).json()["deleted"]
    assert c.post("/api/ask", json={"question": "x"}, headers=h).status_code == 401


def test_extract_accepts_pdf_and_rejects_the_rest():
    h = _login("9111111111")
    up = lambda name, data: c.post("/api/extract", files={"file": (name, data)}, headers=h)
    assert up("k.pdf", b"%PDF-1.4 x").status_code == 200  # डेमो OCR
    assert up("k.pdf", b"yeh pdf nahi hai").status_code == 415
    assert up("k.txt", b"x").status_code == 415


def test_phone_numbers_starting_with_91_are_valid():
    from fastapi import HTTPException

    from app.auth import _phone
    assert _phone("9111111111") == "9111111111"
    assert _phone("+919111111111") == "9111111111" and _phone("919111111111") == "9111111111"
    assert _phone("09876543210") == "9876543210"
    for bad in ("12345", "5876543210", "91111"):
        try:
            _phone(bad)
        except HTTPException:
            continue
        raise AssertionError(bad)
