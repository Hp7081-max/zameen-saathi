from app import qa
from app.explain import explain
from app.ocr import DEMO_RECORD
from app.rules import run_rules


def test_demo_record_flags():
    codes = {f.code for f in run_rules(DEMO_RECORD)}
    assert {"SHARE_SUM", "AREA_MISMATCH", "DUP_KHASRA", "MANY_TRANSFERS", "SIMILAR_NAMES"} <= codes


def test_explain_hindi():
    lines = explain(DEMO_RECORD)
    assert len(lines) == 3 and "आधा" in lines[0]


def test_qa_known_term():
    r = qa.answer("खसरा क्या होता है?")
    assert r.sources == ["glossary_hi.txt"]


def test_qa_says_dont_know():
    assert qa.answer("bitcoin ka bhav kya hai").sources == []
