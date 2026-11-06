# ज़मीन-साथी (Zameen-Saathi)

खतौनी/खसरा को सरल हिंदी में समझाने और "suspicious pattern" flag करने वाला टूल। फ़ैसला नहीं देता, सही जगह (तहसील/लेखपाल/वकील) तक पहुँचने में मदद करता है।

**Stack:** FastAPI (Python) + React/Vite/TypeScript. OCR (Tesseract), scikit-learn और आगे LLM सीधे Python में जुड़ते हैं।

## क्या-क्या है (v2)
- **सहमति + OTP + session** (`auth.py`): फ़ोन और टोकन hash में, 30 मिनट का session, बाहर निकलते ही डेटा ख़त्म। OTP पर 10 मिनट में 3 कोशिश और 5 गलत जवाब की सीमा; फ़ोटो/PDF पढ़ने पर हर session की सीमा। `OTP_MODE=sms` में MSG91 या Twilio से असली SMS, और `REDIS_URL` हो तो session Redis में (कई instance के लिए)। डेमो में OTP स्क्रीन पर दिखता है।
- **Synthetic डेटा जनरेटर** (`synth.py`): गाँव का नक्शा, खतौनी, लेबल वाली 6 तरह की गड़बड़ियाँ, और स्कैन जैसी तस्वीरें (घूमना, धुंधलापन, शोर, छाया)।
- **ML** (`train.py`, `anomaly.py`): rules जिन हल्के संकेतों को नहीं पकड़ते (सीमा से नीचे का क्षेत्रफल-फ़र्क, एक नाम का कई खातों में आना) उन पर RandomForest, गाँव-स्तर के 13 फ़ीचर्स के साथ। ML सिर्फ़ उन प्लॉट को देखता है जिन्हें rules ने नहीं पकड़ा। बिना-लेबल IsolationForest से तुलना `models/metrics.json` में छपती है।
- **OCR + PDF** (`ocr.py`): फ़ोटो और PDF (8 पन्ने तक)। PDF की text-layer पहले, न मिले तो पन्ने को तस्वीर बनाकर Tesseract hin+eng (`pypdfium2`, सिस्टम पैकेज नहीं चाहिए)। Synthetic स्कैन पर हमारे टेस्ट में fields सही पढ़े गए (असली खतौनी पर अभी नहीं जाँचा)।
- **Rules** (`rules.py`): हिस्सा, क्षेत्रफल, एक खसरा दो खाते, ज़्यादा transfers, मिलते नाम, नक्शे में ओवरलैप।
- **सरल हिंदी/अंग्रेज़ी व्याख्या** (`explain.py`), **तहसील जाने की तैयारी** (`guide.py`: हर flag पर किससे मिलें, क्या ले जाएँ, क्या पूछें; सामान्य सुझाव, कानूनी सलाह नहीं) और **grounded Q&A** (`qa.py`, `corpus/`)।
- **OCR सटीकता नापना** (`ocr_eval.py`): फ़ोटो/PDF + सही उत्तर की JSON से खेत-दर-खेत अंक।
- **Frontend:** हिंदी/English बटन, लॉगिन/सहमति, फ़ोटो या PDF अपलोड, हिस्से/क्षेत्रफल सुधारना, जाँच, नक्शे में प्लॉट (रंग + ! निशान; तभी जब प्लॉट के साथ नक्शे की जगह `bbox` हो), तहसील चेकलिस्ट, 🔊 सुनना, 🎤 बोलकर पूछना, छापने लायक रिपोर्ट।
- **Docker** (`docker-compose.yml`), **CI** (`.github/workflows/ci.yml`)।

## चलाएँ
```bash
# तरीका 1: Docker (असली Tesseract के साथ)
docker compose up --build        # http://localhost:8080

# तरीका 2: हाथ से
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.synth --villages 400 --no-images && python -m app.train   # ~1 मिनट; metrics.json देखो
uvicorn app.main:app --reload    # http://localhost:8000/docs
cd frontend && npm install && npm run dev   # http://localhost:5173
```
Tests: `cd backend && pytest -q`

Synthetic स्कैन बनाकर OCR आज़माने के लिए `python -m app.synth --villages 3 --images 3` चलाओ और `backend/data/synthetic/*.png` अपलोड करो (`OCR_ENGINE=tesseract` के साथ)।

**OCR कितना सही पढ़ता है, नापो:**
```bash
python -m app.synth --villages 5 --images 5     # स्कैन जैसी फ़ोटो + सही उत्तर की JSON
python -m app.ocr_eval --dir data/synthetic     # खेत-दर-खेत अंक
```
असली सहमति वाले नमूनों के लिए: फ़ोटो/PDF के पास उसी नाम की `.json` रखो (`{"plots": [...]}` जैसा synthetic में है) और वही कमांड चलाओ।

**असली SMS चालू करना:** `.env.example` देखो। `OTP_MODE=sms`, `AUTH_SALT` बदलो, और `SMS_PROVIDER` के हिसाब से keys भरो। भारत में SMS के लिए DLT-मंज़ूर टेम्पलेट चाहिए। दोनों provider का कोड दस्तावेज़ों के हिसाब से लिखा है, असली keys से अभी नहीं परखा।

**ML के अंकों पर भरोसा मत करो:** लेबल हमने खुद डाले हैं, इसलिए अंक असली दुनिया के नहीं हैं। असली, सहमति वाले नमूनों पर जाँच `HANDOFF.md` में बाकी है।

**ज़रूरी:** अधूरा काम और अगले कदम `HANDOFF.md` में हैं।
