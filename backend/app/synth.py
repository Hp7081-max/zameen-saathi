"""Synthetic गाँव जनरेटर: नक्शा + खतौनी + लेबल वाली गड़बड़ियाँ + (वैकल्पिक) स्कैन जैसी तस्वीरें।
कोई असली व्यक्ति/ज़मीन नहीं। Pydantic की ज़रूरत नहीं, सब dict है।

दो तरह की गड़बड़ियाँ:
  * labels      : नियम-आधारित (KINDS): rules.py इन्हें पक्का पकड़ता है।
  * soft_labels : संदर्भ-आधारित (SOFT_KINDS): एक-एक प्लॉट देखकर नहीं, पूरे गाँव के पैटर्न से दिखती हैं।
                  rules.py इन्हें नहीं पकड़ता; ML का असली काम यही है।

चलाएँ:  python -m app.synth --villages 50 --images 5 --lang hi --out data/synthetic
"""
import argparse
import json
import random
from pathlib import Path

FIRST = ["Ramesh", "Suresh", "Mohan", "Sita", "Geeta", "Ram", "Shyam", "Rajesh", "Sunita", "Kamla",
         "Lakshmi", "Dinesh", "Mahesh", "Savitri", "Hari", "Radha", "Vijay", "Anil", "Pushpa", "Bhola"]
LAST = ["Devi", "Kumar", "Yadav", "Singh", "Verma", "Maurya", "Pal", "Gupta", "Lal", "Prasad"]
HI = {"Ramesh": "रमेश", "Suresh": "सुरेश", "Mohan": "मोहन", "Sita": "सीता", "Geeta": "गीता", "Ram": "राम",
      "Shyam": "श्याम", "Rajesh": "राजेश", "Sunita": "सुनीता", "Kamla": "कमला", "Lakshmi": "लक्ष्मी",
      "Dinesh": "दिनेश", "Mahesh": "महेश", "Savitri": "सावित्री", "Hari": "हरि", "Radha": "राधा",
      "Vijay": "विजय", "Anil": "अनिल", "Pushpa": "पुष्पा", "Bhola": "भोला",
      "Devi": "देवी", "Kumar": "कुमार", "Yadav": "यादव", "Singh": "सिंह", "Verma": "वर्मा",
      "Maurya": "मौर्य", "Pal": "पाल", "Gupta": "गुप्ता", "Lal": "लाल", "Prasad": "प्रसाद"}
DEVA_DIGITS = str.maketrans("0123456789", "०१२३४५६७८९")
SHARE_SETS = {1: [[1.0]], 2: [[0.5, 0.5], [0.75, 0.25]], 3: [[0.5, 0.25, 0.25]], 4: [[0.25] * 4]}
KINDS = ["SHARE_SUM", "AREA_MISMATCH", "MANY_TRANSFERS", "DUP_KHASRA", "OVERLAP", "SIMILAR_NAMES"]
SOFT_KINDS = ["ACCUMULATION", "FRAGMENTED"]


def _name(rng: random.Random) -> str:
    return f"{rng.choice(FIRST)} {rng.choice(LAST)}"


def make_village(rng: random.Random, vid: int, n_plots: int = 24, anomaly_rate: float = 0.15,
                 soft_rate: float = 0.15) -> dict:
    """एक गाँव = एक Record + labels। नक्शा 6 कॉलम की ग्रिड है, हर प्लॉट अपने सेल में, इसलिए साफ़ रिकॉर्ड में ओवरलैप नहीं।"""
    plots, khata, i = [], 0, 0
    while i < n_plots:
        khata += 1
        owners_n = rng.choice([1, 1, 2, 2, 3, 4])
        shares = rng.choice(SHARE_SETS[owners_n])
        names = list(dict.fromkeys(_name(rng) for _ in range(owners_n)))  # क्रम तय रहे (set का क्रम हर बार बदलता है)
        while len(names) < owners_n:
            names.append(_name(rng))
        for _ in range(rng.choice([1, 1, 2, 3])):
            if i >= n_plots:
                break
            r, c = divmod(i, 6)
            w, h = rng.uniform(40, 90), rng.uniform(40, 90)
            x, y = c * 100 + rng.uniform(0, 100 - w), r * 100 + rng.uniform(0, 100 - h)
            area = round(w * h / 10000, 3)
            plots.append({"khasra": str(100 + i), "khata": str(khata), "area_ha": area, "map_area_ha": area,
                          "owners": [{"name": n, "share": s} for n, s in zip(names, shares)],
                          "transfers_last_2y": rng.choice([0, 0, 0, 1]),
                          "bbox": [round(x, 1), round(y, 1), round(w, 1), round(h, 1)]})
            i += 1
    # निर्दोष दोहराव: असली गाँवों में रिश्तेदार कई खातों में आते हैं। एक नाम 2-3 खातों में, कोई गड़बड़ी नहीं।
    # इससे "एक नाम कई खातों में" अपने आप में सबूत नहीं रहता और ML को सचमुच फ़र्क़ सीखना पड़ता है।
    if rng.random() < 0.4:
        by_k: dict[str, list[dict]] = {}
        for p in plots:
            by_k.setdefault(p["khata"], []).append(p)
        family = _name(rng)
        for k in rng.sample(list(by_k), min(rng.randint(2, 3), len(by_k))):
            for p in by_k[k]:
                p["owners"][0]["name"] = family
    labels: dict[str, list[str]] = {}

    def tag(khasra: str, kind: str):
        labels.setdefault(khasra, []).append(kind)

    for idx, p in enumerate(list(plots)):
        if rng.random() > anomaly_rate:
            continue
        kind = rng.choice(KINDS)
        k = p["khasra"]
        if kind == "SHARE_SUM" and len(p["owners"]) > 1:
            p["owners"][-1]["share"] = round(p["owners"][-1]["share"] * 0.7, 3)
        elif kind == "AREA_MISMATCH":
            p["area_ha"] = round(p["area_ha"] * rng.uniform(1.3, 1.8), 3)
        elif kind == "MANY_TRANSFERS":
            p["transfers_last_2y"] = rng.randint(3, 6)
        elif kind == "DUP_KHASRA":
            dup = json.loads(json.dumps(p))
            dup["khata"] = str(900 + idx)
            dup["owners"] = [{"name": _name(rng), "share": 1.0}]
            plots.append(dup)
        elif kind == "OVERLAP" and idx > 0:
            nb = plots[idx - 1]
            p["bbox"][0] = round(nb["bbox"][0] + nb["bbox"][2] * 0.4, 1)
            p["bbox"][1] = round(nb["bbox"][1] + nb["bbox"][3] * 0.4, 1)
            tag(nb["khasra"], kind)
        elif kind == "SIMILAR_NAMES" and idx > 0:
            other = plots[idx - 1]["owners"][0]["name"].split()[0]
            p["owners"][0]["name"] = other
        else:
            continue
        tag(k, kind)
    soft = _inject_soft(rng, plots, labels, soft_rate)
    return {"village": vid, "record": {"district": "synthetic", "plots": plots}, "labels": labels,
            "soft_labels": soft}


def _inject_soft(rng: random.Random, plots: list[dict], labels: dict, soft_rate: float) -> dict[str, list[str]]:
    """संदर्भ वाली गड़बड़ियाँ। हर एक अलग-अलग देखने पर नियमों की नज़र में 'साफ़' रहती है (हिस्सा 1, क्षेत्रफल बराबर,
    transfers < 3), इसलिए सिर्फ़ गाँव के बाकी रिकॉर्ड से तुलना करने पर पकड़ में आती है।"""
    soft: dict[str, list[str]] = {}
    by_khata: dict[str, list[dict]] = {}
    for p in plots:
        by_khata.setdefault(p["khata"], []).append(p)
    # सिर्फ़ उन खातों को छेड़ते हैं जिनके किसी प्लॉट पर पहले से कोई नियम-वाली गड़बड़ी नहीं है
    clean = [k for k, ps in by_khata.items() if int(k) < 900 and not any(p["khasra"] in labels for p in ps)]

    # ACCUMULATION: एक ही आदमी/दलाल का नाम गाँव के कई अलग-अलग खातों में, हर जगह हाल का transfer
    if rng.random() < soft_rate and len(clean) >= 8:
        taken = {o["name"] for p in plots for o in p["owners"]}
        buyer = _name(rng)
        while buyer in taken:  # दलाल का नाम गाँव में पहले से न हो, वरना कोई "साफ़" प्लॉट भी यही पैटर्न दिखा देगा (लेबल की चूक)
            buyer = _name(rng)
        for k in rng.sample(clean, rng.randint(3, 6)):
            for p in by_khata[k]:
                p["owners"][0]["name"] = buyer
                p["transfers_last_2y"] = rng.choice([1, 2])
                soft.setdefault(p["khasra"], []).append("ACCUMULATION")
            clean.remove(k)

    # FRAGMENTED: एक छोटा प्लॉट कई (5-7) हिस्सेदारों में कटा हुआ, हाल के transfers के साथ (प्लॉटिंग-जैसा पैटर्न)
    for k in list(clean):
        ps = by_khata[k]
        if len(ps) != 1 or rng.random() > soft_rate / 3:
            continue
        p, n = ps[0], rng.randint(5, 7)
        w, h = rng.uniform(15, 28), rng.uniform(15, 28)
        p["bbox"][2], p["bbox"][3] = round(w, 1), round(h, 1)
        p["area_ha"] = p["map_area_ha"] = round(w * h / 10000, 3)
        p["owners"] = [{"name": _name(rng), "share": round(1 / n, 4)} for _ in range(n)]
        p["transfers_last_2y"] = rng.choice([1, 2])
        soft.setdefault(p["khasra"], []).append("FRAGMENTED")
    return soft


# ---------- तस्वीरें ----------
_DEVA_FONTS = ["/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf",
               "/usr/share/fonts/truetype/lohit-devanagari/Lohit-Devanagari.ttf",
               "/usr/share/fonts/truetype/freefont/FreeSans.ttf"]
_LATIN_FONTS = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/freefont/FreeSans.ttf"]


def _font(size: int, deva: bool):
    """(font, मिला?)। deva=True पर देवनागरी वाला फ़ॉन्ट न मिले तो मिला=False।"""
    from PIL import ImageFont
    for f in (_DEVA_FONTS if deva else _LATIN_FONTS):
        if Path(f).exists():
            return ImageFont.truetype(f, size), True
    return ImageFont.load_default(), False


def has_devanagari_font() -> bool:
    return _font(20, True)[1]


def _hi(text: str) -> str:
    return " ".join(HI.get(w, w) for w in text.split())


def truth_for(plots: list[dict], lang: str) -> dict:
    """तस्वीर के साथ लिखा जाने वाला सही उत्तर। hi में तस्वीर पर देवनागरी नाम छपते हैं, इसलिए सही उत्तर में भी वही
    होने चाहिए (वरना ocr_eval नाम कभी नहीं मिला पाता)। अंक/क्षेत्रफल दोनों भाषाओं में संख्या ही हैं।"""
    if lang != "hi":
        return {"plots": plots}
    return {"plots": [{**p, "owners": [{**o, "name": _hi(o["name"])} for o in p["owners"]]} for p in plots]}


def render_page(plots: list[dict], title: str = "Khatauni", lang: str = "en"):
    """lang='en': अंग्रेज़ी नाम और लैटिन अंक। lang='hi': देवनागरी नाम, अंक और शीर्षक (देवनागरी फ़ॉन्ट चाहिए)।"""
    from PIL import Image, ImageDraw
    hi = lang == "hi"
    font, ok = _font(30, hi)
    if hi and not ok:
        raise RuntimeError("देवनागरी फ़ॉन्ट नहीं मिला (fonts-noto-core या fonts-freefont-ttf install करें)।")
    img = Image.new("L", (1900, 90 + 52 * len(plots)), 245)
    d = ImageDraw.Draw(img)
    d.text((40, 20), "खतौनी" if hi else title, font=font, fill=20)
    d.text((40, 56), "खसरा  खाता  क्षेत्रफल  हिस्सेदार" if hi else "Khasra   Khata   Area(ha)   Owners and share",
           font=font, fill=60)
    for n, p in enumerate(plots):
        owners = ", ".join(f"{_hi(o['name']) if hi else o['name']} {o['share']}" for o in p["owners"])
        row = f"{p['khasra']}  {p['khata']}  {p['area_ha']:.3f}  {owners}"
        d.text((40, 100 + n * 52), row.translate(DEVA_DIGITS) if hi else row, font=font, fill=15)
    return img


def scan_effect(img, rng: random.Random, strength: float = 1.0):
    """घूमना, धुंधलापन, शोर, छाया: मोबाइल से खींची फ़ोटो जैसा।"""
    import numpy as np
    from PIL import ImageFilter
    img = img.rotate(rng.uniform(-1.5, 1.5) * strength, expand=True, fillcolor=240)
    img = img.filter(ImageFilter.GaussianBlur(0.6 * strength))
    a = np.asarray(img).astype("float32")
    nrng = np.random.default_rng(rng.randrange(10**6))
    a += nrng.normal(0, 6 * strength, a.shape)
    a *= np.linspace(1.0, 1.0 - 0.18 * strength, a.shape[1])[None, :]
    from PIL import Image
    return Image.fromarray(np.clip(a, 0, 255).astype("uint8"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--villages", type=int, default=50)
    ap.add_argument("--images", type=int, default=5, help="कितने गाँवों की तस्वीरें बनानी हैं")
    ap.add_argument("--no-images", action="store_true")
    ap.add_argument("--lang", choices=["auto", "hi", "en"], default="auto",
                    help="तस्वीर की भाषा; auto = देवनागरी फ़ॉन्ट मिले तो hi")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out", default="data/synthetic")
    a = ap.parse_args()
    lang = ("hi" if has_devanagari_font() else "en") if a.lang == "auto" else a.lang
    rng, out = random.Random(a.seed), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    with open(out / "villages.jsonl", "w", encoding="utf-8") as f:
        for v in range(a.villages):
            village = make_village(rng, v)
            f.write(json.dumps(village, ensure_ascii=False) + "\n")
            if not a.no_images and v < a.images:
                plots = village["record"]["plots"]
                for pg in range(0, len(plots), 12):
                    # तस्वीर के साथ उसी नाम की .json (सही उत्तर) भी लिखते हैं: python -m app.ocr_eval इसी से OCR नापता है
                    stem = out / f"village{v}_p{pg // 12}"
                    scan_effect(render_page(plots[pg:pg + 12], lang=lang), rng).save(f"{stem}.png")
                    Path(f"{stem}.json").write_text(json.dumps(truth_for(plots[pg:pg + 12], lang), ensure_ascii=False), encoding="utf-8")
    print(f"{a.villages} गाँव लिखे -> {out}" + ("" if a.no_images else f" (तस्वीरें: {lang})"))


if __name__ == "__main__":
    main()
