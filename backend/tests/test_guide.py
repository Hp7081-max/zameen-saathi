from app.explain import explain_en
from app.guide import checklist
from app.ocr import DEMO_RECORD
from app.rules import run_rules


def test_checklist_is_deduped_and_bilingual():
    items = checklist(run_rules(DEMO_RECORD))
    codes = [i.code for i in items]
    assert len(codes) == len(set(codes)) and {"SHARE_SUM", "AREA_MISMATCH", "DUP_KHASRA"} <= set(codes)
    dup = next(i for i in items if i.code == "DUP_KHASRA")
    assert dup.plots == ["101"] and dup.who_hi and dup.who_en and dup.ask_en
    assert "Photo ID (Aadhaar or voter ID)" in dup.docs_en and "पहचान पत्र (आधार या वोटर आईडी)" in dup.docs_hi


def test_no_flags_no_checklist():
    assert checklist([]) == []


def test_english_explanation():
    lines = explain_en(DEMO_RECORD)
    assert len(lines) == 3 and "half" in lines[0] and lines[0].startswith("Khasra 101")
