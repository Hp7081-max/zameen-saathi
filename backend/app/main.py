import os

from fastapi import Depends, FastAPI, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from . import auth, qa, service
from .schemas import (AnalyzeResponse, AskRequest, AskResponse, OtpRequest, OtpResponse,
                      Record, SessionResponse, TopicsResponse, VerifyRequest)

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
    return auth.verify_otp(req.phone, req.otp)


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
        return await run_in_threadpool(service.extract_document, data, file.filename or "")
    except service.DocError as e:
        raise HTTPException(e.status, e.detail)  # {"hi": ..., "en": ...}


@app.get("/api/sample", response_model=Record, dependencies=authed)
def sample(lang: str = Query("hi", pattern="^(hi|en)$")):
    """आज़माने के लिए काल्पनिक गाँव (असली खतौनी न हो तब भी पूरा अनुभव देखने के लिए)।"""
    return service.sample_record(lang)


@app.post("/api/analyze", response_model=AnalyzeResponse, dependencies=authed)
def analyze(rec: Record):
    return service.analyze_record(rec)


@app.post("/api/ask", response_model=AskResponse, dependencies=authed)
def ask(req: AskRequest):
    return qa.answer(req.question, req.lang)


@app.get("/api/topics", response_model=TopicsResponse, dependencies=authed)
def topics(lang: str = Query("hi", pattern="^(hi|en)$")):
    return qa.topics(lang)
