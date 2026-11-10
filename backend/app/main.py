import os

from fastapi import Depends, FastAPI, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from . import auth, contact, qa, service, stats
from .schemas import (AnalyzeResponse, AskRequest, AskResponse, ContactRequest, ContactResponse, OtpRequest,
                      OtpResponse, Record, SessionResponse, StatsResponse, TopicsResponse, VerifyRequest)

app = FastAPI(title="Zameen-Saathi API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
authed = [Depends(auth.require_session)]
auth.check_config()  # कमज़ोर सेटिंग के साथ SMS मोड में सर्वर शुरू ही न हो


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/consent/request", response_model=OtpResponse, dependencies=[Depends(auth.limit_otp_ip)])
def consent_request(req: OtpRequest):
    return auth.request_otp(req.phone, req.consent)


@app.post("/api/consent/verify", response_model=SessionResponse, dependencies=[Depends(auth.limit_verify_ip)])
def consent_verify(req: VerifyRequest):
    sess = auth.verify_otp(req.phone, req.otp)
    stats.bump(logins=1)  # सिर्फ़ गिनती; फ़ोन कहीं दर्ज नहीं
    return sess


@app.delete("/api/session")
def end_session(token: str = Depends(auth.require_session)):
    auth.logout(token)  # कोई दस्तावेज़ disk पर सेव होता ही नहीं; session हटते ही सब ख़त्म
    return {"deleted": True}


@app.post("/api/extract", response_model=Record,
          dependencies=[Depends(auth.limit_extract_ip), Depends(auth.limit_extract)])  # पहले सस्ती IP-जाँच, फिर session
async def extract(file: UploadFile):
    data = await file.read(service.MAX_BYTES + 1)  # memory में ही; सीमा से एक बाइट ज़्यादा पढ़ते हैं ताकि बड़ी फ़ाइल पकड़ी जाए
    try:
        # OCR धीमा और CPU-भारी है (PDF में कई पन्ने): थ्रेड में चलाते हैं ताकि बाकी अनुरोध न अटकें
        rec = await run_in_threadpool(service.extract_document, data, file.filename or "")
    except service.DocError as e:
        raise HTTPException(e.status, e.detail)  # {"hi": ..., "en": ...}
    stats.bump(files_read=1, plots_read=len(rec.plots))
    return rec


@app.get("/api/sample", response_model=Record, dependencies=authed)
def sample(lang: str = Query("hi", pattern="^(hi|en)$")):
    """आज़माने के लिए काल्पनिक गाँव (असली खतौनी न हो तब भी पूरा अनुभव देखने के लिए)।"""
    return service.sample_record(lang)


@app.post("/api/analyze", response_model=AnalyzeResponse, dependencies=authed)
def analyze(rec: Record, demo: bool = Query(False)):
    res = service.analyze_record(rec)
    if not demo:  # नमूना गाँव की जाँच "लाइव असर" की गिनती नहीं बढ़ाती
        stats.bump(analyses=1, flags_found=len(res.flags), flags_high=sum(1 for f in res.flags if f.severity == "high"))
    return res


@app.post("/api/ask", response_model=AskResponse, dependencies=authed)
def ask(req: AskRequest):
    return qa.answer(req.question, req.lang)


@app.get("/api/topics", response_model=TopicsResponse, dependencies=authed)
def topics(lang: str = Query("hi", pattern="^(hi|en)$")):
    return qa.topics(lang)


# ---------- v6: होम पन्ने की गिनतियाँ, संपर्क फ़ॉर्म ----------
@app.get("/api/stats", response_model=StatsResponse, dependencies=[Depends(auth.limit_stats_ip)])
def public_stats():
    """खुली, अनाम गिनतियाँ (लॉगिन नहीं चाहिए): होम पन्ने का "लाइव असर"।"""
    return stats.snapshot()


@app.post("/api/contact", response_model=ContactResponse, dependencies=[Depends(auth.limit_contact_ip)])
def send_contact(req: ContactRequest):
    try:
        entry = contact.clean(req.name, req.contact, req.message, req.kind, req.website)
        if entry is not None:  # None = छिपा खाना भरा था (बॉट): सफल जैसा जवाब, पर कुछ सेव नहीं
            contact.save(entry)
    except contact.ContactError as e:
        raise HTTPException(e.status, e.args[0].detail())
    return {"ok": True}


@app.get("/api/admin/contact")
def admin_contact(x_admin_token: str | None = Header(default=None), limit: int = Query(200, ge=1, le=1000)):
    """संदेश पढ़ने के लिए (मालिक का)। `ADMIN_TOKEN` तय न हो तो यह रास्ता है ही नहीं (404)।"""
    if not contact.admin_enabled():
        raise HTTPException(404, "Not found")
    if not contact.admin_ok(x_admin_token):
        raise HTTPException(403, "Forbidden")
    return {"messages": contact.read_all(limit)}
