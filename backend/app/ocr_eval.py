"""OCR की सटीकता नापना (खेत-दर-खेत)।   python -m app.ocr_eval --dir data/synthetic
फ़ोल्डर में फ़ोटो/PDF (x.png) और उसी नाम का सही उत्तर (x.json, {"plots": [...]}) चाहिए।
synthetic के लिए `python -m app.synth --villages 5 --images 5` दोनों बना देता है।
असली सहमति वाले नमूनों पर भी यही चलाओ: सही उत्तर हाथ से JSON में भर दो।"""
import argparse
import json
import os
from pathlib import Path


def _norm(n: str) -> str:
    return " ".join(n.lower().replace(".", "").split())


def compare(truth: list[dict], got: list) -> dict:
    g = {(p.khasra, p.khata): p for p in got}
    keys = {(t["khasra"], t["khata"]) for t in truth}
    c = {"rows": len(truth), "found": 0, "area": 0, "names": 0, "shares": 0, "extra": sum(1 for k in g if k not in keys)}
    for t in truth:
        p = g.get((t["khasra"], t["khata"]))
        if not p:
            continue
        c["found"] += 1
        c["area"] += abs(p.area_ha - t["area_ha"]) < 0.0005
        want = {(_norm(o["name"]), round(o["share"], 3)) for o in t["owners"]}
        have = {(_norm(o.name), round(o.share, 3)) for o in p.owners}
        c["names"] += {n for n, _ in want} == {n for n, _ in have}
        c["shares"] += want == have
    return c


def summarize(c: dict) -> dict:
    pct = lambda a, b: round(100 * a / b, 1) if b else None
    return {"पंक्तियाँ (सही उत्तर में)": c["rows"], "मिलीं %": pct(c["found"], c["rows"]),
            "क्षेत्रफल सही % (मिली में से)": pct(c["area"], c["found"]),
            "मालिकों के नाम सही %": pct(c["names"], c["found"]),
            "हिस्से सही %": pct(c["shares"], c["found"]), "फ़ालतू पंक्तियाँ": c["extra"]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="data/synthetic")
    a = ap.parse_args()
    os.environ.setdefault("OCR_ENGINE", "tesseract")
    from .ocr import get_engine
    engine, tot = get_engine(), {"rows": 0, "found": 0, "area": 0, "names": 0, "shares": 0, "extra": 0}
    files = sorted(p for p in Path(a.dir).iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".pdf") and p.with_suffix(".json").exists())
    if not files:
        raise SystemExit("कोई (फ़ोटो + .json) जोड़ी नहीं मिली। पहले: python -m app.synth --villages 5 --images 5")
    for f in files:
        truth = json.loads(f.with_suffix(".json").read_text(encoding="utf-8"))["plots"]
        try:
            c = compare(truth, engine.extract(f.read_bytes(), f.name).plots)
        except ValueError:  # कुछ पढ़ा ही नहीं गया
            c = {"rows": len(truth), "found": 0, "area": 0, "names": 0, "shares": 0, "extra": 0}
        for k in tot:
            tot[k] += c[k]
    print(json.dumps({"फ़ाइलें": len(files), **summarize(tot)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
