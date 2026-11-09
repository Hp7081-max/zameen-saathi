from pydantic import BaseModel, Field

DISCLAIMER = "यह कानूनी सलाह नहीं है। पक्की जानकारी के लिए तहसील, लेखपाल या वकील से मिलें।"
DISCLAIMER_EN = "This is not legal advice. For certainty, meet the tehsil, the lekhpal or a lawyer."


class Owner(BaseModel):
    name: str
    share: float  # प्लॉट का हिस्सा, 0 से 1


class Plot(BaseModel):
    khasra: str
    khata: str
    area_ha: float
    map_area_ha: float | None = None
    owners: list[Owner] = Field(default_factory=list)
    transfers_last_2y: int = 0
    bbox: list[float] | None = None  # नक्शे में [x, y, w, h] (मीटर)


class Record(BaseModel):
    district: str = "demo"
    plots: list[Plot]


class Flag(BaseModel):
    code: str
    severity: str  # high | medium | low
    plot: str
    reason_hi: str
    reason_en: str
    source: str  # rule | model


class ChecklistItem(BaseModel):
    code: str
    plots: list[str] = Field(default_factory=list)
    who_hi: str
    who_en: str
    docs_hi: list[str]
    docs_en: list[str]
    ask_hi: str
    ask_en: str


class AnalyzeResponse(BaseModel):
    summary_hi: str
    summary_en: str = ""
    plain_hi: list[str] = Field(default_factory=list)  # हर प्लॉट की सरल हिंदी व्याख्या
    plain_en: list[str] = Field(default_factory=list)
    flags: list[Flag]
    checklist: list[ChecklistItem] = Field(default_factory=list)
    disclaimer: str = DISCLAIMER
    disclaimer_en: str = DISCLAIMER_EN


class AskRequest(BaseModel):
    question: str
    lang: str = "auto"  # "hi" | "en" | "auto" (सवाल की लिपि से पहचान)


class AskResponse(BaseModel):
    answer: str
    sources: list[str]
    title: str = ""  # जिस शब्दावली-प्रविष्टि से जवाब मिला
    lang: str = "hi"  # जवाब किस भाषा के corpus से आया
    related: list[str] = Field(default_factory=list)  # मिलते-जुलते सवाल, एक टैप में पूछने के लिए
    disclaimer: str = DISCLAIMER
    disclaimer_en: str = DISCLAIMER_EN


class TopicsResponse(BaseModel):
    lang: str
    topics: list[str]


class OtpRequest(BaseModel):
    phone: str
    consent: bool


class VerifyRequest(BaseModel):
    phone: str
    otp: str


class OtpResponse(BaseModel):
    sent: bool = True
    debug_otp: str | None = None  # सिर्फ़ OTP_MODE=demo में


class SessionResponse(BaseModel):
    token: str
    expires_in: int
