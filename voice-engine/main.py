import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional

from engine.hardware import detect_device
from engine.xtts_service import XTTSService
from engine.whisper_service import WhisperSTTService

app = FastAPI(title="ECHO XTTS-v2 Voice Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Detect hardware (CUDA / MPS / CPU)
hw_info = detect_device()
device = hw_info["device"]
print(f"[voice-engine] Hardware detected: {hw_info['details']}")

# Initialize Chatterbox Multilingual V3 & Whisper STT (cached in memory across requests)
voice_service = XTTSService(device=device)
stt_service = WhisperSTTService(device=device)

# Ensure temp and output directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)

# Mount outputs for direct streaming
app.mount("/audio", StaticFiles(directory=OUTPUTS_DIR), name="audio")

class SynthesizeRequest(BaseModel):
    text: str
    voice_id: Optional[str] = ""
    persona_id: Optional[str] = ""

@app.get("/voice/health")
def health():
    return {
        "status": "ok",
        "engine": "Coqui XTTS-v2",
        "model": "v2.0.3",
        "device": device,
        "loaded": True,
        "hardware": hw_info,
        "cached_voices": len(voice_service.cached_profiles)
    }

@app.post("/voice/clone")
async def clone_voice(
    file: UploadFile = File(...),
    persona_id: str = Form(...)
):
    temp_path = os.path.join(TEMP_DIR, f"clone_{persona_id}_{file.filename}")
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result = voice_service.clone_voice(temp_path, persona_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/synthesize")
def synthesize(req: SynthesizeRequest):
    if not req.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        result = voice_service.synthesize(req.text, req.voice_id, req.persona_id)
        return {
            "status": "success",
            **result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice/transcribe")
async def transcribe(file: UploadFile = File(...)):
    temp_path = os.path.join(TEMP_DIR, f"stt_{file.filename}")
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result = stt_service.transcribe(temp_path)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
