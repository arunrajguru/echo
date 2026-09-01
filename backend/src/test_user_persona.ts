import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

async function runTest() {
  try {
    console.log('1. Registering test user...');
    const reg = await axios.post('http://localhost:4000/api/auth/register', {
      email: 'king_test_' + Date.now() + '@example.com',
      password: 'Password123!'
    });
    const token = reg.data.token;
    console.log('User registered OK');

    console.log('\n2. Creating Persona: kingrajpurohit314...');
    const p = await axios.post('http://localhost:4000/api/personas', {
      name: 'kingrajpurohit314',
      relationship: 'Friend'
    }, { headers: { Authorization: `Bearer ${token}` } });
    const pId = p.data.id;
    console.log('Persona created:', pId);

    console.log('\n3. Uploading WhatsApp chat file...');
    const form = new FormData();
    form.append('file', fs.createReadStream('./data/sample_user_chat.txt'));
    await axios.post(`http://localhost:4000/api/personas/${pId}/upload`, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` }
    });
    console.log('Chat uploaded OK');

    console.log('\n4. Analyzing Persona (Style & Memory Learning)...');
    const analysis = await axios.post(`http://localhost:4000/api/personas/${pId}/analyze`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('\n================ PERSONA LEARNING REPORT ================');
    console.log('Target Persona:', analysis.data.persona.name);
    console.log('Target Participant Identified:', analysis.data.persona.targetParticipant);
    console.log('Language Detected:', analysis.data.style?.language);
    console.log('Response Examples Stored:', analysis.data.conversationExamplesCount);
    console.log('Memories Extracted:', analysis.data.memories?.map((m: any) => m.title));
    console.log('Common Emojis:', analysis.data.style?.commonEmojis);
    console.log('Common Phrases:', analysis.data.style?.commonPhrases);
    console.log('Average Length:', analysis.data.style?.averageLength);

    console.log('\n================ LIVE GROQ CHAT RESPONSES ================');
    const testQueries = [
      'Tu kidar hai?',
      'Kya kar raha hai abhi?',
      'Shopping karne chalna hai kya?',
      'Tabiyat kaisa hai tera?',
      'Guess karo aaj kya hua?'
    ];

    for (const q of testQueries) {
      const res = await axios.post(`http://localhost:4000/api/chat/${pId}`, { message: q }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`\nUser: "${q}"`);
      console.log(`kingrajpurohit314 (Groq LLM): "${res.data.message}"`);
      if (res.data.audioUrl) {
        console.log(`Audio URL: ${res.data.audioUrl}`);
      }
    }

    console.log('\n================ TESTING VOICE REFERENCE UPLOAD & SYNTHESIS ================');
    // Create a valid 16-bit PCM WAV sample for voice cloning
    const wavHeader = Buffer.alloc(44);
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(36 + 16000 * 2, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20); // PCM
    wavHeader.writeUInt16LE(1, 22); // mono
    wavHeader.writeUInt32LE(16000, 24); // sample rate
    wavHeader.writeUInt32LE(32000, 28); // byte rate
    wavHeader.writeUInt16LE(2, 32); // block align
    wavHeader.writeUInt16LE(16, 34); // bits per sample
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(16000 * 2, 40);
    const audioData = Buffer.alloc(16000 * 2, 0);
    const fullWav = Buffer.concat([wavHeader, audioData]);

    const voiceForm = new FormData();
    voiceForm.append('file', fullWav, { filename: 'king_voice.wav', contentType: 'audio/wav' });
    voiceForm.append('voiceConsent', 'true');

    const uploadVoiceRes = await axios.post(`http://localhost:4000/api/personas/${pId}/voice/upload`, voiceForm, {
      headers: { ...voiceForm.getHeaders(), Authorization: `Bearer ${token}` }
    });
    console.log('Voice Reference Upload Status:', uploadVoiceRes.status);
    console.log('Voice ID Created:', uploadVoiceRes.data.voiceId);
    console.log('Voice Provider:', uploadVoiceRes.data.provider);

    const ttsRes = await axios.post(`http://localhost:4000/api/personas/${pId}/voice/synthesize`, {
      text: 'Ara nahi, mai jaynagar kabhi nahi jana hai! Room mai rest kar raha hoon 🫪😅'
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('TTS Status:', ttsRes.status);
    console.log('TTS Audio URL:', ttsRes.data.audioUrl);
    console.log('TTS Engine:', ttsRes.data.engine);

    console.log('\n=== ALL CHECKS PASSED SUCCESSFULLY ===');
  } catch (err: any) {
    console.error('Error running check:', err?.response?.data || err.message);
  }
}

runTest();
