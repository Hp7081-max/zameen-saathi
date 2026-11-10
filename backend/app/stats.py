"""अनाम गिनतियाँ: होम पन्ने के "लाइव असर" के लिए।

सिर्फ़ संख्याएँ रखी जाती हैं (कितने लॉगिन, कितनी फ़ाइलें, कितने खसरे, कितनी जाँच, कितने संकेत)।
फ़ोन नंबर, नाम, फ़ाइल या खतौनी का कोई ब्यौरा यहाँ कभी नहीं आता।

गिनती memory में रहती है; `DATA_DIR` तय हो तो `stats.json` में भी लिखी जाती है (सर्वर दोबारा चले तो गिनती बची रहे)।
एक से ज़्यादा instance चलें तो हर instance की अपनी गिनती होगी (Redis में नहीं रखी, क्योंकि Redis की `incr` यहाँ TTL के साथ बनी है)।
"""
import json
import os
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

FIELDS = ("logins", "files_read", "plots_read", "analyses", "flags_found", "flags_high")

_lock = threading.Lock()
_counts: dict[str, int] = {k: 0 for k in FIELDS}
_since: float = time.time()
_loaded = False


def _file() -> Path | None:
    d = os.getenv("DATA_DIR", "").strip()
    return Path(d) / "stats.json" if d else None


def _load() -> None:
    """पहली बार: फ़ाइल हो तो पुरानी गिनती उठाओ। ख़राब फ़ाइल पर चुपचाप शून्य से शुरू।"""
    global _loaded, _since
    if _loaded:
        return
    _loaded = True
    p = _file()
    if not p or not p.exists():
        return
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        for k in FIELDS:
            v = data.get("counts", {}).get(k, 0)
            _counts[k] = v if isinstance(v, int) and v >= 0 else 0
        s = data.get("since")
        if isinstance(s, (int, float)) and 0 < s <= time.time():
            _since = float(s)
    except (OSError, ValueError, AttributeError):
        pass


def _save() -> None:
    p = _file()
    if not p:
        return
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        tmp = p.with_suffix(".tmp")
        tmp.write_text(json.dumps({"since": _since, "counts": _counts}), encoding="utf-8")
        os.replace(tmp, p)  # आधी लिखी फ़ाइल कभी नहीं दिखती
    except OSError:
        pass  # गिनती सर्वोत्तम-प्रयास है; डिस्क न चले तो भी ऐप न रुके


def bump(**inc: int) -> None:
    """जैसे bump(analyses=1, flags_found=3)। अनजानी या ऋणात्मक कुंजी अनदेखी।"""
    with _lock:
        _load()
        changed = False
        for k, n in inc.items():
            if k in _counts and isinstance(n, int) and n > 0:
                _counts[k] += n
                changed = True
        if changed:
            _save()


def snapshot() -> dict:
    with _lock:
        _load()
        return {"since": datetime.fromtimestamp(_since, timezone.utc).isoformat(timespec="seconds"), **_counts}


def reset_for_tests() -> None:
    global _since, _loaded
    with _lock:
        for k in FIELDS:
            _counts[k] = 0
        _since, _loaded = time.time(), False
