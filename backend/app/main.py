import os

from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import qa
from .anomaly import run_anomaly
from .ocr import get_engine
from .rules import run_rules
from .schemas import AnalyzeResponse, AskRequest, AskResponse, Record

app = FastAPI(title="Zameen-Saathi API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/extract", response_model=Record)
async def extract(file: UploadFile):
    data = await file.read()  # memory me hi process hota hai, disk par save nahi
    return get_engine().extract(data, file.filename or "")


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(rec: Record):
    flags = run_rules(rec) + run_anomaly(rec)
    summary = f"{len(rec.plots)} प्लॉट मिले। {len(flags)} जगह दोबारा जाँचने की ज़रूरत है।"
    return AnalyzeResponse(summary_hi=summary, flags=flags)


@app.post("/api/ask", response_model=AskResponse)
def ask(req: AskRequest):
    return qa.answer(req.question)
