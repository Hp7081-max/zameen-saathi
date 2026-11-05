"""OCR adapter. Asli engine (PaddleOCR / Tesseract-hin) baad me yahin judega, baaki code nahi badlega."""
import os
from typing import Protocol

from .schemas import Owner, Plot, Record

DEMO_RECORD = Record(district="demo", plots=[
    Plot(khasra="101", khata="12", area_ha=0.52, map_area_ha=0.52,
         owners=[Owner(name="Ramesh", share=0.5), Owner(name="Suresh", share=0.5)]),
    Plot(khasra="102", khata="12", area_ha=1.20, map_area_ha=0.80,
         owners=[Owner(name="Sita Devi", share=0.6), Owner(name="Mohan", share=0.3)]),
    Plot(khasra="101", khata="15", area_ha=0.52, map_area_ha=0.52,
         owners=[Owner(name="Ramesh Kr.", share=1.0)], transfers_last_2y=4),
])


class OcrEngine(Protocol):
    def extract(self, data: bytes, filename: str) -> Record: ...


class DemoOcr:
    def extract(self, data: bytes, filename: str) -> Record:
        return DEMO_RECORD


def get_engine() -> OcrEngine:
    name = os.getenv("OCR_ENGINE", "demo")
    if name == "demo":
        return DemoOcr()
    raise NotImplementedError(f"OCR engine '{name}' abhi nahi bana")
