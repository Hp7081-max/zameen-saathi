"""संपर्क संदेश: जाँच, honeypot, डिस्क की सीमा, और admin पहुँच।"""
import pytest

from app import contact


@pytest.fixture(autouse=True)
def tmp_data(monkeypatch, tmp_path):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    monkeypatch.delenv("ADMIN_TOKEN", raising=False)
    monkeypatch.delenv("MAX_CONTACT_FILE_MB", raising=False)


def ok(**kw):
    base = dict(name="राम", contact="9876543210", message="मुझे एक सुझाव देना है", kind="feedback")
    base.update(kw)
    return contact.clean(**base)


def test_clean_keeps_hindi_and_normalises():
    e = ok(name="  राम  ", kind="partner")
    assert e["name"] == "राम" and e["kind"] == "partner" and e["message"] == "मुझे एक सुझाव देना है" and e["t"].endswith("+00:00")


def test_unknown_kind_becomes_other_and_control_chars_are_removed():
    e = ok(kind="hack", message="hello\x00 world\x07!")
    assert e["kind"] == "other" and e["message"] == "hello world!"


def test_too_short_and_too_long_messages_are_rejected_in_both_languages():
    with pytest.raises(contact.ContactError) as a:
        ok(message="hi")
    assert a.value.status == 422 and a.value.args[0].en and str(a.value.args[0])
    with pytest.raises(contact.ContactError) as b:
        ok(message="x" * (contact.MAX_MESSAGE + 1))
    assert b.value.status == 422


def test_name_and_contact_are_trimmed_to_limits():
    e = ok(name="न" * 500, contact="1" * 500)
    assert len(e["name"]) == contact.MAX_NAME and len(e["contact"]) == contact.MAX_CONTACT


def test_honeypot_filled_means_bot_and_nothing_is_kept():
    assert ok(website="http://spam.example") is None


def test_save_and_read_newest_first(tmp_path):
    contact.save(ok(message="पहला संदेश है यह"))
    contact.save(ok(message="दूसरा संदेश है यह"))
    rows = contact.read_all()
    assert [r["message"] for r in rows] == ["दूसरा संदेश है यह", "पहला संदेश है यह"]
    assert (tmp_path / "contact.jsonl").read_text(encoding="utf-8").count("\n") == 2
    assert len(contact.read_all(limit=1)) == 1


def test_read_skips_broken_lines(tmp_path):
    contact.save(ok())
    with (tmp_path / "contact.jsonl").open("a", encoding="utf-8") as f:
        f.write("{broken\n")
    assert len(contact.read_all()) == 1


def test_full_file_refuses_new_messages(monkeypatch):
    monkeypatch.setenv("MAX_CONTACT_FILE_MB", "0.0001")  # ~100 बाइट
    contact.save(ok())
    with pytest.raises(contact.ContactError) as e:
        contact.save(ok())
    assert e.value.status == 503


def test_admin_is_off_without_token_and_checks_it_otherwise(monkeypatch):
    assert not contact.admin_enabled() and not contact.admin_ok("anything") and not contact.admin_ok(None)
    monkeypatch.setenv("ADMIN_TOKEN", "s3cret")
    assert contact.admin_enabled() and contact.admin_ok("s3cret")
    assert not contact.admin_ok("s3cre") and not contact.admin_ok("") and not contact.admin_ok(None)
