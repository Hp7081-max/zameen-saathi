"""अपलोड और विश्लेषण का लॉजिक (FastAPI के बिना)।"""
import pytest

from app import service
from app.ocr import DEMO_RECORD

PDF_STUB = b"%PDF-1.4\n%not a real document, demo engine ignores it\n"


@pytest.fixture(autouse=True)
def demo_engine(monkeypatch):
    monkeypatch.setenv("OCR_ENGINE", "demo")


def test_unknown_type_is_415():
    with pytest.raises(service.DocError) as e:
        service.extract_document(b"hello", "notes.txt")
    assert e.value.status == 415


def test_too_big_is_413():
    with pytest.raises(service.DocError) as e:
        service.extract_document(b"x" * (service.MAX_BYTES + 1), "a.png")
    assert e.value.status == 413


def test_image_and_pdf_are_accepted():
    assert service.extract_document(b"x", "a.JPG") == DEMO_RECORD
    assert service.extract_document(PDF_STUB, "scan.pdf") == DEMO_RECORD


def test_pdf_detected_by_content_even_with_wrong_extension():
    assert service.extract_document(PDF_STUB, "scan") == DEMO_RECORD


def test_unreadable_image_is_422_not_500(monkeypatch):
    monkeypatch.setenv("OCR_ENGINE", "tesseract")
    with pytest.raises(service.DocError) as e:
        service.extract_document(b"this is not an image", "a.png")
    assert e.value.status == 422 and "फ़ाइल" in e.value.msg


def test_broken_pdf_is_422(monkeypatch):
    monkeypatch.setenv("OCR_ENGINE", "tesseract")
    with pytest.raises(service.DocError) as e:
        service.extract_document(b"%PDF-1.4 broken", "a.pdf")
    assert e.value.status == 422 and "PDF" in e.value.msg


def test_analyze_demo_record():
    r = service.analyze_record(DEMO_RECORD)
    codes = {f.code for f in r.flags}
    assert {"SHARE_SUM", "AREA_MISMATCH", "DUP_KHASRA", "MANY_TRANSFERS"} <= codes
    assert len(r.plain_hi) == 3 and "3 प्लॉट" in r.summary_hi
    assert [f.severity for f in r.flags] == sorted((f.severity for f in r.flags), key=["high", "medium", "low"].index)


def test_model_flag_not_repeated_where_rules_already_flagged():
    r = service.analyze_record(DEMO_RECORD)
    rule_plots = {f.plot for f in r.flags if f.source == "rule"}
    assert not [f for f in r.flags if f.source == "model" and f.plot in rule_plots]
