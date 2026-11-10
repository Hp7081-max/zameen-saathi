import type { Lang } from "./api";

/** वेबसाइट वाले हिस्से (मेनू, होम पन्ना, प्रोफ़ाइल, संपर्क, शर्तें) के सारे पाठ। ऐप वाले पाठ `i18n.ts` में हैं।
    हिंदी मूल है; EN का आकार `Site` से जँचता है, इसलिए कोई कुंजी छूटे तो build नहीं चलेगा। */
export const SITE_HI = {
  // मेनू और ऊपरी पट्टी
  menu_open: "मेनू खोलें", menu_close: "मेनू बंद करें", menu_title: "मेनू",
  theme_to_light: "हल्का रंग", theme_to_dark: "गहरा रंग", theme_label: "रंग-रूप",
  nav_g_app: "ऐप", nav_g_info: "जानकारी",
  nav_home: "होम", nav_start: "खतौनी जाँचें", nav_records: "मेरे खसरे", nav_find: "नज़दीकी तहसील / CSC", nav_profile: "प्रोफ़ाइल",
  nav_about: "हमारे बारे में", nav_faq: "सवाल-जवाब", nav_contact: "संपर्क", nav_terms: "शर्तें और निजता",

  // शुरुआती स्वागत-पर्दा
  splash_welcome: "स्वागत है", splash_tag: "अपनी ज़मीन, अपनी समझ", splash_go: "शुरू करें",

  // होम: मुख्य भाग
  hero_eyebrow: "खतौनी समझने का साथी",
  cta_check: "खतौनी जाँचें", cta_find: "नज़दीकी तहसील खोजें",
  built_for: "इनके लिए बना",
  built_for_list: ["किसान", "खेत के मालिक", "संयुक्त परिवार", "CSC / साइबर कैफ़े", "ज़मीन के खरीदार"],

  // होम: लाइव गिनती
  st_eyebrow: "लाइव गिनती", st_title: "अब तक का काम, सीधे",
  st_lead: "हर जाँच, हर पढ़ा खसरा, हर पकड़ी गई गड़बड़ी का हिसाब।",
  st_labels: { analyses: "खतौनियाँ जाँची गईं", plots_read: "खसरे पढ़े गए", flags_found: "जगह दोबारा जाँचने को कहा" },
  st_note: (since: string) => `अनाम गिनती, ${since} से। कोई नाम, नंबर या फ़ाइल नहीं गिनी जाती।`,
  st_fail: "गिनती अभी नहीं मिल पाई।",

  // होम: कैसे काम करता है
  how_eyebrow: "तरीका", how_title: "ज़मीन-साथी कैसे काम करता है", how_lead: "चार आसान कदम, फ़ोटो से रिपोर्ट तक।",
  how_steps: [
    { t: "लॉगिन", d: "मोबाइल OTP से, बिना खाता बनाए।" },
    { t: "खतौनी डालें", d: "फ़ोटो या PDF, कई फ़ाइलें एक साथ।" },
    { t: "जाँचें और सुधारें", d: "जो गलत पढ़ा गया हो, खुद ठीक करें।" },
    { t: "रिपोर्ट", d: "सरल हिंदी, नक्शा और तहसील की चेकलिस्ट।" },
  ],

  // होम: क्षमताएँ
  cap_eyebrow: "क्षमताएँ", cap_title: "काम की बातें",
  caps: [
    { t: "सरल हिंदी में व्याख्या", d: "हर खसरे का मतलब आसान शब्दों में। चाहें तो बोलकर सुनिए।" },
    { t: "शजरा जैसा नक्शा", d: "कहाँ ज़्यादा ध्यान देना है, यह रंग और निशान से दिखता है।" },
    { t: "तहसील की चेकलिस्ट", d: "किससे मिलें, क्या ले जाएँ, क्या पूछें। टिक करते जाइए।" },
    { t: "निजी और मिटने वाला", d: "फ़ोटो सेव नहीं होती। 30 मिनट में या बाहर निकलते ही सब मिट जाता है।" },
  ],

  // होम: स्थितियाँ
  sc_eyebrow: "कहाँ काम आता है", sc_title: "जब पहले जाँच लेना ठीक रहता है", sc_tag: "काल्पनिक उदाहरण",
  sc_items: [
    { k: "खरीदने से पहले", t: "बेचने वाले का हिस्सा पूरा है?", d: "देखिए कि मालिकों के हिस्से जुड़कर 1 बनते हैं या कुछ खाली रह गया है।" },
    { k: "बँटवारे से पहले", t: "किसका कितना, एक नज़र में", d: "हिस्सा-पट्टी में साफ़ दिखता है कि कहाँ 10% या 20% लिखा ही नहीं गया।" },
    { k: "वरासत के बाद", t: "नाम चढ़ा या नहीं?", d: "जहाँ शक हो, चेकलिस्ट बताती है कि लेखपाल से क्या पूछना है।" },
  ],

  // होम: तुलना
  why_title: "ज़मीन-साथी क्यों",
  why_bad_tag: "बिना जाँच के", why_bad_title: "अंदाज़े और चक्कर",
  why_bad: ["कठिन हिंदी तालिका, अंदाज़े से पढ़ना", "हर बात किसी और से पूछते रहना", "गड़बड़ी तहसील पहुँचकर पता चलना", "कौन-सा कागज़ चाहिए, पता नहीं", "बार-बार चक्कर"],
  why_good_tag: "ज़मीन-साथी के साथ", why_good_title: "साफ़ समझ, पूरी तैयारी",
  why_good: ["सरल हिंदी में हर खसरा", "गड़बड़ी के संकेत पहले ही", "तहसील की चेकलिस्ट", "फ़ोटो कहीं सेव नहीं होती", "CSV और छपने लायक रिपोर्ट"],

  // सवाल-जवाब
  faq_title: "सवाल?", faq_all: "सारे सवाल देखें",
  faq: [
    { q: "क्या मेरी फ़ोटो सेव होती है?", a: "नहीं। फ़ोटो सिर्फ़ जाँच के दौरान सर्वर की मेमोरी में रहती है। 30 मिनट बाद या \"बाहर निकलें\" दबाते ही सब मिट जाता है। फ़ोन नंबर सिर्फ़ hash के रूप में रखा जाता है।" },
    { q: "क्या यह कानूनी सलाह है?", a: "नहीं। यह सिर्फ़ बताता है कि कहाँ दोबारा जाँच करानी चाहिए। पक्की जानकारी के लिए तहसील, लेखपाल या वकील से मिलें।" },
    { q: "कौन-सी फ़ाइलें चलती हैं?", a: "PNG, JPG, WebP या PDF (8 पन्ने तक)। हर फ़ाइल 10 MB से छोटी। एक साथ कई फ़ाइलें डाल सकते हैं।" },
    { q: "कोई अंक या नाम गलत पढ़ा गया तो?", a: "\"जाँचें और सुधारें\" चरण में तालिका में खुद ठीक कर सकते हैं। जाँच उसी सुधारी हुई जानकारी पर चलती है।" },
    { q: "किस तरह की खतौनी चलती है?", a: "अभी खसरा-खाता-क्षेत्रफल-हिस्सेदार वाले ढाँचे पर बना है। असली खतौनियों पर परख जारी है, इसलिए पढ़ी हुई जानकारी को अपने कागज़ से ज़रूर मिलाइए।" },
    { q: "OTP क्यों माँगा जाता है?", a: "ताकि बिना खाता बनाए आपका सत्र सुरक्षित रहे और गलत इस्तेमाल रुके। OTP और फ़ाइल पढ़ने पर सीमा भी इसी वजह से है।" },
    { q: "\"मॉडल का अनुमान\" क्या है?", a: "नियम (जैसे हिस्सों का जोड़ 1 न होना) पक्के संकेत हैं। मॉडल का अनुमान नकली उदाहरणों से सीखा है और असली खतौनियों पर उसकी सटीकता अभी साबित नहीं, इसलिए उसे कम पक्का मानें।" },
    { q: "संपर्क या साझेदारी कैसे करें?", a: "संपर्क पन्ने पर संदेश भेजिए। CSC, NGO या कानूनी सहायता केंद्र साझेदारी के लिए लिख सकते हैं।" },
  ],

  // अंतिम बुलावा और नीचे की पट्टी
  cta_title: "तहसील जाने से पहले तैयार हो जाइए", cta_lead: "अपनी खतौनी डालिए और देखिए कि कहाँ दोबारा जाँचना है।", cta_partner: "साझेदार बनें",
  foot_blurb: "खतौनी समझने और तहसील जाने की तैयारी का साथी।",
  foot_chips: ["किसानों के लिए", "निजी और मिटने वाला"],
  foot_quick: "त्वरित लिंक", foot_res: "संसाधन", foot_contact: "संपर्क", foot_join: "हमसे जुड़ें",
  foot_copy: (y: number) => `© ${y} ज़मीन-साथी। सर्वाधिकार सुरक्षित।`, foot_tag: "सरल, निजी और भरोसेमंद होने के लिए बना।",

  // दोनों खाली-स्थिति और लॉगिन-द्वार
  gate_title: "पहले लॉगिन करें", gate_text: "यह पन्ना देखने के लिए लॉगिन ज़रूरी है। बिना खाता बनाए, सिर्फ़ मोबाइल OTP।", gate_btn: "लॉगिन / शुरू करें",

  // मेरे खसरे
  rec_title: "मेरे खसरे", rec_lead: "अब तक पढ़े गए खसरे। खोजिए, छाँटिए और CSV में उतारिए।",
  rec_empty_title: "अभी कोई खसरा नहीं", rec_empty_text: "खतौनी की फ़ोटो या PDF डालिए, या नमूना गाँव खोलिए।", rec_empty_btn: "खतौनी डालें",
  rec_search: "खसरा, खाता या नाम खोजें", rec_search_aria: "खसरे खोजें",
  rec_sort: "क्रम", rec_sort_khasra: "खसरा नंबर", rec_sort_severity: "संकेत ज़्यादा पहले", rec_sort_area: "क्षेत्रफल बड़ा पहले",
  rec_filter_aria: "संकेत से छाँटें", rec_f_none: "संकेत नहीं",
  rec_unchecked: "जाँच बाकी", rec_unchecked_note: "संकेत तब दिखते हैं जब जाँच चल चुकी हो।",
  rec_count: (n: number, t: number) => `${t} में से ${n} खसरे`, rec_none_match: "इस खोज में कुछ नहीं मिला।",
  rec_csv: "CSV डाउनलोड करें", rec_report: "रिपोर्ट खोलें", rec_review: "जानकारी सुधारें और फिर जाँचें",
  rec_khata: "खाता", rec_area: "क्षेत्रफल", rec_ha: "हे.", rec_owners: "हिस्सेदार",
  csv_head: ["खसरा", "खाता", "क्षेत्रफल (हेक्टेयर)", "हिस्सेदार और हिस्सा", "हिस्सों का जोड़", "संकेत का स्तर", "संकेत का ब्यौरा"],
  csv_none: "कोई संकेत नहीं", csv_unchecked: "जाँच बाकी",

  // प्रोफ़ाइल
  prof_title: "मेरी प्रोफ़ाइल", prof_lead: "आपका सत्र और पसंद, एक जगह।",
  prof_phone: "मोबाइल", prof_phone_note: "पूरा नंबर ब्राउज़र में सेव नहीं होता; सिर्फ़ इस सत्र में दिखाने के लिए मेमोरी में है।",
  prof_session: "सत्र", prof_left: (m: number) => `${m} मिनट बाकी`,
  prof_data: "इस सत्र में", prof_plots: (n: number) => `${n} खसरे पढ़े गए`, prof_report_yes: "रिपोर्ट तैयार है", prof_report_no: "रिपोर्ट अभी नहीं बनी",
  prof_prefs: "पसंद", prof_lang: "भाषा", prof_theme: "रंग-रूप", prof_theme_dark: "गहरा", prof_theme_light: "हल्का",
  prof_stored: "इस ब्राउज़र में सिर्फ़ भाषा और रंग-रूप की पसंद सेव रहती है। खतौनी का कुछ भी नहीं।",
  prof_erase_title: "डेटा मिटाएँ", prof_erase_text: "सत्र बंद हो जाएगा और पढ़ा हुआ सारा डेटा हट जाएगा।", prof_erase_btn: "अभी मिटाएँ और बाहर निकलें",

  // नज़दीकी तहसील / मदद
  find_title: "नज़दीकी तहसील और मदद खोजें", find_lead: "तहसील जाने से पहले जगह, कागज़ और मदद के ठिकाने पहचान लीजिए।",
  find_tehsil: "नज़दीकी तहसील कार्यालय", find_csc: "नज़दीकी CSC केंद्र",
  find_privacy: "ये बटन Google Maps खोलते हैं (नए टैब में)। आपकी जगह ज़मीन-साथी को नहीं मिलती।",
  find_links_title: "काम के सरकारी ठिकाने",
  find_links: [
    { t: "UP भूलेख", d: "खतौनी की नकल सरकारी साइट पर देखिए और अपने कागज़ से मिलाइए।", url: "https://upbhulekh.gov.in", label: "upbhulekh.gov.in" },
    { t: "UP भू-नक्शा", d: "गाँव और खसरे का सरकारी नक्शा देखिए।", url: "https://upbhunaksha.gov.in", label: "upbhunaksha.gov.in" },
    { t: "निःशुल्क कानूनी सहायता (NALSA)", d: "पात्र लोगों को मुफ़्त कानूनी सलाह। पात्रता की शर्तें लागू हैं।", url: "tel:15100", label: "15100 (टोल-फ़्री)" },
    { t: "Tele-Law", d: "CSC के ज़रिए वकील से फ़ोन या वीडियो पर सलाह।", url: "https://tele-law.in", label: "tele-law.in" },
  ],
  find_note: "ये सरकारी या बाहरी साइटें हैं; ज़मीन-साथी इनसे जुड़ा नहीं है। सही और ताज़ा जानकारी के लिए इन्हीं की साइट देखिए।",
  find_prep: "तहसील जाने की तैयारी की चेकलिस्ट पाने के लिए पहले अपनी खतौनी जाँचिए।", find_prep_btn: "खतौनी जाँचें",
  out_new_tab: "नए टैब में खुलता है",

  // हमारे बारे में
  about_title: "ज़मीन-साथी के बारे में",
  about_lead: "खतौनी कठिन हिंदी की तालिका है। ज़मीन-साथी उसे सरल भाषा में खोलकर बताता है कि कहाँ दोबारा जाँच करानी चाहिए, ताकि आप तहसील पूरी तैयारी से जाएँ।",
  about_does_title: "क्या करता है",
  about_does: ["फ़ोटो या PDF से खसरा, खाता, क्षेत्रफल और हिस्सेदार पढ़ता है", "हिस्सों के जोड़, एक खसरा दो खातों में, ओवरलैप जैसी गड़बड़ियों के संकेत देता है", "हर खसरे की व्याख्या सरल हिंदी और English में", "तहसील जाने की चेकलिस्ट: किससे मिलें, क्या ले जाएँ, क्या पूछें"],
  about_doesnt_title: "क्या नहीं करता",
  about_doesnt: ["कानूनी फ़ैसला या सलाह नहीं देता", "यह नहीं बताता कि ज़मीन किसकी है", "आपकी फ़ोटो या खतौनी सेव नहीं करता"],
  about_limits_title: "ईमानदारी से: सीमाएँ",
  about_limits: ["असली खतौनियों पर पढ़ने की सटीकता अभी पूरी तरह परखी नहीं गई। पढ़ी हुई जानकारी अपने कागज़ से ज़रूर मिलाइए।", "\"मॉडल का अनुमान\" नकली उदाहरणों से सीखा गया है; उसे नियम वाले संकेत से कम पक्का मानिए।", "नक्शा असली जगह या आकार नहीं, सिर्फ़ क्षेत्रफल के अनुपात में बना चित्र है।"],
  about_cta: "अपनी खतौनी जाँचें",

  // संपर्क
  contact_title: "हमसे बात करें", contact_lead: "सुझाव, कोई गड़बड़ी या साझेदारी: जो भी हो, लिखिए।",
  c_name: "नाम (वैकल्पिक)", c_contact: "फ़ोन या ईमेल (वैकल्पिक)", c_contact_ph: "जवाब चाहिए तो यहाँ लिखें",
  c_kind: "विषय", c_kinds: { feedback: "सुझाव", partner: "साझेदारी (CSC / NGO / कानूनी सहायता)", problem: "कोई गड़बड़ी", other: "कुछ और" },
  c_message: "आपका संदेश", c_message_ph: "यहाँ लिखिए…", c_count: (n: number, max: number) => `${n}/${max}`,
  c_send: "संदेश भेजें", c_sending: "भेज रहे हैं…",
  c_sent_title: "संदेश मिल गया", c_sent_text: "धन्यवाद। हम पढ़कर जवाब देने की कोशिश करेंगे।", c_again: "एक और संदेश लिखें",
  c_privacy: "यहाँ आप जो लिखते हैं, वही सर्वर पर रखा जाता है (खतौनी या फ़ोटो नहीं)। संवेदनशील नंबर यहाँ न लिखें।",
  c_direct: "सीधे संपर्क",

  // शर्तें और निजता
  terms_title: "शर्तें और निजता", terms_updated: "आख़िरी बदलाव: नवंबर 2026",
  terms: [
    { h: "इस्तेमाल की शर्तें", p: [
      "ज़मीन-साथी एक जानकारी देने वाला औज़ार है। यह कानूनी सलाह, फ़ैसला या ज़मीन के मालिकाना हक़ का प्रमाण नहीं है।",
      "पढ़ी गई जानकारी में गलती हो सकती है। फ़ैसले से पहले उसे अपने कागज़ और तहसील, लेखपाल या वकील से मिलाइए।",
      "औज़ार का गलत इस्तेमाल (जैसे दूसरों की खतौनी बिना अनुमति डालना, बार-बार सीमा लाँघना) मना है; ऐसे इस्तेमाल पर सेवा रोकी जा सकती है।",
      "सेवा जैसी है वैसी दी जाती है; किसी भी समय बदल या बंद हो सकती है।",
    ] },
    { h: "आपकी निजता", p: [
      "आपकी फ़ोटो या PDF सिर्फ़ जाँच के दौरान सर्वर की मेमोरी में रहती है, कहीं सेव नहीं होती।",
      "सत्र 30 मिनट का है। समय पूरा होने या \"बाहर निकलें\" दबाने पर सारा डेटा मिट जाता है।",
      "फ़ोन नंबर सिर्फ़ hash के रूप में रखा जाता है, ताकि OTP की सीमाएँ चल सकें।",
      "होम पन्ने की गिनती अनाम है: सिर्फ़ संख्याएँ, कोई नाम, नंबर या फ़ाइल नहीं।",
      "संपर्क फ़ॉर्म में आप जो लिखते हैं, वही रखा जाता है। ब्राउज़र में सिर्फ़ भाषा और रंग-रूप की पसंद सेव होती है।",
    ] },
  ],
};

export type Site = typeof SITE_HI;

export const SITE_EN: Site = {
  menu_open: "Open menu", menu_close: "Close menu", menu_title: "Menu",
  theme_to_light: "Light theme", theme_to_dark: "Dark theme", theme_label: "Appearance",
  nav_g_app: "App", nav_g_info: "Information",
  nav_home: "Home", nav_start: "Check khatauni", nav_records: "My plots", nav_find: "Nearby tehsil / CSC", nav_profile: "Profile",
  nav_about: "About us", nav_faq: "FAQ", nav_contact: "Contact", nav_terms: "Terms and privacy",

  splash_welcome: "Welcome to", splash_tag: "Your land, your understanding", splash_go: "Get started",

  hero_eyebrow: "Your khatauni companion",
  cta_check: "Check khatauni", cta_find: "Find nearby tehsil",
  built_for: "Built for",
  built_for_list: ["Farmers", "Landowners", "Joint families", "CSC / cyber cafés", "Land buyers"],

  st_eyebrow: "Live counters", st_title: "Our work so far, live",
  st_lead: "Every check, every plot read, every issue spotted, counted.",
  st_labels: { analyses: "Khatauni checked", plots_read: "Plots read", flags_found: "Places flagged for a second look" },
  st_note: (since: string) => `Anonymous counts since ${since}. No names, numbers or files are counted.`,
  st_fail: "Could not load the counters right now.",

  how_eyebrow: "The process", how_title: "How Zameen-Saathi works", how_lead: "Four simple steps, from photo to report.",
  how_steps: [
    { t: "Sign in", d: "With a mobile OTP, no account needed." },
    { t: "Add khatauni", d: "Photo or PDF, several files at once." },
    { t: "Check and fix", d: "Correct anything that was misread." },
    { t: "Report", d: "Plain words, a map and a tehsil checklist." },
  ],

  cap_eyebrow: "Capabilities", cap_title: "What it does for you",
  caps: [
    { t: "Plain-language explanation", d: "What each plot says, in simple words. You can listen to it, too." },
    { t: "Shajra-style map", d: "Colour and pattern show where to look closer." },
    { t: "Tehsil checklist", d: "Who to meet, what to carry, what to ask. Tick as you go." },
    { t: "Private and self-erasing", d: "Your photo is never saved. Everything erases in 30 minutes or when you sign out." },
  ],

  sc_eyebrow: "Where it helps", sc_title: "When it pays to check first", sc_tag: "Illustrative example",
  sc_items: [
    { k: "Before buying", t: "Is the seller's share complete?", d: "See whether the owners' shares add up to 1 or part of it is missing." },
    { k: "Before a partition", t: "Who holds how much, at a glance", d: "The share bar shows where 10% or 20% was never written down." },
    { k: "After inheritance", t: "Was the name entered?", d: "Where something looks off, the checklist says what to ask the lekhpal." },
  ],

  why_title: "Why Zameen-Saathi",
  why_bad_tag: "Without a check", why_bad_title: "Guesswork and extra trips",
  why_bad: ["A hard Hindi table, read by guesswork", "Asking someone else about every line", "Finding problems only at the tehsil", "Not knowing which papers to carry", "Trip after trip"],
  why_good_tag: "With Zameen-Saathi", why_good_title: "Clear understanding, full preparation",
  why_good: ["Every plot in plain words", "Warning signs before you go", "A tehsil checklist", "Your photo is never saved", "CSV and printable reports"],

  faq_title: "Questions?", faq_all: "See all questions",
  faq: [
    { q: "Is my photo saved?", a: "No. Your photo stays in the server's memory only while it is checked. It is erased after 30 minutes or the moment you press \"Sign out\". Your phone number is kept only as a hash." },
    { q: "Is this legal advice?", a: "No. It only points out where to double-check. For certainty, meet the tehsil, the lekhpal or a lawyer." },
    { q: "Which files work?", a: "PNG, JPG, WebP or PDF (up to 8 pages), each under 10 MB. You can add several files at once." },
    { q: "What if a number or name was misread?", a: "Fix it yourself in the \"Check and fix\" table. The check runs on your corrected data." },
    { q: "Which khatauni formats work?", a: "It is built for the khasra, khata, area and owners layout. Testing on real khatauni is still going on, so always compare what it read with your paper." },
    { q: "Why is an OTP needed?", a: "To keep your session safe without an account and to stop misuse. The limits on OTPs and file reads exist for the same reason." },
    { q: "What is a \"model estimate\"?", a: "Rules (like shares not adding up to 1) are firm signals. The model estimate was learned from made-up examples and is not yet proven on real khatauni, so treat it as less certain." },
    { q: "How do I get in touch or partner with you?", a: "Send a message on the Contact page. CSCs, NGOs and legal-aid centres are welcome to write about partnering." },
  ],

  cta_title: "Get ready before you go to the tehsil", cta_lead: "Add your khatauni and see where to double-check.", cta_partner: "Become a partner",
  foot_blurb: "A companion for understanding your khatauni and preparing for the tehsil.",
  foot_chips: ["Built for farmers", "Private and self-erasing"],
  foot_quick: "Quick links", foot_res: "Resources", foot_contact: "Contact", foot_join: "Partner with us",
  foot_copy: (y: number) => `© ${y} Zameen-Saathi. All rights reserved.`, foot_tag: "Built to be simple, private and trustworthy.",

  gate_title: "Sign in first", gate_text: "You need to sign in to see this page. No account, just a mobile OTP.", gate_btn: "Sign in / Start",

  rec_title: "My plots", rec_lead: "The plots read so far. Search, filter and download as CSV.",
  rec_empty_title: "No plots yet", rec_empty_text: "Add a khatauni photo or PDF, or open the sample village.", rec_empty_btn: "Add khatauni",
  rec_search: "Search by khasra, khata or name", rec_search_aria: "Search plots",
  rec_sort: "Sort", rec_sort_khasra: "Khasra number", rec_sort_severity: "Most serious first", rec_sort_area: "Largest area first",
  rec_filter_aria: "Filter by signal", rec_f_none: "No signal",
  rec_unchecked: "Not checked yet", rec_unchecked_note: "Signals appear once the check has run.",
  rec_count: (n: number, t: number) => `${n} of ${t} plots`, rec_none_match: "Nothing matches this search.",
  rec_csv: "Download CSV", rec_report: "Open report", rec_review: "Edit and check again",
  rec_khata: "Khata", rec_area: "Area", rec_ha: "ha", rec_owners: "Owners",
  csv_head: ["Khasra", "Khata", "Area (ha)", "Owners and share", "Share total", "Signal level", "Signal details"],
  csv_none: "No signal", csv_unchecked: "Not checked yet",

  prof_title: "My profile", prof_lead: "Your session and preferences in one place.",
  prof_phone: "Mobile", prof_phone_note: "The full number is not saved in the browser; it is held in memory only to show here during this session.",
  prof_session: "Session", prof_left: (m: number) => `${m} min left`,
  prof_data: "In this session", prof_plots: (n: number) => `${n} plots read`, prof_report_yes: "Report is ready", prof_report_no: "No report yet",
  prof_prefs: "Preferences", prof_lang: "Language", prof_theme: "Appearance", prof_theme_dark: "Dark", prof_theme_light: "Light",
  prof_stored: "Only your language and appearance choice are saved in this browser. Nothing from your khatauni.",
  prof_erase_title: "Erase data", prof_erase_text: "The session ends and everything that was read is removed.", prof_erase_btn: "Erase now and sign out",

  find_title: "Find a nearby tehsil and help", find_lead: "Know where to go, what to carry and who can help before you head to the tehsil.",
  find_tehsil: "Nearest tehsil office", find_csc: "Nearest CSC centre",
  find_privacy: "These buttons open Google Maps in a new tab. Zameen-Saathi does not get your location.",
  find_links_title: "Useful official places",
  find_links: [
    { t: "UP Bhulekh", d: "View your khatauni copy on the official site and compare it with your paper.", url: "https://upbhulekh.gov.in", label: "upbhulekh.gov.in" },
    { t: "UP Bhu Naksha", d: "See the official village and plot map.", url: "https://upbhunaksha.gov.in", label: "upbhunaksha.gov.in" },
    { t: "Free legal aid (NALSA)", d: "Free legal advice for eligible people. Eligibility rules apply.", url: "tel:15100", label: "15100 (toll-free)" },
    { t: "Tele-Law", d: "Phone or video advice from a lawyer through a CSC.", url: "https://tele-law.in", label: "tele-law.in" },
  ],
  find_note: "These are government or external sites and Zameen-Saathi is not connected to them. Use their own sites for correct, current details.",
  find_prep: "To get a tehsil preparation checklist, check your khatauni first.", find_prep_btn: "Check khatauni",
  out_new_tab: "opens in a new tab",

  about_title: "About Zameen-Saathi",
  about_lead: "A khatauni is a hard table of Hindi. Zameen-Saathi opens it in plain words and points out where to double-check, so you walk into the tehsil prepared.",
  about_does_title: "What it does",
  about_does: ["Reads khasra, khata, area and owners from a photo or PDF", "Flags issues such as shares not adding up, one plot in two khatas, and overlaps", "Explains every plot in plain Hindi and English", "Gives a tehsil checklist: who to meet, what to carry, what to ask"],
  about_doesnt_title: "What it does not do",
  about_doesnt: ["It gives no legal verdict or advice", "It does not say who owns the land", "It does not save your photo or khatauni"],
  about_limits_title: "Honestly: the limits",
  about_limits: ["Reading accuracy on real khatauni is not fully tested yet. Always compare what it read with your paper.", "The \"model estimate\" was learned from made-up examples; treat it as less certain than a rule-based signal.", "The map is a picture drawn in proportion to area, not the real location or shape."],
  about_cta: "Check your khatauni",

  contact_title: "Talk to us", contact_lead: "A suggestion, a problem or a partnership: write to us.",
  c_name: "Name (optional)", c_contact: "Phone or email (optional)", c_contact_ph: "Write it here if you want a reply",
  c_kind: "Topic", c_kinds: { feedback: "Suggestion", partner: "Partnership (CSC / NGO / legal aid)", problem: "A problem", other: "Something else" },
  c_message: "Your message", c_message_ph: "Write here…", c_count: (n: number, max: number) => `${n}/${max}`,
  c_send: "Send message", c_sending: "Sending…",
  c_sent_title: "Message received", c_sent_text: "Thank you. We will read it and try to reply.", c_again: "Write another message",
  c_privacy: "Only what you type here is stored on the server (never your khatauni or photos). Do not write sensitive numbers here.",
  c_direct: "Direct contact",

  terms_title: "Terms and privacy", terms_updated: "Last updated: November 2026",
  terms: [
    { h: "Terms of use", p: [
      "Zameen-Saathi is an information tool. It is not legal advice, a verdict or proof of ownership.",
      "What it reads can be wrong. Before you act, compare it with your paper and with the tehsil, the lekhpal or a lawyer.",
      "Misuse (such as uploading someone else's khatauni without permission or repeatedly exceeding limits) is not allowed and may lead to the service being blocked.",
      "The service is provided as it is and may change or stop at any time.",
    ] },
    { h: "Your privacy", p: [
      "Your photo or PDF stays in the server's memory only while it is checked and is never saved.",
      "A session lasts 30 minutes. When it ends, or when you press \"Sign out\", all data is erased.",
      "Your phone number is kept only as a hash so that OTP limits can work.",
      "The counters on the home page are anonymous: numbers only, no names, numbers or files.",
      "What you write in the contact form is kept as written. Only your language and appearance choice are saved in the browser.",
    ] },
  ],
};

export const SITE: Record<Lang, Site> = { hi: SITE_HI, en: SITE_EN };

/** मेनू के दो समूह: ऐप वाले पन्ने और जानकारी वाले पन्ने (क्रम वही जो मेनू में दिखता है)। */
export const NAV = ["home", "start", "records", "find", "profile"] as const;
export const INFO = ["about", "faq", "contact", "terms"] as const;
