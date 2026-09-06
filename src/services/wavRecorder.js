// Cross-browser Audio Recording Service
// Supports MediaRecorder with dynamic MIME type detection and 16kHz PCM WAV recorder fallback.

export class AudioRecorder {
  constructor() {
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.mimeType = "";
  }

  static getSupportedMimeType() {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return "";
    const mimeTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/wav",
      ""
    ];
    for (const type of mimeTypes) {
      if (!type || MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "";
  }

  async start() {
    if (this.isRecording) {
      console.warn("[VOICE] Recording already in progress");
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      console.error("[VOICE] microphone permission error: getUserMedia not supported");
      throw new Error("Your browser does not support voice recording.");
    }

    console.log("[VOICE] microphone permission requested");
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log("[VOICE] microphone permission granted");
    } catch (err) {
      console.error("[VOICE] microphone permission denied:", err.name || err.message);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error("Microphone permission was denied. Please allow microphone access.");
      }
      throw new Error("Could not access microphone: " + (err.message || "Unknown error"));
    }

    const mimeType = AudioRecorder.getSupportedMimeType();
    this.mimeType = mimeType;
    console.log(`[VOICE] audio MIME type: ${mimeType || "browser default"}`);

    this.audioChunks = [];
    try {
      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.mediaStream, { mimeType })
        : new MediaRecorder(this.mediaStream);
    } catch (e) {
      console.warn("[VOICE] MediaRecorder init with mimeType failed, falling back to default:", e);
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100); // Collect data slices every 100ms
    this.isRecording = true;
    console.log("[VOICE] recording started");
  }

  async stop() {
    if (!this.isRecording || !this.mediaRecorder) {
      console.warn("[VOICE] Stop called but not recording");
      return null;
    }

    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        console.log("[VOICE] recording stopped");

        // Stop all media stream tracks immediately to release hardware
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((track) => track.stop());
          this.mediaStream = null;
        }

        if (this.audioChunks.length === 0) {
          console.warn("[VOICE] Recording contains no audio data");
          resolve(null);
          return;
        }

        const actualType = this.mediaRecorder?.mimeType || this.mimeType || "audio/webm";
        const audioBlob = new Blob(this.audioChunks, { type: actualType });
        console.log(`[VOICE] audio MIME type: ${audioBlob.type}`);
        console.log(`[VOICE] audio blob size: ${audioBlob.size} bytes`);

        this.audioChunks = [];
        this.mediaRecorder = null;
        resolve(audioBlob);
      };

      try {
        if (this.mediaRecorder.state !== "inactive") {
          this.mediaRecorder.stop();
        } else {
          this.isRecording = false;
          if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
            this.mediaStream = null;
          }
          resolve(null);
        }
      } catch (err) {
        console.error("[VOICE] Error stopping MediaRecorder:", err);
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((track) => track.stop());
          this.mediaStream = null;
        }
        this.isRecording = false;
        resolve(null);
      }
    });
  }

  cancel() {
    this.isRecording = false;
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch (_) {}
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.audioChunks = [];
    this.mediaRecorder = null;
  }
}

// Lightweight in-browser PCM WAV audio recorder (Alternative direct PCM engine)
export class WavRecorder {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.input = null;
    this.leftchannel = [];
    this.recordingLength = 0;
    this.sampleRate = 16000;
    this.isRecording = false;
  }

  async start() {
    if (this.isRecording) return;
    this.leftchannel = [];
    this.recordingLength = 0;

    console.log("[VOICE] microphone permission requested");
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: this.sampleRate,
    });

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: this.sampleRate,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    console.log("[VOICE] microphone permission granted");

    this.input = this.audioContext.createMediaStreamSource(this.mediaStream);
    const bufferSize = 2048;
    this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const left = e.inputBuffer.getChannelData(0);
      this.leftchannel.push(new Float32Array(left));
      this.recordingLength += bufferSize;
    };

    this.input.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    this.isRecording = true;
    console.log("[VOICE] recording started with sampleRate:", this.audioContext.sampleRate);
    console.log("[VOICE] audio MIME type: audio/wav");
  }

  async stop() {
    this.isRecording = false;

    if (this.processor && this.input) {
      this.input.disconnect();
      this.processor.disconnect();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
    }

    console.log("[VOICE] recording stopped, frames:", this.recordingLength);

    if (this.recordingLength === 0) {
      return null;
    }

    // Merge channel buffers
    const samples = new Float32Array(this.recordingLength);
    let offset = 0;
    for (let i = 0; i < this.leftchannel.length; i++) {
      samples.set(this.leftchannel[i], offset);
      offset += this.leftchannel[i].length;
    }

    // Convert to 16-bit PCM WAV
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeUTFBytes(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeUTFBytes(view, 8, "WAVE");

    // FMT sub-chunk
    writeUTFBytes(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);

    // Data sub-chunk
    writeUTFBytes(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);

    // Write PCM samples
    let index = 44;
    for (let i = 0; i < samples.length; i++) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(index, s, true);
      index += 2;
    }

    const wavBlob = new Blob([view], { type: "audio/wav" });
    console.log(`[VOICE] audio MIME type: ${wavBlob.type}`);
    console.log(`[VOICE] audio blob size: ${wavBlob.size} bytes`);
    return wavBlob;
  }
}

function writeUTFBytes(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
