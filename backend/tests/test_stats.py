"""अनाम गिनतियाँ: बढ़ना, फ़ाइल से लौटना, ख़राब फ़ाइल, और कि कोई निजी चीज़ नहीं रखी जाती।"""
import json

import pytest

from app import stats


@pytest.fixture(autouse=True)
def fresh(monkeypatch, tmp_path):
    monkeypatch.delenv("DATA_DIR", raising=False)
    stats.reset_for_tests()
    yield
    stats.reset_for_tests()


def test_starts_at_zero_and_bumps():
    s = stats.snapshot()
    assert all(s[k] == 0 for k in stats.FIELDS) and s["since"].endswith("+00:00")
    stats.bump(analyses=1, flags_found=3, flags_high=1)
    stats.bump(analyses=1)
    s = stats.snapshot()
    assert (s["analyses"], s["flags_found"], s["flags_high"], s["logins"]) == (2, 3, 1, 0)


def test_unknown_negative_and_zero_are_ignored():
    stats.bump(secret=5, analyses=-3, plots_read=0, logins=0)
    assert set(stats.snapshot()) == {"since", *stats.FIELDS}
    assert stats.snapshot()["analyses"] == 0


def test_persists_to_data_dir_and_reloads(monkeypatch, tmp_path):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    stats.bump(files_read=2, plots_read=14)
    saved = json.loads((tmp_path / "stats.json").read_text())
    assert saved["counts"]["plots_read"] == 14
    stats.reset_for_tests()  # सर्वर दोबारा चला
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    assert stats.snapshot()["plots_read"] == 14
    stats.bump(plots_read=1)
    assert stats.snapshot()["plots_read"] == 15


def test_corrupt_file_starts_from_zero(monkeypatch, tmp_path):
    (tmp_path / "stats.json").write_text("{ not json")
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    assert stats.snapshot()["analyses"] == 0
    stats.bump(analyses=1)
    assert stats.snapshot()["analyses"] == 1


def test_negative_counts_in_file_are_not_trusted(monkeypatch, tmp_path):
    (tmp_path / "stats.json").write_text(json.dumps({"since": 1, "counts": {"analyses": -5, "logins": "x", "files_read": 7}}))
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    s = stats.snapshot()
    assert (s["analyses"], s["logins"], s["files_read"]) == (0, 0, 7)


def test_unwritable_dir_does_not_break(monkeypatch, tmp_path):
    blocker = tmp_path / "file"
    blocker.write_text("x")  # फ़ाइल को "डायरेक्टरी" बताओ: mkdir फेल होगा
    monkeypatch.setenv("DATA_DIR", str(blocker / "sub"))
    stats.bump(analyses=1)  # चुपचाप चलता है
    assert stats.snapshot()["analyses"] == 1
