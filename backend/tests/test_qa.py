"""Q&A: दो भाषाएँ, हिंदी/English/Hinglish सवाल, 'पता नहीं', सुझाए गए सवाल।"""
import pytest

from app import qa


@pytest.mark.parametrize("q,lang,title_has", [
    ("खसरा क्या होता है?", "hi", "खसरा"),
    ("दाखिल खारिज कैसे होता है", "hi", "दाखिल"),     # नुक़्ता वाले/बिना नुक़्ता वाले रूप
    ("जमीन की नाप कौन कराता है, पैमाइश", "hi", "पैमाइश"),
    ("What is a khatauni?", "en", "khatauni"),
    ("how does mutation work", "en", "mutation"),
    ("who is the lekhpal", "en", "lekhpal"),
])
def test_finds_the_right_entry(q, lang, title_has):
    r = qa.answer(q)
    assert r.lang == lang and title_has in r.title and r.sources == [f"glossary_{lang}.txt"]
    assert r.answer and not r.answer.startswith(r.title)  # जवाब में शीर्षक दोहराया नहीं


def test_hinglish_question_in_hindi_ui_matches_hindi_entry():
    r = qa.answer("khasra kya hai", lang="hi")
    assert r.lang == "hi" and "खसरा" in r.title and r.sources == ["glossary_hi.txt"]


def test_unknown_question_says_so_in_the_right_language():
    hi, en = qa.answer("बिटकॉइन का भाव क्या है"), qa.answer("what is the price of bitcoin")
    assert hi.sources == [] and "तहसील" in hi.answer
    assert en.sources == [] and "tehsil" in en.answer.lower()
    assert len(hi.related) == 3 and len(en.related) == 3  # भटके नहीं: आगे के रास्ते सुझाए


def test_common_question_words_alone_do_not_match():
    for q in ["क्या होता है", "what is the", "kya hai"]:
        assert qa.answer(q).sources == []


def test_related_excludes_the_answer_itself_and_has_no_duplicates():
    r = qa.answer("खसरा क्या होता है?")
    assert "खसरा क्या होता है?" not in r.related and len(set(r.related)) == len(r.related) <= 3


def test_topics_are_questions_in_each_language_and_hide_search_hints():
    hi, en = qa.topics("hi"), qa.topics("en")
    assert hi.lang == "hi" and len(hi.topics) >= 15 and len(en.topics) == len(hi.topics)
    assert all(t.endswith("?") for t in hi.topics + en.topics)
    assert not any("(" in t and any(c.isascii() and c.isalpha() for c in t.split("(")[1]) for t in hi.topics)
    assert qa.topics("xx").lang == "hi"  # अजान भाषा पर हिंदी


def test_every_topic_answers_itself():
    # corpus की हर प्रविष्टि अपने ही शीर्षक वाले सवाल पर मिलनी चाहिए
    for lang in ("hi", "en"):
        for topic in qa.topics(lang).topics:
            r = qa.answer(topic, lang)
            assert r.sources, topic
            assert r.title.rstrip("?") in topic, (topic, r.title)


def test_corpus_languages_are_parallel():
    assert len(qa._load("hi")) == len(qa._load("en"))


def test_language_suffix_decides_which_files_are_read(tmp_path, monkeypatch):
    (tmp_path / "x_hi.txt").write_text("शब्दएक पहला: हिंदी जवाब शब्दएक शब्दएक", encoding="utf-8")
    (tmp_path / "x_en.txt").write_text("wordone first: english answer wordone wordone", encoding="utf-8")
    (tmp_path / "both.txt").write_text("साझा sharedword: दोनों में sharedword sharedword", encoding="utf-8")
    monkeypatch.setattr(qa, "CORPUS_DIR", tmp_path)
    assert qa.answer("शब्दएक", "hi").sources == ["x_hi.txt"]
    assert qa.answer("wordone", "en").sources == ["x_en.txt"]
    assert qa.answer("sharedword", "hi").sources == ["both.txt"] == qa.answer("sharedword", "en").sources
    assert qa.answer("wordone", "hi").sources == []  # दूसरी भाषा की फ़ाइल नहीं पढ़ी जाती
