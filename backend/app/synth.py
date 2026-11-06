"""Synthetic गाँव जनरेटर: नक्शा + खतौनी + लेबल वाली गड़बड़ियाँ + (वैकल्पिक) स्कैन जैसी तस्वीरें।
कोई असली व्यक्ति/ज़मीन नहीं। Pydantic की ज़रूरत नहीं, सब dict है।

चलाएँ:  python -m app.synth --villages 50 --images 5 --out data/synthetic
"""
import argparse
import json
import random
from pathlib import Path

FIRST = ["Ramesh", "Suresh", "Mohan", "Sita", "Geeta", "Ram", "Shyam", "Rajesh", "Sunita", "Kamla",
         "Lakshmi", "Dinesh", "Mahesh", "Savitri", "Hari", "Radha", "Vijay", "Anil", "Pushpa", "Bhola"]
LAST = ["Devi", "Kumar", "Yadav", "Singh", "Verma", "Maurya", "Pal", "Gupta", "Lal", "Prasad"]
SHARE_SETS = {1: [[1.0]], 2: [[0.5, 0.5], [0.75, 0.25]], 3: [[0.5, 0.25, 0.25]], 4: [[0.25] * 4]}
KINDS = ["SHARE_SUM", "AREA_MISMATCH", "MANY_TRANSFERS", "DUP_KHASRA", "OVERLAP", "SIMILAR_NAMES"]
# हल्के संकेत: rules की सीमा से नीचे रहते हैं, इन्हें सिर्फ़ ML अनुमान से पकड़ा जाता है (यह हमारी synthetic मान्यता है)
SOFT_KINDS = ["AREA_DRIFT", "REPEAT_OWNER"]


def _name(rng: random.Random) -> str:
    return f"{rng.choice(FIRST)} {rng.choice(LAST)}"


def make_village(rng: random.Random, vid: int, n_plots: int = 24, anomaly_rate: float = 0.15) -> dict:
    """एक गाँव = एक Record + labels. नक्शा 6 कॉलम की ग्रिड है, हर प्लॉट अपने सेल में, इसलिए साफ़ रिकॉर्ड में ओवरलैप नहीं।"""
    plots, khata, i = [], 0, 0
    while i < n_plots:
        khata += 1
        owners_n = rng.choice([1, 1, 2, 2, 3, 4])
        shares = rng.choice(SHARE_SETS[owners_n])
        names = list({_name(rng) for _ in range(owners_n)})
        while len(names) < owners_n:
            names.append(_name(rng))
        for _ in range(rng.choice([1, 1, 2, 3])):
            if i >= n_plots:
                break
            r, c = divmod(i, 6)
            w, h = rng.uniform(40, 90), rng.uniform(40, 90)
            x, y = c * 100 + rng.uniform(0, 100 - w), r * 100 + rng.uniform(0, 100 - h)
            area = round(w * h / 10000, 3)
            plots.append({"khasra": str(100 + i), "khata": str(khata), "area_ha": round(area * rng.gauss(1.0, 0.015), 3), "map_area_ha": area,
                          "owners": [{"name": n, "share": s} for n, s in zip(names, shares)],
                          "transfers_last_2y": rng.choice([0, 0, 0, 1, 1, 2]),
                          "bbox": [round(x, 1), round(y, 1), round(w, 1), round(h, 1)]})
            i += 1
    labels: dict[str, list[str]] = {}

    def tag(khasra: str, kind: str):
        labels.setdefault(khasra, []).append(kind)

    for idx, p in enumerate(list(plots)):
        if rng.random() > anomaly_rate:
            continue
        kind = rng.choice(KINDS + SOFT_KINDS)
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
        elif kind == "AREA_DRIFT":
            p["area_ha"] = round(p["area_ha"] * rng.uniform(1.025, 1.045), 3)
        elif kind == "REPEAT_OWNER":
            name = p["owners"][0]["name"]
            far = [q for q in plots if q["khata"] != p["khata"]]
            for q in rng.sample(far, min(3, len(far))):
                q["owners"][0]["name"] = name
                q["transfers_last_2y"] = max(q["transfers_last_2y"], 2)
                tag(q["khasra"], kind)
            p["transfers_last_2y"] = max(p["transfers_last_2y"], 2)
        else:
            continue
        tag(k, kind)
    return {"village": vid, "record": {"district": "synthetic", "plots": plots}, "labels": labels}


# ---------- तस्वीरें ----------
_FONTS = ["/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf",
          "/usr/share/fonts/truetype/lohit-devanagari/Lohit-Devanagari.ttf",
          "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]


def _font(size: int):
    from PIL import ImageFont
    for f in _FONTS:
        if Path(f).exists():
            return ImageFont.truetype(f, size), "Devanagari" in f or "Lohit" in f
    return ImageFont.load_default(), False


def render_page(plots: list[dict], title: str = "Khatauni"):
    from PIL import Image, ImageDraw
    font, deva = _font(30)
    img = Image.new("L", (1700, 90 + 52 * len(plots)), 245)
    d = ImageDraw.Draw(img)
    d.text((40, 20), "खतौनी" if deva else title, font=font, fill=20)
    d.text((40, 56), "Khasra   Khata   Area(ha)   Owners and share" if not deva else "खसरा  खाता  क्षेत्रफल  हिस्सेदार", font=font, fill=60)
    for n, p in enumerate(plots):
        row = f"{p['khasra']}  {p['khata']}  {p['area_ha']:.3f}  " + ", ".join(f"{o['name']} {o['share']}" for o in p["owners"])
        d.text((40, 100 + n * 52), row, font=font, fill=15)
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
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out", default="data/synthetic")
    a = ap.parse_args()
    rng, out = random.Random(a.seed), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    with open(out / "villages.jsonl", "w", encoding="utf-8") as f:
        for v in range(a.villages):
            village = make_village(rng, v)
            f.write(json.dumps(village, ensure_ascii=False) + "\n")
            if not a.no_images and v < a.images:
                plots = village["record"]["plots"]
                for pg in range(0, len(plots), 12):
                    scan_effect(render_page(plots[pg:pg + 12]), rng).save(out / f"village{v}_p{pg // 12}.png")
    print(f"{a.villages} गाँव लिखे -> {out}")


if __name__ == "__main__":
    main()
