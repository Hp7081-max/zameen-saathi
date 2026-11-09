# ज़मीन-साथी (Zameen-Saathi)

खतौनी/खसरा को सरल हिंदी में समझाने और "suspicious pattern" flag करने वाला टूल। फ़ैसला नहीं देता, सही जगह (तहसील/लेखपाल/वकील) तक पहुँचने में मदद करता है।

**Stack:** FastAPI (Python) + React/Vite/TypeScript. OCR (Tesseract), scikit-learn और आगे LLM सीधे Python में जुड़ते हैं।

## क्या-क्या है (v5: तीनों संस्करण मिलाकर + नया frontend)
- **सहमति + OTP + session** (`auth.py`): फ़ोन और टोकन hash में, 30 मिनट का session, बाहर निकलते ही डेटा ख़त्म। OTP पर 10 मिनट में 3 कोशिश और 5 गलत जवाब की सीमा; फ़ोटो/PDF पढ़ने पर हर session की सीमा; और **IP के हिसाब से** भी सीमा (खुली रखी है, क्योंकि CSC/साइबर कैफ़े में कई लोग एक IP से आते हैं; proxy के पीछे हो तो `TRUSTED_PROXY_HOPS` सही रखना ज़रूरी, `.env.example` देखो)। सर्वर की हर त्रुटि हिंदी और English दोनों में जाती है। `OTP_MODE=sms` में MSG91 या Twilio से असली SMS, और `REDIS_URL` हो तो session Redis में (कई instance के लिए)। डेमो में OTP स्क्रीन पर दिखता है।
- **Synthetic डेटा जनरेटर** (`synth.py`): गाँव का नक्शा, खतौनी, नियम-वाली 6 तरह की गड़बड़ियाँ + 2 संदर्भ-वाली (एक नाम कई खातों में, छोटा प्लॉट कई टुकड़ों में), और स्कैन जैसी तस्वीरें (अंग्रेज़ी या देवनागरी `--lang`; घूमना, धुंधलापन, शोर, छाया)। हर तस्वीर के साथ सही उत्तर की `.json` भी बनती है, उसी भाषा के नामों में।
- **ML** (`features.py`, `train.py`, `anomaly.py`): गाँव-स्तर के फ़ीचर + RandomForest, उन पैटर्न पर जो नियम नहीं पकड़ते (flag का code `ANOMALY`)। ML सिर्फ़ उन प्लॉट पर बोलता है जिन्हें rules ने नहीं पकड़ा। पुराने IsolationForest और सिर्फ़-नियम से तुलना `models/metrics.json` में। **सब synthetic पर है; असली खतौनी पर भरोसा अभी साबित नहीं।** `models/` न मिले तो पहली request पर कुछ सेकंड में खुद train हो जाता है।
- **OCR + PDF** (`ocr.py`, `pdf.py`): फ़ोटो और **PDF** (अधिकतम 8 पन्ने; हर पन्ना `pypdfium2` से तस्वीर बनकर OCR में जाता है, सिस्टम पैकेज नहीं चाहिए)। Tesseract पहले `hin`, confidence कम हो तो `eng`, जिसकी confidence ज़्यादा वह चुना जाता है। Parser `|` और `0,52` जैसे दशमलव सह लेता है। Synthetic स्कैन पर fields सही पढ़े गए (असली खतौनी पर अभी नहीं जाँचा)।
- **Rules** (`rules.py`): हिस्सा, क्षेत्रफल, एक खसरा दो खाते, ज़्यादा transfers, मिलते नाम, नक्शे में ओवरलैप।
- **सरल हिंदी/अंग्रेज़ी व्याख्या** (`explain.py`), **तहसील जाने की तैयारी** (`guide.py`: हर flag पर किससे मिलें, क्या ले जाएँ, क्या पूछें; सामान्य सुझाव, कानूनी सलाह नहीं) और **grounded Q&A** (`qa.py`, `corpus/`): हिंदी/English दोनों में, भाषा अपने-आप पहचानता है, जवाब सिर्फ़ `corpus/` के पाठ से, न मिले तो "पता नहीं" और संबंधित सवाल।
- **अपलोड/विश्लेषण का लॉजिक** (`service.py`): `main.py` से अलग, ताकि FastAPI के बिना टेस्ट हो; ख़राब फ़ाइल पर 500 नहीं, साफ़ 413/415/422/503।
- **OCR सटीकता नापना** (`ocr_eval.py`): फ़ोटो/PDF + सही उत्तर की JSON से खेत-दर-खेत अंक।
- **Frontend** (React 18 + TypeScript + Vite, `frontend/`): "बही-खाता" रूप (रूल वाला काग़ज़, लाल हाशिया, स्याही-नीला, खाकी तहसील-फ़ाइल जैसी चेकलिस्ट), हिंदी/English बटन, लॉगिन/सहमति, कई फ़ोटो/PDF एक साथ (नतीजे जुड़ जाते हैं), हिस्से/क्षेत्रफल सुधारने की तालिका ("1/2", "50%" और देवनागरी अंक चलते हैं), जाँच, संकेतों की टैली-गिनती, शजरा जैसा नक्शा (`bbox` न हो तो क्षेत्रफल के अनुपात का योजनाबद्ध नक्शा), मालिकों की हिस्सा-पट्टी, तहसील चेकलिस्ट (टिक होती हैं), **नमूना गाँव और नमूना स्कैन** (बिना अपने कागज़ के आज़माने के लिए), 🔊 सुनना, 🎤 बोलकर पूछना, A4 पर छापने लायक रिपोर्ट, इंटरनेट बंद होने का संकेत, `prefers-reduced-motion`, PWA (होम स्क्रीन पर जोड़ सकते हैं)। फ़ॉन्ट खुद के सर्वर से (Poppins, OFL); कोई बाहरी CDN नहीं।
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
Tests: `cd backend && pytest -q` (OCR वाले टेस्ट के लिए `tesseract-ocr tesseract-ocr-hin fonts-noto-core` चाहिए, वरना वे skip होते हैं) और `cd frontend && npm test` (Node 22.18+)।

**डेमो में:** `OTP_MODE=demo` में OTP स्क्रीन पर दिखता है। लॉगिन के बाद "नमूना गाँव खोलें" से पूरी रिपोर्ट बिना कुछ अपलोड किए दिखती है। नमूना स्कैन फिर से बनाने के लिए: `cd backend && python -m app.make_samples --out ../frontend/public/samples`।

**Frontend का आकार:** बंडल लगभग 270 KB JS + 20 KB CSS (gzip से पहले)। `public/` में फ़ॉन्ट (~230 KB), आइकन और नमूना स्कैन (~830 KB) हैं।

**Render (सादा Python, Docker नहीं):** Build Command में `pip install -r requirements.txt && python -m app.train` रखो, ताकि पहली request धीमी न हो। वहाँ Tesseract नहीं होता, इसलिए `OCR_ENGINE=demo` ही चलेगा।

Synthetic स्कैन बनाकर OCR आज़माने के लिए `python -m app.synth --villages 3 --images 3` चलाओ और `backend/data/synthetic/*.png` अपलोड करो (`OCR_ENGINE=tesseract` के साथ)।

**OCR कितना सही पढ़ता है, नापो:**
```bash
python -m app.synth --villages 5 --images 5 --lang hi     # स्कैन जैसी फ़ोटो + सही उत्तर की JSON (देवनागरी)
python -m app.ocr_eval --dir data/synthetic               # खेत-दर-खेत अंक
```
असली सहमति वाले नमूनों के लिए: फ़ोटो/PDF के पास उसी नाम की `.json` रखो (`{"plots": [...]}` जैसा synthetic में है) और वही कमांड चलाओ।

**असली SMS चालू करना:** `.env.example` देखो। `OTP_MODE=sms`, `AUTH_SALT` बदलो, और `SMS_PROVIDER` के हिसाब से keys भरो। भारत में SMS के लिए DLT-मंज़ूर टेम्पलेट चाहिए। दोनों provider का कोड दस्तावेज़ों के हिसाब से लिखा है, असली keys से अभी नहीं परखा।

**ML के अंकों पर भरोसा मत करो:** लेबल हमने खुद डाले हैं, इसलिए अंक असली दुनिया के नहीं हैं। असली, सहमति वाले नमूनों पर जाँच `PENDING.md` में बाकी है।

**ज़रूरी:** क्या जाँचा गया, क्या नहीं, और अगले कदम `PENDING.md` में हैं (`HANDOFF.md` पुराने सत्रों की स्थिति है)।
