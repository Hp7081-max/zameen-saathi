"""हर flag के लिए 'किससे मिलें, क्या ले जाएँ, क्या पूछें' की सामान्य सूची।
पक्के टेम्पलेट (कोई LLM नहीं)। यह आम सुझाव है, कानूनी सलाह नहीं; स्थानीय नियम तहसील से पूछें।"""
from .schemas import ChecklistItem, Flag

COMMON_HI = ["पहचान पत्र (आधार या वोटर आईडी)", "खतौनी की ताज़ा नकल"]
COMMON_EN = ["Photo ID (Aadhaar or voter ID)", "A recent copy of the khatauni"]

# code: (who_hi, who_en, docs_hi, docs_en, ask_hi, ask_en)
GUIDE = {
    "SHARE_SUM": ("लेखपाल, या तहसील का राजस्व कार्यालय", "The lekhpal, or the tehsil revenue office",
                  ["जिस वरासत, बैनामे या बँटवारे से हिस्से बने, उसके कागज़ (हों तो)", "सभी हिस्सेदारों के नामों की सूची"],
                  ["Papers behind the shares (inheritance, sale deed or partition), if you have them", "A list of all co-owners' names"],
                  "हिस्सों का जोड़ 1 क्यों नहीं बैठ रहा, और सुधार के लिए क्या करना होगा?",
                  "Why do the shares not add up to 1, and what is needed to correct it?"),
    "AREA_MISMATCH": ("लेखपाल", "The lekhpal",
                      ["नक्शे (शजरे) की नकल", "पुरानी खतौनी या बैनामे में लिखा क्षेत्रफल"],
                      ["A copy of the village map (shajra)", "The area written in an older khatauni or sale deed"],
                      "खतौनी और नक्शे का क्षेत्रफल अलग क्यों है? ज़रूरत हो तो पैमाइश (नाप) कैसे कराई जाती है?",
                      "Why do the record and the map show different areas? If needed, how is a measurement arranged?"),
    "DUP_KHASRA": ("तहसील का राजस्व कार्यालय", "The tehsil revenue office",
                   ["दोनों खातों की खतौनी की नकल", "अपना बैनामा या रजिस्ट्री का कागज़ (हो तो)"],
                   ["Khatauni copies of both khatas", "Your sale deed or registry paper, if you have it"],
                   "यह खसरा दो खातों में क्यों दर्ज है, और किस आधार पर?",
                   "Why is this plot listed under two khatas, and on what basis?"),
    "OVERLAP": ("लेखपाल या तहसील", "The lekhpal or the tehsil",
                ["नक्शे (शजरे) की नकल", "आस-पास के खसरा नंबर और अपनी रजिस्ट्री के कागज़ (हों तो)"],
                ["A copy of the village map (shajra)", "Neighbouring plot numbers and your registry papers, if any"],
                "नक्शे में ये खसरे आपस में क्यों चढ़ रहे हैं? क्या सीमा की नाप की ज़रूरत है?",
                "Why do these plots overlap on the map? Is a boundary measurement needed?"),
    "MANY_TRANSFERS": ("तहसील, या उप-निबंधक (रजिस्ट्री) कार्यालय", "The tehsil, or the sub-registrar (registry) office",
                       ["अपनी रजिस्ट्री या बैनामे की प्रति (हो तो)", "पिछले बदलावों की तारीख़ें, अगर आपको पता हों"],
                       ["Your registry or sale deed copy, if you have it", "Dates of earlier changes, if you know them"],
                       "पिछले दो साल में इस खसरे पर कौन-कौन से बदलाव दर्ज हुए, और किस आधार पर?",
                       "Which changes were recorded on this plot in the last two years, and on what basis?"),
    "SIMILAR_NAMES": ("लेखपाल", "The lekhpal",
                      ["नाम का सबूत देने वाला पहचान पत्र", "वरासत या पुराने दस्तावेज़ जिनमें पूरा नाम लिखा हो"],
                      ["An ID that proves your name", "Inheritance or older papers showing the full name"],
                      "क्या ये मिलते-जुलते नाम एक ही व्यक्ति के हैं? वर्तनी सुधारनी हो तो क्या करना होगा?",
                      "Are these similar names the same person? What is needed to correct a spelling?"),
    "ANOMALY": ("लेखपाल", "The lekhpal", [], [],
                    "इस खसरे को ताज़ा खतौनी और नक्शे से मिलाकर बताइए कि सब ठीक दर्ज है या नहीं।",
                    "Please check this plot against the latest record and map and confirm it is correctly entered."),
}
GUIDE["SOFT_SIGNAL"] = GUIDE["ANOMALY"]  # पुराना नाम, ताकि पुराने flags भी चेकलिस्ट पाएँ


def checklist(flags: list[Flag]) -> list[ChecklistItem]:
    plots: dict[str, list[str]] = {}
    for f in flags:
        if f.code in GUIDE:
            plots.setdefault(f.code, [])
            if f.plot != "-" and f.plot not in plots[f.code]:
                plots[f.code].append(f.plot)
    out = []
    for code, ps in plots.items():  # flags पहले से गंभीरता के क्रम में हैं
        who_hi, who_en, d_hi, d_en, a_hi, a_en = GUIDE[code]
        out.append(ChecklistItem(code=code, plots=ps, who_hi=who_hi, who_en=who_en, docs_hi=d_hi + COMMON_HI,
                                 docs_en=d_en + COMMON_EN, ask_hi=a_hi, ask_en=a_en))
    return out
