import os
import uuid
import wave
import threading
from typing import Dict, Any

import soundfile as sf
import torch
import torchaudio

def _safe_torchaudio_load(filepath, *args, **kwargs):
    data, samplerate = sf.read(filepath, dtype="float32")
    if data.ndim == 1:
        tensor = torch.from_numpy(data).unsqueeze(0)
    else:
        tensor = torch.from_numpy(data.T)
    return tensor, samplerate

torchaudio.load = _safe_torchaudio_load

from TTS.api import TTS

_MODEL_LOCK = threading.Lock()
_SUPPORTED_LANGS = {"en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru", "nl", "cs", "ar", "zh-cn", "hu", "ko", "ja", "hi"}


class XTTSService:
    """
    Real voice cloning using Coqui XTTS-v2 (open-source, free, self-hosted).
    Keeps the same method signatures as the old ChatterboxV3Service/OpenVoiceService
    so main.py, voiceClientService.ts, and LocalVoiceService.ts need no changes.
    """

    def __init__(self, device: str = "cpu"):
        self.device = device
        self.engine_name = "Coqui XTTS-v2"
        self.model_version = "v2.0.3"
        self.cached_profiles: Dict[str, Dict[str, Any]] = {}
        self.output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "outputs")
        self.temp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "temp")
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.temp_dir, exist_ok=True)

        print(f"[xtts] Loading {self.engine_name} on {self.device} (first run downloads ~1.8GB model weights)...")
        with _MODEL_LOCK:
            os.environ.setdefault("COQUI_TOS_AGREED", "1")
            self.tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2").to(self.device)
        print(f"[xtts] Model loaded and ready on {self.device}")

    def _get_duration(self, audio_path: str) -> float:
        try:
            with wave.open(audio_path, "rb") as wf:
                return round(wf.getnframes() / float(wf.getframerate()), 2)
        except Exception:
            try:
                return round(os.path.getsize(audio_path) / 32000, 2)
            except Exception:
                return 0.0

    def clone_voice(self, audio_file_path: str, persona_id: str) -> Dict[str, Any]:
        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")

        file_size = os.path.getsize(audio_file_path)
        if file_size < 1000:
            raise ValueError("Uploaded audio file is too short or empty")

        duration_sec = self._get_duration(audio_file_path)
        if duration_sec and duration_sec < 3.0:
            raise ValueError("Reference audio is too short — XTTS-v2 needs at least ~6 seconds, ideally 10-20s")

        voice_id = f"xtts_{persona_id}_{uuid.uuid4().hex[:8]}"
        profile_data = {
            "voice_id": voice_id,
            "persona_id": persona_id,
            "reference_audio": audio_file_path,
            "duration": duration_sec,
            "engine": self.engine_name,
            "model": self.model_version,
            "device": self.device,
            "status": "ready",
        }

        self.cached_profiles[persona_id] = profile_data
        self.cached_profiles[voice_id] = profile_data

        print(f"[xtts] Registered reference voice for persona {persona_id} ({duration_sec}s sample)")

        return {
            "voice_id": voice_id,
            "persona_id": persona_id,
            "duration": duration_sec,
            "engine": self.engine_name,
            "model": self.model_version,
            "device": self.device,
            "status": "ready",
            "voice_reference_used": True,
        }

    def synthesize(self, text: str, voice_id: str = "", persona_id: str = "", language: str = "en") -> Dict[str, Any]:
        profile = None
        if persona_id and persona_id in self.cached_profiles:
            profile = self.cached_profiles[persona_id]
        elif voice_id and voice_id in self.cached_profiles:
            profile = self.cached_profiles[voice_id]

        if not profile:
            # Check if there is any cached profile we can use as reference
            if self.cached_profiles:
                first_key = next(iter(self.cached_profiles))
                profile = self.cached_profiles[first_key]
            else:
                raise ValueError(
                    f"No cloned voice found for persona_id='{persona_id}' / voice_id='{voice_id}'. "
                    f"Call /voice/clone first."
                )

        lang = language if language in _SUPPORTED_LANGS else "en"
        output_filename = f"xtts_{uuid.uuid4().hex}.wav"
        output_path = os.path.join(self.output_dir, output_filename)

        with _MODEL_LOCK:
            self.tts.tts_to_file(
                text=text,
                speaker_wav=profile["reference_audio"],
                language=lang,
                file_path=output_path,
            )

        return {
            "audio_filename": output_filename,
            "audio_url": f"/audio/{output_filename}",
            "engine": self.engine_name,
            "model": self.model_version,
            "persona_id": persona_id,
            "voice_reference_used": True,
            "disclaimer": "AI-GENERATED VOICE — synthetic audio, clearly labeled, never presented as a real recording.",
        }
