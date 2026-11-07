# ज़मीन-साथी (Zameen-Saathi)

खतौनी/खसरा को सरल हिंदी में समझाने और "suspicious pattern" flag करने वाला टूल। फ़ैसला नहीं देता, सही जगह (तहसील/लेखपाल/वकील) तक पहुँचने में मदद करता है।

**Stack:** FastAPI (Python) + React/Vite/TypeScript. OCR (Tesseract), scikit-learn और आगे LLM सीधे Python में जुड़ते हैं।

## क्या-क्या है (v3)
- **सहमति + OTP + session** (`auth.py`): फ़ोन hash में, 30 मिनट का session, बाहर निकलते ही डेटा ख़त्म। डेमो में OTP स्क्रीन पर दिखता है।
- **Synthetic डेटा जनरेटर** (`synth.py`): गाँव का नक्शा, खतौनी, नियम-वाली 6 तरह की गड़बड़ियाँ + 2 संदर्भ-वाली (एक नाम कई खातों में, छोटा प्लॉट कई टुकड़ों में), और स्कैन जैसी तस्वीरें (अंग्रेज़ी या देवनागरी; घूमना, धुंधलापन, शोर, छाया)।
- **ML** (`features.py`, `train.py`, `anomaly.py`): गाँव-स्तर के फ़ीचर + RandomForest, उन पैटर्न पर जो नियम नहीं पकड़ते। पुराने IsolationForest और सिर्फ़-नियम से तुलना `models/metrics.json` में। **सब synthetic पर है; असली खतौनी पर भरोसा अभी साबित नहीं।** `models/` न मिले तो पहली request पर कुछ सेकंड में खुद train हो जाता है।
- **OCR** (`ocr.py`, `pdf.py`): फ़ोटो और **PDF** (कई पन्ने, अधिकतम 8)। Tesseract पहले `hin`, confidence कम हो तो `eng`, जिसकी confidence ज़्यादा वह चुना जाता है। Synthetic स्कैन पर fields सही पढ़े गए (असली खतौनी पर अभी नहीं जाँचा)।
- **Rules** (`rules.py`): हिस्सा, क्षेत्रफल, एक खसरा दो खाते, ज़्यादा transfers, मिलते नाम, नक्शे में ओवरलैप।
- **सरल हिंदी व्याख्या** (`explain.py`) और **grounded Q&A** (`qa.py`, `corpus/`)।
- **Frontend:** लॉगिन/सहमति, फ़ोटो या PDF अपलोड, हिस्से/क्षेत्रफल सुधारना, जाँच, 🔊 सुनना, 🎤 बोलकर पूछना, छापने लायक रिपोर्ट।
- **Docker** (`docker-compose.yml`), **CI** (`.github/workflows/ci.yml`)।

## चलाएँ
```bash
# तरीका 1: Docker (असली Tesseract के साथ)
docker compose up --build        # http://localhost:8080

# तरीका 2: हाथ से
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.train                # (वैकल्पिक) मॉडल पहले से बना लो
uvicorn app.main:app --reload    # http://localhost:8000/docs
cd frontend && npm install && npm run dev   # http://localhost:5173
```
Tests: `cd backend && pytest -q` (OCR वाले टेस्ट के लिए `tesseract-ocr tesseract-ocr-hin fonts-noto-core` चाहिए, वरना वे skip होते हैं)

**Render (सादा Python, Docker नहीं):** Build Command में `pip install -r requirements.txt && python -m app.train` रखो, ताकि पहली request धीमी न हो। वहाँ Tesseract नहीं होता, इसलिए `OCR_ENGINE=demo` ही चलेगा।

Synthetic स्कैन बनाकर OCR आज़माने के लिए `python -m app.synth --villages 3 --images 3` चलाओ और `backend/data/synthetic/*.png` अपलोड करो (`OCR_ENGINE=tesseract` के साथ)।

**ज़रूरी:** क्या जाँचा गया, क्या नहीं, और अगले कदम `PENDING.md` में हैं (`HANDOFF.md` पिछले सत्र की पुरानी स्थिति है)।
