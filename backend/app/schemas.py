from pydantic import BaseModel, Field

DISCLAIMER = "Yeh kanooni salah nahi hai. Pakki jaankari ke liye tehsil, lekhpal ya vakil se milein."


class Owner(BaseModel):
    name: str
    share: float  # plot ka hissa, 0 se 1


class Plot(BaseModel):
    khasra: str
    khata: str
    area_ha: float
    map_area_ha: float | None = None
    owners: list[Owner] = Field(default_factory=list)
    transfers_last_2y: int = 0


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


class AnalyzeResponse(BaseModel):
    summary_hi: str
    flags: list[Flag]
    disclaimer: str = DISCLAIMER


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    sources: list[str]
    disclaimer: str = DISCLAIMER
