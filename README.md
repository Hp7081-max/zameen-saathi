# Zameen-Saathi

Khatauni/khasra ko saral Hindi me samjhane aur "suspicious pattern" flag karne wala tool. Verdict nahi deta, sahi jagah tak pahunchne me madad karta hai.

**Stack:** FastAPI (Python) backend + React/Vite/TypeScript frontend. Python me hone se OCR, scikit-learn aur LLM sab seedha jud jaate hain.

## Chalane ka tarika
```bash
# backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload          # http://localhost:8000/docs

# frontend (naye terminal me)
cd frontend && npm install && npm run dev   # http://localhost:5173
```
Tests: `cd backend && pytest -q`

## Structure
- `backend/app/ocr.py`: OCR adapter. Abhi demo record deta hai, asli engine yahin judega.
- `backend/app/rules.py`: pakke checks (hissa, area, ek khasra do khate, transfers, milte naam).
- `backend/app/anomaly.py`: IsolationForest. Baseline abhi synthetic hai.
- `backend/app/qa.py` + `corpus/`: grounded Q&A. Sirf asli kanooni `.txt` se jawab, nahi mila to "pata nahi".
- `frontend/src`: upload, extracted values sudharna, flags, Q&A.

## Aage ka roadmap
1. Synthetic data generator (naksha + khatauni + suspicious cases) aur `data/` folder.
2. OCR: PaddleOCR / Tesseract-hin, field-wise accuracy napna.
3. `corpus/` me UP Revenue Code ka asli text, phir embeddings + LLM.
4. Consent/OTP, data delete, WhatsApp/voice interface.

## GitHub par daalna
```bash
git remote add origin https://github.com/<username>/zameen-saathi.git
git branch -M main
git push -u origin main
```

## Render par deploy
- Backend: Web Service, Root Directory `backend`, Build `pip install -r requirements.txt`, Start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, env `PYTHON_VERSION=3.12.3`, `CORS_ORIGINS=<frontend url>`.
- Frontend: Static Site, Root Directory `frontend`, Build `npm install && npm run build`, Publish `dist`, env `VITE_API_URL=<backend url>`.
