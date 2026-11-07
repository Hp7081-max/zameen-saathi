"""ML फ़ीचर्स: हर प्लॉट के लिए, पूरे रिकॉर्ड (गाँव) के संदर्भ में। सब dict पर चलता है (pydantic नहीं चाहिए)।

पहले 5 फ़ीचर वही पुराने हैं जो सिर्फ़ एक प्लॉट देखकर बनते हैं (BASE_N); बाकी 5 पूरे रिकॉर्ड से तुलना करके बनते हैं
और वही ऐसे पैटर्न दिखाते हैं जो नियम (rules.py) नहीं पकड़ते।"""
from collections import defaultdict
from statistics import median

import numpy as np

NAMES = ["area_ha", "area_ratio", "n_owners", "transfers", "share_dev",       # एक प्लॉट से
         "owner_khata_spread", "khata_plots", "area_vs_median", "min_share", "owners_per_ha"]  # संदर्भ से
BASE_N = 5


def _norm(name: str) -> str:
    return " ".join(name.lower().replace(".", "").split())


def plot_features(plots: list[dict]) -> np.ndarray:
    """plots: dict की सूची (khasra, khata, area_ha, map_area_ha, owners[{name, share}], transfers_last_2y)।
    लौटाता है (len(plots), len(NAMES)) की सारणी।"""
    if not plots:
        return np.zeros((0, len(NAMES)))
    khatas_of_name: dict[str, set] = defaultdict(set)
    plots_in_khata: dict[str, int] = defaultdict(int)
    for p in plots:
        plots_in_khata[p["khata"]] += 1
        for o in p["owners"]:
            khatas_of_name[_norm(o["name"])].add(p["khata"])
    med = median(p["area_ha"] for p in plots) or 1.0
    rows = []
    for p in plots:
        owners = p["owners"]
        n, total = len(owners), sum(o["share"] for o in owners)
        mp = p.get("map_area_ha")
        rows.append([
            p["area_ha"],
            p["area_ha"] / mp if mp else 1.0,
            n,
            p.get("transfers_last_2y", 0),
            abs(total - 1.0) if n else 0.0,
            max((len(khatas_of_name[_norm(o["name"])]) for o in owners), default=0),
            plots_in_khata[p["khata"]],
            p["area_ha"] / med,
            min((o["share"] for o in owners), default=1.0),
            n / max(p["area_ha"], 0.01),
        ])
    return np.array(rows, dtype=float)
