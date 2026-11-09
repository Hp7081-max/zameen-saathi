"""दो भाषाओं वाले संदेश। सर्वर भाषा का अंदाज़ा नहीं लगाता: जवाब में हिंदी और English दोनों जाते हैं,
और frontend वही दिखाता है जो उपयोगकर्ता ने चुना है।

`Msg` एक `str` है जिसकी कीमत हिंदी है (इसलिए `str(e)`, `match=` और पुराने टेस्ट जैसे थे चलते हैं),
और `.en` में English। HTTP त्रुटि में `detail` = {"hi": ..., "en": ...}।"""


class Msg(str):
    en: str

    def __new__(cls, hi: str, en: str):
        obj = super().__new__(cls, hi)
        obj.en = en
        return obj

    def detail(self) -> dict[str, str]:
        return {"hi": str(self), "en": self.en}


def detail_of(exc_or_msg) -> dict[str, str]:
    """Msg या उसे लेकर बनी exception से {"hi", "en"}। सादा str हो तो दोनों में वही (गलती से खाली न रहे)।"""
    m = exc_or_msg.args[0] if isinstance(exc_or_msg, BaseException) and exc_or_msg.args else exc_or_msg
    if isinstance(m, Msg):
        return m.detail()
    return {"hi": str(m), "en": str(m)}
