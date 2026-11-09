import os

os.environ["AUTH_REQUIRED"] = "1"
os.environ["OTP_MODE"] = "demo"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

c = TestClient(app)
PHONE = "9876543210"


def _login(phone=PHONE):
    # हर टेस्ट अलग नंबर लेता है: OTP rate-limit (10 मिनट में 3) आपस में न टकराए
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


def test_extract_accepts_image_and_pdf(monkeypatch):
    monkeypatch.setenv("OCR_ENGINE", "demo")
    h = _login("9876500001")
    for name, data in [("a.png", b"x"), ("a.pdf", b"%PDF-1.4 x")]:
        r = c.post("/api/extract", files={"file": (name, data)}, headers=h)
        assert r.status_code == 200 and len(r.json()["plots"]) == 3


def test_extract_rejects_other_types_and_needs_login(monkeypatch):
    monkeypatch.setenv("OCR_ENGINE", "demo")
    h = _login("9876500002")
    assert c.post("/api/extract", files={"file": ("a.txt", b"x")}, headers=h).status_code == 415
    assert c.post("/api/extract", files={"file": ("a.png", b"x")}).status_code == 401


def test_errors_carry_both_languages():
    # सर्वर की त्रुटि {"hi","en"} होती है; frontend भाषा चुनकर दिखाता है
    r = c.post("/api/consent/request", json={"phone": PHONE, "consent": False})
    d = r.json()["detail"]
    assert r.status_code == 400 and d["hi"] and d["en"] and d["hi"] != d["en"]
    r = c.post("/api/ask", json={"question": "x"})
    d = r.json()["detail"]
    assert r.status_code == 401 and d["hi"] and d["en"]


def test_sample_village_needs_login_and_is_stable():
    assert c.get("/api/sample").status_code == 401
    h = _login("9876500003")
    hi = c.get("/api/sample?lang=hi", headers=h).json()
    en = c.get("/api/sample?lang=en", headers=h).json()
    assert len(hi["plots"]) >= 14 and len(hi["plots"]) == len(en["plots"])
    assert hi["plots"][0]["khasra"] == en["plots"][0]["khasra"]          # वही गाँव, बस नाम अलग लिपि में
    assert hi["plots"][0]["owners"][0]["name"] != en["plots"][0]["owners"][0]["name"]
    # नमूना गाँव पर हर तरह का संकेत मिलना चाहिए, वरना डेमो अधूरा दिखेगा
    flags = c.post("/api/analyze", json=en, headers=h).json()["flags"]
    assert {"SHARE_SUM", "OVERLAP"} <= {f["code"] for f in flags}


def test_ask_in_english_and_hindi():
    h = _login("9876500004")
    en = c.post("/api/ask", json={"question": "What is khasra?", "lang": "en"}, headers=h).json()
    assert en["lang"] == "en" and en["sources"] and en["title"] and en["related"]
    hi = c.post("/api/ask", json={"question": "खसरा क्या होता है?"}, headers=h).json()  # lang खाली: अपने-आप पहचान
    assert hi["lang"] == "hi" and hi["sources"]
    none = c.post("/api/ask", json={"question": "zzzz qqqq", "lang": "en"}, headers=h).json()
    assert none["sources"] == [] and none["related"]                      # पता न हो तो मनगढ़ंत जवाब नहीं


def test_topics_follow_language():
    h = _login("9876500005")
    hi = c.get("/api/topics?lang=hi", headers=h).json()
    en = c.get("/api/topics?lang=en", headers=h).json()
    assert hi["lang"] == "hi" and en["lang"] == "en" and len(hi["topics"]) >= 10
    assert all(t.endswith("?") for t in en["topics"]) and hi["topics"] != en["topics"]
