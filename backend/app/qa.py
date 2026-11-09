"""Grounded Q&A: जवाब सिर्फ़ corpus/*.txt से, दो भाषाओं में। कुछ न मिले तो 'पता नहीं'। बाद में embeddings + LLM यहीं जुड़ेंगे।

corpus की फ़ाइल का नाम भाषा तय करता है: `*_hi.txt` हिंदी, `*_en.txt` English, बिना प्रत्यय वाली फ़ाइल दोनों के लिए।
हर प्रविष्टि एक अनुच्छेद है: "शीर्षक: जवाब"। शीर्षक का मेल जवाब के मेल से 3 गुना वज़न पाता है।
हिंदी के शीर्षक में कोष्ठक में लैटिन शब्द (जैसे "(khasra)") रखो, ताकि Hinglish में टाइप किया सवाल भी मिले;
स्क्रीन पर वह कोष्ठक छिपा दिया जाता है।"""
import re
import unicodedata
from pathlib import Path

from .schemas import AskResponse, TopicsResponse

CORPUS_DIR = Path(__file__).parent / "corpus"
MIN_SCORE = 3
LANGS = ("hi", "en")

NO_ANSWER = {
    "hi": "मुझे इसका भरोसेमंद जवाब नहीं मिला। कृपया तहसील या लेखपाल से पूछें।",
    "en": "I could not find a reliable answer to this. Please ask the tehsil or the lekhpal.",
}

# सवाल के आम शब्द जिनसे किसी विषय का पता नहीं चलता (वरना "क्या होता है" हर शीर्षक से मेल खा जाए)
_STOP = set("""क्या होता होती होते है हैं हो था थी थे मतलब अर्थ कैसे क्यों कौन कहाँ कहां किसे किसको कब कितना कितनी कितने
बताओ बताइए बताएं बताये मुझे मेरा मेरी मेरे और या में से का की के को पर यह वह ये वे कोई जी भी तो हम आप
what the and for how does are this that with from can mean means meaning which who why when where tell about please
kya hota hoti hote hai hain kaise kyu kyun kaun kahan kab ko ka ki ke mein me se aur ya hota explain define is was
a an of to in on do did you your my me""".split())
_SPLIT = re.compile(r"[\s,.;:?!()\[\]\-–—/\"'“”‘’।|]+")
_DEVA_END = re.compile(r"[ािीुूृेैोौंँः]+$")


def _norm(text: str) -> str:
    # नुक़्ता हटाओ: "ज़मीन"/"जमीन", "ख़ारिज"/"खारिज" एक ही गिने जाएँ
    return unicodedata.normalize("NFD", text.lower()).replace("़", "")


def _stem(tok: str) -> str:
    if "ऀ" <= tok[0] <= "ॿ":
        return (_DEVA_END.sub("", tok) or tok) if len(tok) > 3 else tok
    return tok[:-1] if len(tok) > 3 and tok.endswith("s") and not tok.endswith("ss") else tok


def _tokens(text: str) -> set[str]:
    return {_stem(t) for t in _SPLIT.split(_norm(text)) if len(t) > 1 and t not in _STOP}


def detect_lang(text: str) -> str:
    deva = sum("ऀ" <= c <= "ॿ" for c in text)
    latin = sum(c.isascii() and c.isalpha() for c in text)
    return "hi" if deva >= latin and deva > 0 else "en"


def _file_lang(path: Path) -> str | None:
    stem = path.stem.lower()
    return next((lg for lg in LANGS if stem.endswith("_" + lg)), None)


def _load(lang: str) -> list[dict]:
    """[{source, heading, body, h, b}] उस भाषा की (और बिना-भाषा वाली) फ़ाइलों से।"""
    chunks = []
    for f in sorted(CORPUS_DIR.glob("*.txt")):
        if _file_lang(f) not in (lang, None):
            continue
        for para in f.read_text(encoding="utf-8").split("\n\n"):
            para = para.strip()
            if not para:
                continue
            head, sep, body = para.partition(":")
            if not sep or len(head) > 90:
                head, body = "", para
            chunks.append({"source": f.name, "heading": head.strip(), "body": body.strip(),
                           "h": _tokens(head), "b": _tokens(body)})
    return chunks


def _display(heading: str, lang: str) -> str:
    if lang == "hi":  # "(khasra)" जैसे खोज-संकेत स्क्रीन पर नहीं
        heading = re.sub(r"\s*\([^)]*[A-Za-z][^)]*\)", "", heading)
    return heading.strip()


def _as_question(heading: str, lang: str) -> str:
    h = _display(heading, lang)
    return h if h.endswith("?") else h + "?"


def topics(lang: str = "hi") -> TopicsResponse:
    lang = lang if lang in LANGS else "hi"
    return TopicsResponse(lang=lang, topics=[_as_question(c["heading"], lang) for c in _load(lang) if c["heading"]])


def answer(question: str, lang: str = "auto") -> AskResponse:
    lang = lang if lang in LANGS else detect_lang(question)
    q = _tokens(question)
    chunks = [c for c in _load(lang) if c["heading"]]
    scored = []
    for c in chunks:
        score = 3 * len(q & c["h"]) + len(q & (c["b"] - c["h"]))
        if score:
            scored.append((score, c))
    scored.sort(key=lambda x: -x[0])
    if not scored or scored[0][0] < MIN_SCORE:
        return AskResponse(answer=NO_ANSWER[lang], sources=[], lang=lang,
                           related=[_as_question(c["heading"], lang) for c in chunks[:3]])
    best = scored[0][1]
    rest = [c for _, c in scored[1:] if c["heading"]] + [c for c in chunks if c is not best]
    related, seen = [], {best["heading"]}
    for c in rest:
        if c["heading"] not in seen:
            seen.add(c["heading"])
            related.append(_as_question(c["heading"], lang))
        if len(related) == 3:
            break
    return AskResponse(answer=best["body"], sources=[best["source"]], title=_display(best["heading"], lang),
                       lang=lang, related=related)
