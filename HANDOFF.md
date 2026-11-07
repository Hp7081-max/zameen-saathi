> **पुराना:** यह पिछले सत्र की स्थिति है (कुछ दावे अब बदल चुके हैं, जैसे ML के आँकड़े और OCR भाषा)। **ताज़ा स्थिति `PENDING.md` में है।**

# HANDOFF: क्या बन गया, क्या नहीं जाँचा, क्या बाकी है

## 1. जाँच की स्थिति (ईमानदारी से)
| हिस्सा | स्थिति |
|---|---|
| `synth.py`, `train.py`, `anomaly.py`, `rules.py`, `explain.py`, `qa.py`, `ocr.py` | सैंडबॉक्स में चलाकर जाँचे (pydantic की जगह छोटा नकली stand-in लगाकर) |
| rules का recall (injected गड़बड़ियों पर) | टेस्ट पास (>= 95%) |
| Tesseract OCR (synthetic स्कैन, अंग्रेज़ी भाषा-मॉडल) | 25/25 पंक्तियों के खसरा/खाता/क्षेत्रफल सही मिले |
| ML मॉडल | **कमज़ोर:** synthetic test पर precision ~0.17, recall ~0.31 (`models/metrics.json`)। अभी सिर्फ़ baseline है |
| `auth.py`, `main.py`, `tests/test_api.py` | **चलाए नहीं गए**: सैंडबॉक्स में FastAPI नहीं था। लैपटॉप पर `pytest -q` पहले चलाओ |
| Frontend (`App.tsx` आदि) | **`npm run build` नहीं चला।** पहले `cd frontend && npm install && npm run build` करो; TypeScript की छोटी गलती आ सकती है |
| Docker | Dockerfiles लिखे हैं, build नहीं चलाया |

## 2. जो छूट गया (प्राथमिकता से)
1. **असली खतौनी पर OCR**: parser सिर्फ़ हमारे synthetic टेम्पलेट (`खसरा खाता क्षेत्रफल नाम हिस्सा`) के लिए है। असली UP खतौनी की बनावट अलग है। 5-10 सहमति वाले असली नमूने लेकर `parse_text` को column-wise बनाओ; फिर PaddleOCR से तुलना करो।
2. **Hindi Tesseract मॉडल (`hin`)**: सैंडबॉक्स में नहीं था, इसलिए हिंदी अक्षरों पर OCR परखा नहीं। Docker image में `tesseract-ocr-hin` है, वहाँ टेस्ट करो।
3. **PDF सपोर्ट**: API सिर्फ़ PNG/JPG लेती है। `pdftoppm` या `pdf2image` से पन्ने फ़ोटो बनाकर `/api/extract` में जोड़ो।
4. **ML सुधार**: अभी IsolationForest सिर्फ़ 5 फ़ीचर पर। आगे: गाँव-स्तर के फ़ीचर (एक नाम कितने खातों में), supervised classifier (लेबल synthetic में हैं), और असली डेटा पर कैलिब्रेशन।
5. **असली OTP**: `auth.send_sms` में MSG91/Twilio जोड़ो; sessions/OTP अभी memory में हैं (कई instance पर Redis चाहिए)। `OTP_MODE=sms` तभी रखो।
6. **Q&A corpus**: `corpus/glossary_hi.txt` सिर्फ़ सामान्य शब्दावली है, कानूनी पाठ नहीं। UP राजस्व संहिता का असली, सही स्रोत वाला पाठ `.txt` में डालो; फिर embeddings + LLM (जवाब सिर्फ़ retrieved पाठ से, source के साथ)।
7. **WhatsApp/आवाज़ इंटरफ़ेस**: अभी सिर्फ़ ब्राउज़र की voice (Chrome में सबसे अच्छी)। WhatsApp Cloud API बाद में।
8. **नक्शा देखना**: `bbox` से ओवरलैप जाँच होती है, पर फ्रंटएंड में नक्शा नहीं दिखता। SVG नक्शा जोड़ना अच्छा feature होगा।
9. **सुरक्षा**: rate limit सिर्फ़ OTP पर है; `/api/extract` पर IP-based limit, HTTPS, और `AUTH_SALT` बदलना न भूलो।
10. **अंग्रेज़ी/अन्य भाषा टॉगल** और **tehsil जाने की चेकलिस्ट** (flag के हिसाब से क्या दस्तावेज़ ले जाएँ)।

## 3. अगला चैट शुरू करने के लिए संदेश (कॉपी करो)
> इस ज़िप में zameen-saathi है। पहले HANDOFF.md पढ़ो। backend `pytest -q` और frontend `npm run build` चलाकर जो टूटे उसे ठीक करो, फिर HANDOFF के सेक्शन 2 के बिंदु 3 (PDF सपोर्ट) और 4 (ML सुधार) बनाओ।
