"""Grounded Q&A: जवाब सिर्फ़ corpus/*.txt से। कुछ न मिले तो 'पता नहीं'। बाद में embeddings + LLM यहीं जुड़ेंगे।"""
import re
from pathlib import Path

from .schemas import AskResponse

CORPUS_DIR = Path(__file__).parent / "corpus"
MIN_OVERLAP = 2


def _tokens(text: str) -> set[str]:
    return {t for t in re.split(r"[\s,.;:?!()\-।]+", text.lower()) if len(t) > 2}


def _load() -> list[tuple[str, str]]:
    chunks = []
    for f in sorted(CORPUS_DIR.glob("*.txt")):
        for para in f.read_text(encoding="utf-8").split("\n\n"):
            if para.strip():
                chunks.append((f.name, para.strip()))
    return chunks


def answer(question: str) -> AskResponse:
    q = _tokens(question)
    best, best_score = None, 0
    for source, para in _load():
        score = len(q & _tokens(para))
        if score > best_score:
            best, best_score = (source, para), score
    if best is None or best_score < MIN_OVERLAP:
        return AskResponse(answer="मुझे इसका भरोसेमंद जवाब नहीं मिला। कृपया तहसील या लेखपाल से पूछें।", sources=[])
    return AskResponse(answer=best[1], sources=[best[0]])
