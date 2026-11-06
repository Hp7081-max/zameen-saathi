import asyncio
import os

from fastapi import Depends, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import auth, qa
from .anomaly import run_anomaly
from .explain import explain
from .ocr import get_engine, is_pdf
from .rules import run_rules
from .schemas import (AnalyzeResponse, AskRequest, AskResponse, OtpRequest, OtpResponse,
                      Record, SessionResponse, VerifyRequest)

app = FastAPI(title="Zameen-Saathi API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
MAX_BYTES = 10 * 1024 * 1024
ALLOWED_EXT = (".png", ".jpg", ".jpeg", ".webp", ".pdf")
authed = [Depends(auth.require_session)]


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/consent/request", response_model=OtpResponse)
def consent_request(req: OtpRequest):
    return auth.request_otp(req.phone, req.consent)


@app.post("/api/consent/verify", response_model=SessionResponse)
def consent_verify(req: VerifyRequest):
    return auth.verify_otp(req.phone, req.otp)


@app.delete("/api/session")
def end_session(token: str = Depends(auth.require_session)):
    auth.logout(token)  # कोई दस्तावेज़ disk पर सेव होता ही नहीं; session हटते ही सब ख़त्म
    return {"deleted": True}


@app.post("/api/extract", response_model=Record, dependencies=authed)
async def extract(file: UploadFile):
    name = (file.filename or "").lower()
    if not name.endswith(ALLOWED_EXT):
        raise HTTPException(415, "सिर्फ़ फ़ोटो (PNG/JPG) या PDF चलेगी।")
    data = await file.read()  # memory में ही process होता है
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "फ़ाइल 10 MB से छोटी रखें।")
    if name.endswith(".pdf") and not is_pdf(data):
        raise HTTPException(415, "यह असली PDF नहीं लगती।")
    try:  # OCR भारी काम है: अलग thread में, ताकि बाकी लोगों की requests न रुकें
        return await asyncio.to_thread(get_engine().extract, data, name)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@app.post("/api/analyze", response_model=AnalyzeResponse, dependencies=authed)
def analyze(rec: Record):
    order = ["high", "medium", "low"]
    rule_flags = run_rules(rec)
    ruled = {f.plot for f in rule_flags}  # ML सिर्फ़ उन प्लॉट को देखता है जिन्हें rules ने नहीं पकड़ा
    flags = sorted(rule_flags + run_anomaly(rec, skip=ruled), key=lambda f: order.index(f.severity))
    summary = f"{len(rec.plots)} प्लॉट मिले। {len(flags)} जगह दोबारा जाँचने की ज़रूरत है।"
    return AnalyzeResponse(summary_hi=summary, plain_hi=explain(rec), flags=flags)


@app.post("/api/ask", response_model=AskResponse, dependencies=authed)
def ask(req: AskRequest):
    return qa.answer(req.question)
