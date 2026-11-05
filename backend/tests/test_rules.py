from app.ocr import DEMO_RECORD
from app.rules import run_rules
from app import qa


def test_demo_record_flags():
    codes = {f.code for f in run_rules(DEMO_RECORD)}
    assert {"SHARE_SUM", "AREA_MISMATCH", "DUP_KHASRA", "MANY_TRANSFERS", "SIMILAR_NAMES"} <= codes


def test_qa_says_dont_know_without_corpus():
    r = qa.answer("mutation kaise hota hai")
    assert r.sources == []
