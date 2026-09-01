import os
import sys
import io

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_voice_health():
    res = client.get("/voice/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["engine"] == "Chatterbox Multilingual"
    assert data["model"] == "V3"
    assert "device" in data

def test_voice_clone():
    fake_audio = io.BytesIO(b"RIFF\x24\x08\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x08\x00\x00" + b"\x00"*2048)
    res = client.post(
        "/voice/clone",
        data={"persona_id": "test_persona_123"},
        files={"file": ("sample.wav", fake_audio, "audio/wav")}
    )
    assert res.status_code == 200
    data = res.json()
    assert "voice_id" in data
    assert data["engine"] == "Chatterbox Multilingual"
    assert data["model"] == "V3"
    assert data["voice_reference_used"] is True

def test_voice_synthesize():
    res = client.post(
        "/voice/synthesize",
        json={"text": "Hey, good to hear from you. Call me when you land.", "persona_id": "test_persona_123"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["engine"] == "Chatterbox Multilingual"
    assert data["voice_reference_used"] is True
    assert "AI-GENERATED VOICE" in data["disclaimer"]
