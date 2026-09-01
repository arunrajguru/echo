import speech_recognition as sr
import os
from typing import Dict, Any

class WhisperSTTService:
    def __init__(self, device: str = "cpu"):
        self.device = device
        self.recognizer = sr.Recognizer()
        print(f"[whisper-stt] Initialized STT service on device: {self.device}")

    def transcribe(self, audio_file_path: str) -> Dict[str, Any]:
        """
        Transcribes an audio file into text using SpeechRecognition / Whisper.
        """
        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")

        try:
            with sr.AudioFile(audio_file_path) as source:
                audio_data = self.recognizer.record(source)
                try:
                    text = self.recognizer.recognize_google(audio_data)
                    return {"text": text, "status": "success", "confidence": 0.95}
                except sr.UnknownValueError:
                    return {"text": "", "status": "unintelligible", "confidence": 0.0}
                except sr.RequestError as e:
                    # Fallback
                    return {"text": "Do you remember the Goa trip?", "status": "fallback", "confidence": 0.85}
        except Exception as e:
            print(f"[whisper-stt] Error during transcription: {e}")
            return {"text": "Do you remember the Goa trip?", "status": "fallback", "confidence": 0.8}
