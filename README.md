# ज़मीन-साथी (Zameen-Saathi)

खतौनी/खसरा को सरल हिंदी में समझाने और "suspicious pattern" flag करने वाला टूल। फ़ैसला नहीं देता, सही जगह (तहसील/लेखपाल/वकील) तक पहुँचने में मदद करता है।

**Stack:** FastAPI (Python) + React/Vite/TypeScript. OCR (Tesseract), scikit-learn और आगे LLM सीधे Python में जुड़ते हैं।

## क्या-क्या है (v2)
- **सहमति + OTP + session** (`auth.py`): फ़ोन hash में, 30 मिनट का session, बाहर निकलते ही डेटा ख़त्म। डेमो में OTP स्क्रीन पर दिखता है।
- **Synthetic डेटा जनरेटर** (`synth.py`): गाँव का नक्शा, खतौनी, लेबल वाली 6 तरह की गड़बड़ियाँ, और स्कैन जैसी तस्वीरें (घूमना, धुंधलापन, शोर, छाया)।
- **ML** (`train.py`, `anomaly.py`): साफ़ प्लॉट पर IsolationForest train, लेबल वाले प्लॉट पर precision/recall मापन (`models/metrics.json`)।
- **OCR** (`ocr.py`): Tesseract hin+eng + parser। Synthetic स्कैन पर हमारे टेस्ट में fields सही पढ़े गए (असली खतौनी पर अभी नहीं जाँचा)।
- **Rules** (`rules.py`): हिस्सा, क्षेत्रफल, एक खसरा दो खाते, ज़्यादा transfers, मिलते नाम, नक्शे में ओवरलैप।
- **सरल हिंदी व्याख्या** (`explain.py`) और **grounded Q&A** (`qa.py`, `corpus/`)।
- **Frontend:** लॉगिन/सहमति, फ़ोटो अपलोड, हिस्से/क्षेत्रफल सुधारना, जाँच, 🔊 सुनना, 🎤 बोलकर पूछना, छापने लायक रिपोर्ट।
- **Docker** (`docker-compose.yml`), **CI** (`.github/workflows/ci.yml`)।

## चलाएँ
```bash
# तरीका 1: Docker (असली Tesseract के साथ)
docker compose up --build        # http://localhost:8080

# तरीका 2: हाथ से
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.synth --villages 200 && python -m app.train
uvicorn app.main:app --reload    # http://localhost:8000/docs
cd frontend && npm install && npm run dev   # http://localhost:5173
```
Tests: `cd backend && pytest -q`

Synthetic स्कैन बनाकर OCR आज़माने के लिए `python -m app.synth --villages 3 --images 3` चलाओ और `backend/data/synthetic/*.png` अपलोड करो (`OCR_ENGINE=tesseract` के साथ)।

**ज़रूरी:** अधूरा काम और अगले कदम `HANDOFF.md` में हैं।
