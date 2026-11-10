# v6: Refoodify जैसा नया frontend + पूरी वेबसाइट के फ़ीचर

v5 का सारा काम (OCR, नियम, ML, रिपोर्ट, नक्शा, चेकलिस्ट, Q&A) जस का तस है। बदला है **रूप** और **वेबसाइट वाला ढाँचा**, और backend में दो छोटे नए रास्ते।

## Refoodify से क्या लिया → Zameen-Saathi में क्या बना

| Refoodify में | ज़मीन-साथी v6 में | कहाँ |
|---|---|---|
| "Welcome to ... Get Started" पर्दा | स्वागत-पर्दा (हर टैब में एक बार; Esc/बटन से हटता है; भाषा बदलने का बटन भी) | `components/Splash.tsx` |
| ऊपर: लोगो, ☀ रंग बटन, ≡ मेनू | वही। गहरा/हल्का रंग-रूप (याद रहता है), तीन-रेखा वाला मेनू | `Header.tsx`, `Drawer.tsx`, `theme.ts` |
| मेनू/फ़ुटर के पन्ने: About, Contact, FAQ, Terms | `#/about`, `#/contact`, `#/faq`, `#/terms` | `pages/` |
| Donate Food | **खतौनी जाँचें** (लॉगिन → फ़ाइल → सुधार → रिपोर्ट, पहले जैसा) | `#/start` |
| Find Nearby NGOs | **नज़दीकी तहसील / CSC** (Google Maps नए टैब में) + सरकारी ठिकाने (UP भूलेख, भू-नक्शा, NALSA 15100, Tele-Law) | `pages/Find.tsx` |
| Inventory | **मेरे खसरे**: खोज, छँटाई, संकेत से छाँटना, **CSV डाउनलोड** | `pages/Records.tsx`, `export.ts` |
| Profile | **प्रोफ़ाइल**: ढका हुआ फ़ोन, सत्र की घड़ी, भाषा, रंग-रूप, "डेटा मिटाएँ" | `pages/Profile.tsx` |
| "Our Impact, Live" (3 कार्ड) | **लाइव गिनती**: जाँची खतौनियाँ, पढ़े खसरे, दोबारा जाँचने के संकेत (सर्वर से, अनाम) | `StatsLive.tsx`, `GET /api/stats` |
| How it works (4 कदम) | 4 कदम | `pages/Home.tsx` |
| Built for Impact (फ़ोटो वाले) | 4 क्षमताएँ, **इनलाइन SVG चित्र** (बाहरी फ़ोटो नहीं, ऑफ़लाइन चलते हैं) | `components/Art.tsx` |
| Impact Stories | 3 **काल्पनिक उदाहरण** (साफ़ लिखा है) | `Home.tsx` |
| Why Choose (तुलना) | बिना जाँच के / ज़मीन-साथी के साथ | `Home.tsx` |
| FAQ | 8 सवाल (होम पर 5, पूरा `#/faq` पर) | `FaqList.tsx`, `site.ts` |
| "Ready to Feed Someone?" + Partner | बुलावा + "साझेदार बनें" → संपर्क फ़ॉर्म | `Contact.tsx`, `POST /api/contact` |
| फ़ुटर: Quick links, Resources, Contact | वही | `Footer.tsx` |

**जानबूझकर नहीं लिया:** Refoodify का "Trusted by Feeding India / Akshaya Patra / Taj Hotels / Google.org" और बनावटी आँकड़े। हमारे पास ऐसी कोई साझेदारी नहीं, इसलिए उसकी जगह "इनके लिए बना" (किसान, CSC आदि) है। गिनती असली है: न मिले तो "—" दिखता है, झूठा अंक नहीं।

## Backend में नया
- `GET /api/stats`: खुली, अनाम गिनतियाँ (`stats.py`)। फ़ोन/नाम/फ़ाइल कभी नहीं। `DATA_DIR` हो तो `stats.json` में बचती हैं। नमूना गाँव की जाँच नहीं गिनी जाती (`/api/analyze?demo=1`)।
- `POST /api/contact`: संपर्क/साझेदारी का संदेश (`contact.py`)। जाँच, छिपा "honeypot" खाना, IP-सीमा (10 मिनट में 5), फ़ाइल की सीमा (5 MB), एक पंक्ति प्रति संदेश `contact.jsonl` में।
- `GET /api/admin/contact`: संदेश पढ़ने के लिए, `x-admin-token` से। `ADMIN_TOKEN` खाली हो तो रास्ता है ही नहीं (404)।
- नए टेस्ट: `tests/test_stats.py`, `tests/test_contact.py`; `tests/test_wiring.py` में नए रास्ते।

## नई सेटिंग (`.env.example` में)
`DATA_DIR`, `MAX_CONTACT_PER_IP_10MIN`, `MAX_STATS_PER_IP_10MIN`, `MAX_CONTACT_FILE_MB`, `ADMIN_TOKEN`; frontend में `VITE_CONTACT_EMAIL`, `VITE_CONTACT_PHONE` (खाली = छिपे; कोई फ़ोन/ईमेल कोड में नहीं लिखा)।

## Render/हॉस्टिंग पर ध्यान
- पन्ने `#/...` (hash) वाले हैं, इसलिए सर्वर में कोई rewrite-नियम नहीं चाहिए।
- Render पर डिस्क स्थायी नहीं होती: `contact.jsonl` और `stats.json` दोबारा deploy पर मिट सकती हैं। स्थायी Disk जोड़कर `DATA_DIR` वहीं रखो, या संदेश जल्दी पढ़ लो।
- `sw.js` का cache `zs-shell-v2` हो गया है (पुराने ग्राहकों को नया रूप मिलेगा)।

## क्या परखा गया (और क्या नहीं)
- ✔ Frontend: `tsc` (strict) साफ़; `node --test` के 15 टेस्ट पास (CSV के 4 नए); असली Chromium में 52 जाँचें पास (स्वागत-पर्दा, मेनू, फ़ोकस, थीम, संपर्क फ़ॉर्म, लॉगिन → नमूना → रिपोर्ट, मेरे खसरे + CSV, प्रोफ़ाइल, मिटाना, सारे पन्ने, मोबाइल/डेस्कटॉप पर क्षैतिज overflow नहीं)। इनमें API नकली (mock) थी।
- ✔ Backend: `stats.py` और `contact.py` के 15 टेस्ट पास।
- ✘ **असली FastAPI/pytest/Vite इस सैंडबॉक्स में नहीं थे।** इसलिए `main.py` की नई वायरिंग (3 रास्ते) और `npm run build` असली रूप में नहीं चले। पहले `pytest -q` और `npm run build` चलाओ।
- ✘ TalkBack/NVDA और असली फ़ोन पर नहीं परखा।
- ✘ "शर्तें और निजता" का पाठ हमारे असली व्यवहार से लिखा मसौदा है; सार्वजनिक करने से पहले किसी जानकार से जँचवाओ। सरकारी ठिकानों के लिंक/नंबर (भूलेख, भू-नक्शा, 15100, Tele-Law) आज की जाँच पर हैं; बदल सकते हैं।
