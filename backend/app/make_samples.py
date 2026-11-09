"""Frontend के लिए नमूना खतौनी स्कैन बनाता है (काल्पनिक गाँव, कोई असली व्यक्ति/ज़मीन नहीं)।
वही गाँव जो `/api/sample` देता है, ताकि "नमूना फ़ोटो डालो" और "नमूना गाँव खोलो" एक जैसे नतीजे दें।

चलाएँ:  python -m app.make_samples --out ../frontend/public/samples
बनता है: khatauni-hindi.jpg, khatauni-english.jpg, khatauni-hindi-2-pages.pdf"""
import argparse
import random
from pathlib import Path

from . import synth


def _village() -> list[dict]:
    from .service import SAMPLE_PLOTS, SAMPLE_SEED
    return synth.make_village(random.Random(SAMPLE_SEED), 1, n_plots=SAMPLE_PLOTS, anomaly_rate=0.3)["record"]["plots"]


def build(out: Path, seed: int = 5) -> list[Path]:
    out.mkdir(parents=True, exist_ok=True)
    plots, made = _village(), []
    for lang, name in (("hi", "khatauni-hindi.jpg"), ("en", "khatauni-english.jpg")):
        img = synth.scan_effect(synth.render_page(plots, lang=lang), random.Random(seed), 0.8).convert("L")
        img.save(out / name, quality=82, optimize=True)
        made.append(out / name)
    half = (len(plots) + 1) // 2
    pages = [synth.scan_effect(synth.render_page(part, lang="hi"), random.Random(seed + i), 0.8).convert("L")
             for i, part in enumerate((plots[:half], plots[half:]))]
    pdf = out / "khatauni-hindi-2-pages.pdf"
    pages[0].save(pdf, save_all=True, append_images=pages[1:], resolution=150)
    made.append(pdf)
    return made


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="../frontend/public/samples")
    for p in build(Path(ap.parse_args().out)):
        print(p, p.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
