// Lightweight in-browser PCM WAV audio recorder.
// Produces standard 16kHz mono 16-bit PCM WAV blobs compatible with Whisper & SpeechRecognition.

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
    this.leftchannel = [];
    this.recordingLength = 0;
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
    console.log("[VOICE] Recording started with sampleRate:", this.audioContext.sampleRate);
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

    console.log("[VOICE] Recording stopped, recorded frames:", this.recordingLength);

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
    view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, 1, true); // NumChannels (1 mono)
    view.setUint32(24, this.sampleRate, true); // SampleRate
    view.setUint32(28, this.sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
    view.setUint16(34, 16, true); // BitsPerSample (16 bits)

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
    console.log(`[VOICE] Audio blob created: ${wavBlob.size} bytes, type: ${wavBlob.type}`);
    return wavBlob;
  }
}

function writeUTFBytes(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
