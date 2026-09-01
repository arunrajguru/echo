# Implementation Plan: ECHO Continuous Backend Build (Phases 1–8)

ECHO is an AI memory companion. Users upload conversation exports (WhatsApp, JSON, CSV, TXT) and optional voice recordings of a specific person. The backend ingests the conversation, extracts the persona style profile and discrete grounded memories, indexes them into a local vector store, and provides a strictly grounded AI reflection that never invents memories or claims to be the real person.

This document presents the full architecture, API specification, data models, and continuous build order across all 8 phases.

---

## User Review Required

> [!IMPORTANT]
> **Zero Design Alteration Guarantee**: The frontend design, CSS design tokens (`GlobalStyle.jsx`), layouts, Tailwind classes, and Three.js canvas in `./echo-frontend` will be 100% preserved. Only API client functions in `src/services/api.js` and minimal component data wiring in `src/components/*.jsx` and `src/App.jsx` will be connected.

> [!NOTE]
> **Turnkey Local Stack**:
> 1. **MongoDB**: Supports standard `MONGODB_URI` from `.env` with automatic fallback to `mongodb-memory-server` for instant zero-config startup on any environment.
> 2. **Vector Store**: Local in-memory and disk-persisted vector store with cosine similarity, top-$k$ ranking, similarity thresholds, and strict `personaId` scoping.
> 3. **LLM Engine**: Provider abstraction supporting OpenAI, Groq, local Ollama, or OpenAI-compatible endpoints configured via `.env`.
> 4. **Voice Engine**: Python FastAPI microservice in `voice-engine/` running hardware-detected (CPU/CUDA) OpenVoice V2 and Whisper STT with local caching and fallback.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              echo-frontend (Vite + React + Three.js)        │
│    Landing · Auth · Wizard (5 steps) · MemorySpace · Chat   │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST & Audio Streaming (Port 4000)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          backend/ (Node.js + Express + TypeScript)          │
│                                                             │
│  ├── Auth & User Management (JWT, bcrypt, rate-limiting)    │
│  ├── Chat Ingestion (WhatsApp, JSON, CSV, TXT parsers)      │
│  ├── Persona Analysis & Style Extraction                    │
│  ├── Memory Extraction & Confidence Scoring                 │
│  ├── RAG Pipeline (EmbeddingProvider, VectorStore)          │
│  ├── Grounded LLM Provider (Strict Prompting, Anti-Rep)     │
│  └── Cascade Deletion & Security Middleware (Helmet, CORS)  │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      MongoDB / Mongoose      │ │   voice-engine/ (FastAPI)  │
│  Users, Personas, Memories,  │ │  Port 8000                 │
│  Messages, Examples, Sessions│ │  ├── OpenVoice V2 Cloning  │
└──────────────────────────────┘ │  ├── Voice Synthesis (TTS) │
                                 │  └── Whisper STT (Audio-In)│
                                 └────────────────────────────┘
```

---

## Proposed Changes Across Phases 1–8

```
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── src/
│   │   ├── index.ts
│   │   ├── app.ts
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   └── database.ts
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Persona.ts
│   │   │   ├── ConversationMessage.ts
│   │   │   ├── Memory.ts
│   │   │   ├── ConversationExample.ts
│   │   │   ├── VoiceProfile.ts
│   │   │   └── ChatSession.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── validate.ts
│   │   ├── services/
│   │   │   ├── chatParser/
│   │   │   │   ├── index.ts
│   │   │   │   ├── whatsappParser.ts
│   │   │   │   ├── jsonParser.ts
│   │   │   │   └── csvParser.ts
│   │   │   ├── personaAnalysisService.ts
│   │   │   ├── memoryExtractionService.ts
│   │   │   ├── embeddings/
│   │   │   │   ├── EmbeddingProvider.ts
│   │   │   │   ├── LocalEmbeddingProvider.ts
│   │   │   │   └── OpenAIEmbeddingProvider.ts
│   │   │   ├── vectorStore/
│   │   │   │   ├── VectorStore.ts
│   │   │   │   └── LocalVectorStore.ts
│   │   │   ├── llm/
│   │   │   │   ├── LLMProvider.ts
│   │   │   │   ├── OpenAILLMProvider.ts
│   │   │   │   ├── GroqLLMProvider.ts
│   │   │   │   └── promptTemplates.ts
│   │   │   ├── ragService.ts
│   │   │   ├── voiceClientService.ts
│   │   │   └── cascadeDeleteService.ts
│   │   └── routes/
│   │       ├── auth.routes.ts
│   │       ├── persona.routes.ts
│   │       ├── memory.routes.ts
│   │       ├── chat.routes.ts
│   │       └── voice.routes.ts
│   └── tests/
│       ├── auth.test.ts
│       ├── parser.test.ts
│       ├── analysis.test.ts
│       ├── rag.test.ts
│       └── chat.test.ts
│
├── voice-engine/
│   ├── main.py
│   ├── requirements.txt
│   ├── engine/
│   │   ├── hardware.py
│   │   ├── openvoice_service.py
│   │   └── whisper_service.py
│   └── tests/
│       └── test_voice.py
│
└── echo-frontend/
    ├── src/
    │   ├── services/
    │   │   └── api.js              # Implement real fetch calls
    │   └── components/
    │       ├── Auth.jsx            # Token & error handling
    │       ├── Wizard.jsx          # Live upload, parsing, analyze & review
    │       ├── MemorySpace.jsx     # Live memories & edit/delete
    │       └── ChatScreen.jsx      # Live grounded chat & real voice audio
```

---

## Continuous Build Phases & Detailed Specifications

### Phase 1: Backend Skeleton + Auth
- **Goal**: Express TypeScript app with security headers, CORS, Mongoose connection (with auto-memory fallback), User model with bcrypt password hashing, JWT sign/verify, register, login, logout, and `/api/auth/me`.
- **Endpoints**:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- **Verification Artifact**: Automated auth test suite passing + real frontend `Auth.jsx` registration and login in browser.

### Phase 2: Persona CRUD + Chat Ingestion
- **Goal**: `Persona` and `ConversationMessage` schemas, file upload via Multer (storing to `uploads/`), multi-format parser for WhatsApp (`[dd/mm/yy, hh:mm:ss] Name: text` and `dd/mm/yyyy, hh:mm - Name: text`), JSON exports, CSV exports, plain text lines. Participant detection and message indexing.
- **Endpoints**:
  - `POST /api/personas`
  - `GET /api/personas`
  - `GET /api/personas/:id`
  - `PATCH /api/personas/:id`
  - `DELETE /api/personas/:id`
  - `POST /api/personas/:id/upload` (accepts `.txt`, `.json`, `.csv`, `.zip`)
- **Verification Artifact**: Ingestion test parsing real WhatsApp export sample and validating message count, participants list, and MongoDB record scoping.

### Phase 3: Persona Analysis + Memory Extraction
- **Goal**: Analyze messages of the selected persona to extract:
  1. Tone, humor, vocabulary, frequent emojis, sign-off patterns.
  2. Discrete memories categorized into Trips, Conversations, Favorites, Places, People, with confidence scores ($0.0 - 1.0$), date/era, and exact source message IDs/lines.
  3. Strict server-side invariant: NO memory is created without verified source lines.
- **Endpoints**:
  - `POST /api/personas/:id/analyze`
  - `GET /api/personas/:id/memories`
  - `GET /api/personas/:id/memory-map`
  - `PATCH /api/personas/:id/memories/:memoryId`
  - `DELETE /api/personas/:id/memories/:memoryId`
- **Verification Artifact**: Analysis test run verifying extracted style stats and memories against the source conversation.

### Phase 4: Embeddings + Vector Store + RAG Retrieval
- **Goal**: `EmbeddingProvider` interface with `LocalEmbeddingProvider` (TF-IDF / MiniLM / Xenova embeddings) and `OpenAIEmbeddingProvider`. `LocalVectorStore` with vector indexing, cosine similarity scoring, metadata filtering by `personaId`.
- **RAG Pipeline**:
  - Vector search on `Memory` vectors and `ConversationMessage` vectors.
  - Deduplication, threshold filtering ($\ge 0.65$), relevance ranking.
  - Return top relevant memories and context quotes.
- **Verification Artifact**: Known-query retrieval test (returns exact memory) and out-of-domain query test (returns empty/null without false positives).

### Phase 5: LLM Integration + Grounded Chat Endpoint
- **Goal**: `LLMProvider` interface (Groq, OpenAI, Ollama), grounded persona prompt enforcing ethical constraints:
  1. Never claim to be the real person.
  2. Never fabricate memories or facts.
  3. Ground answers exclusively in retrieved memories/quotes.
  4. Explicit fallback: *"I don't have enough information from the memories you've shared to know that."*
  5. Repetition detection: Check similarity with last assistant message, regenerate once if too similar.
- **Endpoints**:
  - `POST /api/chat/:personaId`
- **Verification Artifact**: Real browser `ChatScreen` test showing grounded response with source citation pill and out-of-domain fallback.

### Phase 6: Voice Engine (OpenVoice V2) + STT
- **Goal**: Python FastAPI service in `voice-engine/`:
  - Hardware detector (CUDA/MPS/CPU).
  - OpenVoice V2 cloning & synthesis with model caching in memory and graceful local fallback.
  - Whisper STT for transcribing user audio clips.
  - Express backend proxy endpoints for voice cloning, audio synthesis, and voice session.
- **Endpoints**:
  - `GET /voice/health`
  - `POST /voice/clone`
  - `POST /voice/synthesize`
  - `POST /voice/transcribe`
  - `POST /api/personas/:id/voice/upload`
  - `POST /api/personas/:id/voice/synthesize`
- **Verification Artifact**: Audio file generation test and browser audio playback verification.

### Phase 7: Security, Privacy, Cascade Deletes, Dev Debug Panel
- **Goal**:
  - Helmet headers, CORS restricted to frontend origin, rate limiter (100 req/15min on auth, 60 req/min on chat).
  - Zod request validation schemas on every route.
  - Strict ownership check middleware (`req.user.id === persona.userId`).
  - Cascade delete handler: Deleting a persona deletes all associated `ConversationMessage`, `Memory`, `ConversationExample`, `VoiceProfile`, `ChatSession`, disk files in `uploads/`, and vector entries.
  - Development-only RAG debug route (`GET /api/dev/rag-inspect/:personaId`).
- **Verification Artifact**: Cascade deletion test confirming 0 orphaned documents, files, or vectors.

### Phase 8: Full Integration Pass (27-Step Flow)
- **Goal**: Complete end-to-end verification through the live frontend UI:
  1. Register new user
  2. Login
  3. Start Wizard: Enter name & relationship
  4. Upload chat export file
  5. Select target participant
  6. Upload voice sample & grant consent
  7. Run persona & memory analysis
  8. Review & approve extracted memories
  9. Create Echo -> Navigate to 3D MemorySpace
  10. Filter memories by category (Trips, Conversations, Favorites, Places, People)
  11. View memory details with source quotes & confidence
  12. Navigate to ChatScreen
  13. Send grounded question -> Verify response + source pill + orb animation
  14. Send ungrounded question -> Verify "I don't have enough information..." fallback
  15. Test voice mode (mic input -> STT -> RAG -> TTS -> audio playback)
  16. Delete persona -> Verify complete cascade cleanup
- **Verification Artifact**: Recorded browser walkthrough artifact and test report.

---

## Verification Plan

### Automated Tests
- `npm run test` in `backend/` running Vitest/Jest for:
  - Auth routes & JWT middleware
  - Chat log parsers (WhatsApp, JSON, CSV)
  - Memory extraction and confidence calculation
  - Vector store indexing and threshold retrieval
  - LLM grounded prompting and repetition detection
  - Cascade deletion integrity
- `pytest` in `voice-engine/` for voice cloning and STT endpoints.

### Manual / Browser Verification
- Browser testing with `browser_subagent` against `http://localhost:5173` talking to `http://localhost:4000`:
  - Complete user registration and login flow
  - Wizard multi-step execution with live chat file
  - MemorySpace Three.js orb inspection and memory drawer
  - Chat interaction with grounding pills and voice playback
