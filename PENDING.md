# PENDING: जो नहीं हो पाया या जाँचा नहीं जा सका

यह फ़ाइल `HANDOFF.md` का अगला रूप है। पहले यह पढ़ो, फिर नीचे का "पहले ये तीन कमांड चलाओ" वाला हिस्सा।

## 0. इस बार क्या बना और असली लाइब्रेरी पर चलकर जाँचा गया

| काम | स्थिति |
|---|---|
| **PDF सपोर्ट** (`app/pdf.py`, `ocr.py`, `service.py`) | PDF के पन्ने `pypdfium2` से तस्वीर बनकर OCR में जाते हैं (अधिकतम 8 पन्ने)। असली PDF पर, असली Tesseract से, अंग्रेज़ी और हिंदी दोनों में टेस्ट पास |
| **Hindi (`hin`) OCR परखा गया** | देवनागरी नाम/अंकों वाली synthetic स्कैन पर 60 में से 59 पंक्तियाँ (खसरा, खाता, क्षेत्रफल) सही; अंग्रेज़ी पर 60/60 |
| **OCR का एक असली बग पकड़ा और ठीक किया** | पहले `hin+eng` एक साथ चलता था, उससे अंग्रेज़ी अंक बिगड़ते थे ("100" → "00", "1.0" → "3.0") और टेस्ट 0/8 पर फ़ेल था। अब पहले `hin`, confidence ≥ 85 न हो तो `eng`, और जिसकी confidence ज़्यादा हो वही चुना जाता है |
| `auth.py` का लॉजिक | 14 नए टेस्ट (सहमति, OTP एक बार, 5 गलत कोशिश के बाद ताला, rate limit, expiry) पास |
| अपलोड/विश्लेषण लॉजिक (`service.py`) | 8 टेस्ट पास; ख़राब फ़ाइल अब 500 नहीं, साफ़ 422 देती है |
| सुरक्षा के छोटे सुधार | अपलोड `MAX_BYTES+1` तक ही पढ़ता है; OCR थ्रेड में चलता है ताकि बाकी अनुरोध न अटकें |

## 1. जो चलाकर जाँचा नहीं जा सका और क्यों

इस सत्र के सैंडबॉक्स में PyPI और npm तक जाना नेटवर्क policy ने मना कर दिया (proxy ने 403 दिया)। इसलिए:

| हिस्सा | स्थिति |
|---|---|
| **FastAPI पर `main.py` और `tests/test_api.py`** | **चले नहीं।** `fastapi` install नहीं हो सका। `main.py` को सिर्फ़ पढ़कर और syntax जाँचकर देखा है। `test_api.py` में दो नए टेस्ट (PDF अपलोड, 415, 401) भी बिना चलाए जोड़े हैं |
| **Frontend `npm run build`** | **नहीं चला।** `App.tsx` में सिर्फ़ तीन छोटे बदलाव हैं (PDF चुनने की अनुमति और दो पाठ) |
| Docker build, CI workflow | नहीं चले। CI में `tesseract-ocr-hin` और फ़ॉन्ट apt से लगाने की पंक्ति जोड़ी है, उसका असर देखना बाकी |
| ऊपर के बाकी हिस्से | असली `pydantic`, `scikit-learn`, `pypdfium2`, Tesseract 5.3 (`hin` सहित) पर चले |

## 2. पहले ये तीन कमांड चलाओ (अपने लैपटॉप पर)

```bash
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.synth --villages 200 --no-images && python -m app.train
pytest -q                      # test_api.py पहली बार यहीं चलेगा
cd ../frontend && npm install && npm run build
```
टेस्ट में `tesseract`/`hin` न मिले तो OCR वाले टेस्ट skip होते हैं (fail नहीं)। असली जाँच के लिए
`sudo apt install tesseract-ocr tesseract-ocr-hin fonts-noto-core` करके दोबारा चलाओ।

## 3. बाकी काम (प्राथमिकता से)

1. **ML सुधार** (HANDOFF बिंदु 4): अभी शुरू नहीं हुआ / इस फ़ाइल के अंत में स्थिति देखें।
2. **असली खतौनी पर OCR:** parser सिर्फ़ हमारे synthetic टेम्पलेट (`खसरा खाता क्षेत्रफल नाम हिस्सा`) के लिए है। असली UP खतौनी की बनावट अलग है; 5-10 सहमति वाले असली नमूने लेकर `parse_text` को column-wise बनाओ, फिर PaddleOCR से तुलना करो।
3. **OCR की सीमा:** `hin` कभी-कभी अंक बदल देता है (हमारे नमूने में 1 पंक्ति में खाता/क्षेत्रफल ग़लत)। इसीलिए frontend में "पढ़ी गई जानकारी" सुधारने की तालिका है; उसे हटाना नहीं।
4. **असली OTP:** `auth.send_sms` में MSG91/Twilio जोड़ो; sessions/OTP अभी memory में हैं (कई instance पर Redis चाहिए)। `OTP_MODE=sms` तभी रखो।
5. **Q&A corpus:** `corpus/glossary_hi.txt` सिर्फ़ सामान्य शब्दावली है। UP राजस्व संहिता का असली, सही स्रोत वाला पाठ `.txt` में डालो; फिर embeddings + LLM (जवाब सिर्फ़ retrieved पाठ से, source के साथ)।
6. **सुरक्षा:** rate limit सिर्फ़ OTP पर है; `/api/extract` पर IP-based limit, HTTPS, और `AUTH_SALT` बदलना न भूलो।
7. **WhatsApp/आवाज़ इंटरफ़ेस**, **नक्शा दिखाना** (`bbox` से SVG), **अंग्रेज़ी/अन्य भाषा टॉगल**, **tehsil जाने की चेकलिस्ट** (flag के हिसाब से कौन-से दस्तावेज़)।

## 4. अगला चैट शुरू करने के लिए संदेश (कॉपी करो)
> इस ज़िप में zameen-saathi है। पहले PENDING.md पढ़ो। backend `pytest -q` और frontend `npm run build` चलाकर जो टूटे उसे ठीक करो (खासकर `tests/test_api.py` और `main.py`, जो पहले कभी FastAPI पर नहीं चले), फिर PENDING.md के सेक्शन 3 का अगला बिंदु करो।
