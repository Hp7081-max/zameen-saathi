# HANDOFF: क्या बन गया, क्या नहीं जाँचा, क्या बाकी है

## 1. जाँच की स्थिति (ईमानदारी से)
| हिस्सा | स्थिति |
|---|---|
| `synth.py`, `train.py`, `anomaly.py`, `rules.py`, `explain.py`, `qa.py`, `ocr.py` | सैंडबॉक्स में चलाकर जाँचे (pydantic/fastapi की जगह छोटे नकली stand-in लगाकर) |
| टेस्ट `test_rules`, `test_synth`, `test_ml`, `test_pdf` | 14/14 पास (stand-in के साथ) |
| PDF: text-layer वाली और स्कैन वाली (2 पन्ने, Tesseract अंग्रेज़ी मॉडल) | दोनों रास्ते चले; टूटी PDF/फ़ोटो पर 422, नकली PDF पर 415 |
| `main.py`, `auth.py` | functions सीधे बुलाकर जाँचे (OTP → session, extract, analyze)। असली `pytest tests/test_api.py` (TestClient) **नहीं चला** |
| बग जो मिला और ठीक हुआ | 91 से शुरू होने वाले मोबाइल नंबर (जैसे 9111111111) लॉगिन में रद्द हो रहे थे। अब ठीक + टेस्ट |
| ML (rules के बाद बचे प्लॉट, synthetic हल्के संकेत, गाँव-अलग test) | precision 0.79, recall 0.81, ROC-AUC 0.95। बिना-लेबल IsolationForest: 0.38 / 0.76 / 0.88। `AREA_DRIFT` का recall सिर्फ़ 0.30, `REPEAT_OWNER` का 0.96 |
| Frontend | बिना असली `@types/react` के टाइप-जाँच की: कोड में कोई गलती नहीं मिली। **`npm run build` अब भी नहीं चला** |
| Docker | Dockerfiles लिखे हैं, build नहीं चलाया |

**ML के अंकों पर चेतावनी:** लेबल हमने खुद डाले हैं, इसलिए ये अंक असली दुनिया के नहीं हैं। एक बार generator में रिसाव मिला था (`REPEAT_OWNER` हमेशा transfers=2 करता था और साफ़ डेटा में 2 कभी नहीं होता था, तब recall 0.99 आ रहा था)। ठीक करके दोबारा नापा। पुराने अंक (precision 0.17, recall 0.31) दूसरे तरह के लेबल पर थे, इनसे सीधी तुलना नहीं हो सकती।

## 2. जो छूट गया (प्राथमिकता से)
1. **असली खतौनी पर OCR**: parser सिर्फ़ हमारे synthetic टेम्पलेट (`खसरा खाता क्षेत्रफल नाम हिस्सा`) के लिए है। 5-10 सहमति वाले असली नमूने लेकर `parse_text` को column-wise बनाओ; PaddleOCR से तुलना करो।
2. **Hindi Tesseract मॉडल (`hin`)**: सैंडबॉक्स में नहीं था। Docker image में `tesseract-ocr-hin` है, वहाँ देवनागरी स्कैन और देवनागरी PDF दोनों परखो।
3. **असली सरकारी PDF**: Bhulekh की PDF में अक्सर पुराने फ़ॉन्ट होते हैं, text-layer टूटी निकल सकती है (तब OCR पर गिरता है, पर परखा नहीं)। पासवर्ड वाली PDF अभी "खुल नहीं पाई" बताती है।
4. **ML असली डेटा पर**: threshold और फ़ीचर्स असली सहमति वाले नमूनों पर कैलिब्रेट करो। हल्के संकेत (`AREA_DRIFT`, `REPEAT_OWNER`) की परिभाषा हमारी मान्यता है, किसी विशेषज्ञ से जँचवाओ।
5. **असली OTP**: `auth.send_sms` में MSG91/Twilio जोड़ो; sessions/OTP अभी memory में हैं (कई instance पर Redis)। `OTP_MODE=sms` तभी रखो।
6. **Q&A corpus**: `corpus/glossary_hi.txt` सिर्फ़ सामान्य शब्दावली है, कानूनी पाठ नहीं। UP राजस्व संहिता का असली पाठ `.txt` में डालो; फिर embeddings + LLM (जवाब सिर्फ़ retrieved पाठ से, source के साथ)।
7. **WhatsApp/आवाज़**: अभी सिर्फ़ ब्राउज़र की voice (Chrome में सबसे अच्छी)।
8. **नक्शा देखना**: `bbox` से ओवरलैप जाँच होती है, पर फ्रंटएंड में नक्शा नहीं दिखता।
9. **सुरक्षा**: rate limit सिर्फ़ OTP पर है; `/api/extract` पर IP-based limit, HTTPS, और `AUTH_SALT` बदलना न भूलो।
10. **अंग्रेज़ी/अन्य भाषा टॉगल** और **tehsil जाने की चेकलिस्ट** (flag के हिसाब से क्या दस्तावेज़ ले जाएँ)।

## 3. अगला चैट शुरू करने के लिए संदेश (कॉपी करो)
> इस ज़िप में zameen-saathi है। पहले HANDOFF.md पढ़ो। backend `pytest -q` और frontend `npm run build` चलाकर जो टूटे उसे ठीक करो, फिर HANDOFF के सेक्शन 2 के बिंदु 8 (नक्शा देखना) और 10 (tehsil चेकलिस्ट) बनाओ।
