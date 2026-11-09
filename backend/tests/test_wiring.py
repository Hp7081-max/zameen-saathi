"""main.py की वायरिंग: कौन-सा route किस सीमा/लॉगिन के पीछे है, और त्रुटि दो भाषाओं में।
असली FastAPI के बिना नहीं चलता (test_api.py जैसा नहीं: यह सिर्फ़ route-सूची और endpoint फ़ंक्शन परखता है)।
असली FastAPI मौजूद हो तो route की `dependencies` सूची से जाँचते हैं, वरना stand-in की सूची से।"""
import asyncio
import os

import pytest

os.environ.setdefault("AUTH_REQUIRED", "1")
os.environ.setdefault("OTP_MODE", "demo")
fastapi = pytest.importorskip("fastapi")

from app import auth, main, service  # noqa: E402
from app.schemas import AskRequest  # noqa: E402


def _routes():
    app = main.app
    if hasattr(app, "routes") and isinstance(app.routes, dict):  # stand-in
        return {(m, p): kw for (m, p), (_, kw) in app.routes.items()}
    return {}


@pytest.mark.skipif(not _routes(), reason="route-सूची सिर्फ़ stand-in/सरल app पर पढ़ी जा सकती है")
def test_expected_routes_and_dependencies():
    r = _routes()
    for key in [("POST", "/api/consent/request"), ("POST", "/api/consent/verify"), ("POST", "/api/extract"),
                ("POST", "/api/analyze"), ("POST", "/api/ask"), ("GET", "/api/sample"), ("GET", "/api/topics"),
                ("DELETE", "/api/session"), ("GET", "/api/health")]:
        assert key in r, key

    def deps(key):
        return [d.dependency for d in r[key].get("dependencies", [])]
    assert auth.limit_otp_ip in deps(("POST", "/api/consent/request"))
    assert auth.limit_verify_ip in deps(("POST", "/api/consent/verify"))
    ex = deps(("POST", "/api/extract"))
    assert ex == [auth.limit_extract_ip, auth.limit_extract]  # पहले IP, फिर session
    for key in [("POST", "/api/analyze"), ("POST", "/api/ask"), ("GET", "/api/sample"), ("GET", "/api/topics")]:
        assert auth.require_session in deps(key), key


def test_sample_and_topics_endpoints():
    rec = main.sample("hi")
    assert len(rec.plots) >= service.SAMPLE_PLOTS
    assert main.topics("en").lang == "en"
    assert main.ask(AskRequest(question="khatauni kya hai", lang="hi")).lang == "hi"


def test_extract_error_detail_is_bilingual():
    class F:
        filename = "notes.txt"

        async def read(self, n=-1):
            return b"hello"
    with pytest.raises(fastapi.HTTPException) as e:
        asyncio.run(main.extract(F()))
    assert e.value.status_code == 415 and set(e.value.detail) == {"hi", "en"}
