import json
import os
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    import google.generativeai as genai
except ImportError:
    genai = None

app = FastAPI(title="OmniYield API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if genai and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class AnalysisResult(BaseModel):
    root_cause: str
    repair_action: str
    confidence: str
    telemetry_flags: list[str]


def analyze_telemetry(telemetry: dict) -> list[str]:
    flags = []
    temp = telemetry.get("temperature")
    vibration = telemetry.get("vibration")
    pressure = telemetry.get("pressure")

    if temp is not None and float(temp) > 85:
        flags.append(f"Temperature critical: {temp}°C exceeds 85°C threshold")
    if vibration is not None and float(vibration) > 4.5:
        flags.append(f"Vibration critical: {vibration}mm/s exceeds 4.5mm/s threshold")
    if pressure is not None and float(pressure) > 150:
        flags.append(f"Pressure critical: {pressure}psi exceeds 150psi threshold")
    if not flags:
        flags.append("All telemetry within nominal range")
    return flags


def build_prompt(telemetry: dict, manual_text: str, telemetry_flags: list[str]) -> str:
    return f"""You are OmniYield, an industrial diagnostic AI agent. You have three inputs:

1. An image of a defective machine part (attached).
2. Live sensor telemetry: {json.dumps(telemetry)}
3. Relevant excerpt from the machine's repair manual:
---
{manual_text}
---

Telemetry analysis flags: {', '.join(telemetry_flags)}

Cross-reference the visual defect in the image with the telemetry readings and the manual excerpt.
Respond ONLY with strict JSON in this exact schema, no markdown fences, no extra text:
{{
  "root_cause": "<concise diagnosis combining visual + telemetry evidence>",
  "repair_action": "<specific, actionable repair step referencing the manual>",
  "confidence": "<low|medium|high>"
}}
"""


def run_gemini_agent(image_bytes: bytes, mime_type: str, telemetry: dict, manual_text: str, telemetry_flags: list[str]) -> dict:
    if not genai or not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY not configured on server. Set it as an environment variable.",
        )

    model = genai.GenerativeModel("gemini-2.0-flash")
    prompt = build_prompt(telemetry, manual_text, telemetry_flags)

    response = model.generate_content(
        [
            prompt,
            {"mime_type": mime_type, "data": image_bytes},
        ]
    )

    raw_text = response.text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        if raw_text.lower().startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        parsed = {
            "root_cause": "Unable to parse structured diagnosis from model output.",
            "repair_action": raw_text[:500],
            "confidence": "low",
        }

    return parsed


@app.get("/")
def health_check():
    return {"status": "ok", "service": "OmniYield backend"}


@app.post("/analyze", response_model=AnalysisResult)
async def analyze(
    image: UploadFile = File(...),
    telemetry: str = Form(...),
    manual_text: str = Form(""),
):
    try:
        telemetry_dict = json.loads(telemetry)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="telemetry must be valid JSON")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    telemetry_flags = analyze_telemetry(telemetry_dict)

    diagnosis = run_gemini_agent(
        image_bytes=image_bytes,
        mime_type=image.content_type or "image/jpeg",
        telemetry=telemetry_dict,
        manual_text=manual_text or "No manual excerpt provided.",
        telemetry_flags=telemetry_flags,
    )

    return AnalysisResult(
        root_cause=diagnosis.get("root_cause", "Unknown"),
        repair_action=diagnosis.get("repair_action", "No action determined"),
        confidence=diagnosis.get("confidence", "low"),
        telemetry_flags=telemetry_flags,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
