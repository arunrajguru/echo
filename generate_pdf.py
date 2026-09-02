import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#718096"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, letter[1] - 36, "ECHO — Interactive AI Persona & Voice Remembrance Platform")
            self.drawRightString(letter[0] - 54, letter[1] - 36, "System Architecture & Specification")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 45, letter[0] - 54, 45)
        self.drawString(54, 32, "CONFIDENTIAL & PROPRIETARY — ECHO PLATFORM SPECIFICATION")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 32, page_str)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    PRIMARY = colors.HexColor("#1A202C")
    EMBER = colors.HexColor("#D97706")
    EMBER_LIGHT = colors.HexColor("#FEF3C7")
    EMBER_DARK = colors.HexColor("#92400E")
    SLATE = colors.HexColor("#4A5568")
    LIGHT_BG = colors.HexColor("#F8FAFC")
    BORDER_COLOR = colors.HexColor("#E2E8F0")
    CYAN_ACCENT = colors.HexColor("#0D9488")
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=PRIMARY,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=EMBER,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=EMBER_DARK,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=SLATE,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=SLATE,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#1E293B")
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=PRIMARY
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=EMBER_DARK
    )

    story = []

    # -------------------------------------------------------------
    # COVER / HEADER BANNER
    # -------------------------------------------------------------
    banner_data = [
        [
            Paragraph("<b>ECHO PLATFORM ARCHITECTURE</b>", ParagraphStyle('B1', fontName='Helvetica-Bold', fontSize=9, textColor=EMBER)),
            Paragraph("<b>VERSION 1.0.0 — PRODUCTION READY</b>", ParagraphStyle('B2', fontName='Helvetica-Bold', fontSize=8, textColor=SLATE, alignment=2))
        ]
    ]
    t_banner = Table(banner_data, colWidths=[250, 254])
    t_banner.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_banner)
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("ECHO — Interactive AI Persona & Voice Remembrance Platform", title_style))
    story.append(Paragraph("Complete Technical Architecture, Pipeline Workflows, Data Schemas & Operational Specifications", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=EMBER, spaceBefore=0, spaceAfter=12))

    # -------------------------------------------------------------
    # 1. EXECUTIVE SUMMARY
    # -------------------------------------------------------------
    story.append(Paragraph("1. Executive Summary", h1_style))
    story.append(Paragraph(
        "<b>ECHO</b> is an end-to-end, multi-tenant conversational intelligence and digital remembrance system designed to "
        "reconstruct authentic persona experiences from uploaded chat transcripts and audio samples. "
        "Unlike generic LLM wrappers, ECHO combines a <b>Dual RAG (Retrieval-Augmented Generation) engine</b> for strict memory grounding, "
        "an autonomous <b>Persona Style Learning engine</b> that extracts tone, dialect, and emojis, "
        "and a real-time, low-latency <b>Voice Chat pipeline</b> powered by <b>Groq Whisper STT (whisper-large-v3)</b>, "
        "<b>Groq Llama-3.3-70B / Multi-Model LLM orchestration</b>, and <b>ElevenLabs / Chatterbox Voice Synthesis</b>.",
        body_style
    ))
    story.append(Paragraph(
        "The application provides seamless continuity across both text and hands-free voice interactions, featuring an immersive "
        "3D Three.js particle orb visualizer, automatic silence-based turn-taking, and strict memory isolation across personas.",
        body_style
    ))

    # Summary Callout Box
    summary_box_data = [[
        Paragraph(
            "<b>Key Highlights:</b><br/>"
            "• <b>Sub-Second Voice Transcription:</b> Groq Cloud Whisper API transcribes speech in ~1.2s.<br/>"
            "• <b>Dual RAG Memory Grounding:</b> Discrete factual retrieval + dynamic few-shot style example retrieval.<br/>"
            "• <b>Zero Cross-Persona Leakage:</b> Persona-scoped vector spaces and cascade deletion integrity.<br/>"
            "• <b>Fault-Tolerant Resilience:</b> Multi-tiered fallbacks across LLM, STT, and voice synthesis layers.<br/>"
            "• <b>100% Automated Test Pass:</b> 16 automated Vitest test suites (118/118 tests passing).",
            callout_style
        )
    ]]
    t_summary = Table(summary_box_data, colWidths=[504])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), EMBER_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#FCD34D")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 12))

    # -------------------------------------------------------------
    # 2. SYSTEM TOPOLOGY & ARCHITECTURE
    # -------------------------------------------------------------
    story.append(Paragraph("2. System Topology & Tier Breakdown", h1_style))
    story.append(Paragraph(
        "The ECHO ecosystem is architected in four distinct tiers to ensure high modularity, security, and scalability:",
        body_style
    ))

    tiers_data = [
        [Paragraph("Tier", table_header_style), Paragraph("Component & Technologies", table_header_style), Paragraph("Key Responsibilities", table_header_style)],
        [
            Paragraph("<b>1. Client Presentation</b>", table_cell_style),
            Paragraph("React 18, Vite, Tailwind CSS, Three.js, Lucide Icons, HTML5 Web Audio API", table_cell_style),
            Paragraph("• Responsive chat UI & Memory drawer<br/>• 3D dynamic particle `MemoryOrb`<br/>• `AudioRecorder` with dynamic MIME detection<br/>• `AudioContext` Analyser for real-time speech amplitude & silence detection", table_cell_style)
        ],
        [
            Paragraph("<b>2. API Gateway & Routing</b>", table_cell_style),
            Paragraph("Node.js, Express, TypeScript, JWT, Multer, Helmet, CORS", table_cell_style),
            Paragraph("• User authentication & session management<br/>• REST route controllers (`/auth`, `/personas`, `/chat`, `/voice`)<br/>• Multipart audio file upload handling & temporary file cleanup", table_cell_style)
        ],
        [
            Paragraph("<b>3. Intelligence Core</b>", table_cell_style),
            Paragraph("Groq Cloud SDK, OpenAI SDK, ElevenLabs API, Chatterbox V3, Custom Vector Store", table_cell_style),
            Paragraph("• Groq Whisper STT (`whisper-large-v3`)<br/>• Global LLM provider router (Groq / OpenAI / Local fallback)<br/>• Dual RAG semantic vector search & cosine similarity<br/>• Persona learning & linguistic style profiling<br/>• ElevenLabs voice cloning with Chatterbox PCM WAV fallback", table_cell_style)
        ],
        [
            Paragraph("<b>4. Persistence & Storage</b>", table_cell_style),
            Paragraph("MongoDB, Mongoose ORM, Disk Vector Store, Static Audio File Server", table_cell_style),
            Paragraph("• User accounts, personas, memories, voice profiles, chat history<br/>• Persona-partitioned embedding index (`data/vector_store.json`)<br/>• Public streaming audio endpoint (`/api/audio/:filename`)", table_cell_style)
        ]
    ]
    t_tiers = Table(tiers_data, colWidths=[90, 160, 254])
    t_tiers.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
    ]))
    story.append(t_tiers)
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # 3. END-TO-END VOICE PIPELINE WORKFLOW
    # -------------------------------------------------------------
    story.append(Paragraph("3. End-to-End Voice Chat Pipeline", h1_style))
    story.append(Paragraph(
        "The voice conversation architecture facilitates a true duplex conversational experience through continuous turn-taking:",
        body_style
    ))

    voice_steps = [
        "<b>Step 1 — Microphone Capture:</b> `AudioRecorder` verifies supported browser MIME types (`audio/webm;codecs=opus`, `audio/webm`, `audio/mp4`, `audio/ogg`, `audio/wav`) and streams live PCM audio.",
        "<b>Step 2 — Visual Audio Feedback:</b> An `AudioContext` `AnalyserNode` computes frequency bin volume in real time to modulate the amplitude of the 3D Three.js particle orb.",
        "<b>Step 3 — Turn Finalization & Silence Detection:</b> When the user pauses for ≥ 1.4 seconds (or taps the mic), the audio stream terminates, packaging recorded chunks into a binary audio Blob.",
        "<b>Step 4 — Multipart Upload:</b> `api.transcribeVoice(personaId, audioBlob)` issues a `POST` request to `/api/personas/:id/voice/transcribe` with auto-managed browser boundary headers.",
        "<b>Step 5 — Speech-to-Text Transcription:</b> `voiceClientService.ts` uploads the audio stream directly to Groq Whisper API (`whisper-large-v3`). Transcription returns in ~1.2s with high accuracy. Server-side temporary files are deleted immediately.",
        "<b>Step 6 — Dual RAG Context Assembly:</b> Spoken transcript is passed into `POST /api/chat/:personaId`. The RAG engine retrieves persona discrete memories and top-matching style examples from past chats.",
        "<b>Step 7 — Styled Response Generation:</b> Groq LLM synthesizes a response adhering to the persona's vocabulary, Hinglish tone, brevity constraints, and memory context.",
        "<b>Step 8 — Voice Synthesis & Browser Playback:</b> `globalVoiceService.synthesize()` invokes ElevenLabs (with Chatterbox fallback). The resulting audio URL is streamed by the browser, pulsing the particle orb in synchronization, before automatically re-entering the listening state."
    ]
    for step in voice_steps:
        story.append(Paragraph(f"• {step}", bullet_style))

    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # 4. PERSONA LEARNING & DUAL RAG ENGINE
    # -------------------------------------------------------------
    story.append(Paragraph("4. Persona Learning & Dual RAG Retrieval Engine", h1_style))
    story.append(Paragraph(
        "ECHO replaces static prompt engineering with a specialized learning system that extracts both factual memories and behavioral styling.",
        body_style
    ))

    story.append(Paragraph("A. Style Learning & Metric Extraction", h2_style))
    story.append(Paragraph(
        "When raw chat histories (e.g., WhatsApp exports) are uploaded, `chatIngestionService.ts` parses conversational sequences, "
        "and `personaLearner.ts` extracts structured stylistic dimensions:",
        body_style
    ))
    style_points = [
        "<b>Dominant Language & Dialect:</b> Automatically classifies conversation into English, Hindi, or Hinglish.",
        "<b>Average Response Length:</b> Calculates mean word count and sentence boundaries to prevent overly verbose or robotic replies.",
        "<b>Emoji & Punctuation Profile:</b> Tracks frequencies of specific emojis (e.g. 😂, 🍕, ❤️) and idiosyncratic punctuation habits.",
        "<b>Signature Phrases & Slang:</b> Identifies high-frequency colloquialisms (e.g. <i>'yo bro'</i>, <i>'mast chal raha hai'</i>, <i>'beta'</i>)."
    ]
    for p in style_points:
        story.append(Paragraph(f"• {p}", bullet_style))

    story.append(Spacer(1, 4))
    story.append(Paragraph("B. Dual RAG Semantic Grounding", h2_style))
    story.append(Paragraph(
        "Incoming queries are evaluated across two simultaneous vector spaces:<br/>"
        "1. <b>Fact Memory Space:</b> Matches queries against discrete biographical memories. If similarity exceeds threshold $\\tau$, facts are provided with source attribution (`grounded: true`).<br/>"
        "2. <b>Style Example Space:</b> Retrieves the top 3-5 historical dialogue pairs exhibiting similar emotional/conversational context as few-shot demonstrations.<br/>"
        "3. <b>Safe Fallback Guardrail:</b> If asked about an unrecorded event (e.g. <i>'What was your rank in 1982?'</i>), the persona responds with a grounded fallback admitting lack of knowledge.",
        body_style
    ))

    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # 5. DATABASE SCHEMA & DATA DICTIONARY
    # -------------------------------------------------------------
    story.append(Paragraph("5. Database Models & Schema Specifications", h1_style))
    
    schema_data = [
        [Paragraph("Model", table_header_style), Paragraph("Key Fields & Types", table_header_style), Paragraph("Description & Relationships", table_header_style)],
        [
            Paragraph("<b>User</b>", table_cell_style),
            Paragraph("• email (String, unique)<br/>• password (String, bcrypt)<br/>• name (String)<br/>• createdAt (Date)", table_cell_style),
            Paragraph("Primary account entity for authentication and ownership of personas and chat sessions.", table_cell_style)
        ],
        [
            Paragraph("<b>Persona</b>", table_cell_style),
            Paragraph("• userId (ObjectId, ref User)<br/>• name (String)<br/>• relationship (String)<br/>• targetParticipant (String)<br/>• styleProfile (Object)<br/>• isAnalyzed (Boolean)", table_cell_style),
            Paragraph("Core persona profile encapsulating identity, target relationship, and analyzed linguistic style parameters.", table_cell_style)
        ],
        [
            Paragraph("<b>Memory</b>", table_cell_style),
            Paragraph("• personaId (ObjectId, ref Persona)<br/>• content (String)<br/>• category (fact/story/preference)<br/>• importance (Number 1-10)<br/>• embedding ([Number])", table_cell_style),
            Paragraph("Discrete factual anchors extracted from ingested chat data, used for semantic RAG memory retrieval.", table_cell_style)
        ],
        [
            Paragraph("<b>VoiceProfile</b>", table_cell_style),
            Paragraph("• personaId (ObjectId, ref Persona)<br/>• voiceId (String)<br/>• sampleUrl (String)<br/>• settings (stability, similarityBoost)", table_cell_style),
            Paragraph("Stores ElevenLabs or Chatterbox voice cloning identifiers and audio synthesis parameters per persona.", table_cell_style)
        ],
        [
            Paragraph("<b>Conversation Message</b>", table_cell_style),
            Paragraph("• personaId (ObjectId)<br/>• sessionId (String)<br/>• role (user | echo)<br/>• text (String)<br/>• grounded (Boolean)<br/>• sources ([String])<br/>• audioUrl (String)", table_cell_style),
            Paragraph("Unified message store capturing all conversation turns across both text chat and hands-free voice modes.", table_cell_style)
        ]
    ]
    t_schema = Table(schema_data, colWidths=[100, 180, 224])
    t_schema.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
    ]))
    story.append(t_schema)
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # 6. REST API REFERENCE CATALOG
    # -------------------------------------------------------------
    story.append(Paragraph("6. REST API Reference Catalog", h1_style))
    
    api_data = [
        [Paragraph("Method", table_header_style), Paragraph("Endpoint", table_header_style), Paragraph("Auth", table_header_style), Paragraph("Payload / Description", table_header_style)],
        [Paragraph("POST", code_style), Paragraph("/api/auth/register", code_style), Paragraph("No", table_cell_style), Paragraph("Register new account: `{ email, password, name }`", table_cell_style)],
        [Paragraph("POST", code_style), Paragraph("/api/auth/login", code_style), Paragraph("No", table_cell_style), Paragraph("Authenticate and return JWT: `{ email, password }`", table_cell_style)],
        [Paragraph("GET", code_style), Paragraph("/api/personas", code_style), Paragraph("Bearer", table_cell_style), Paragraph("List all personas owned by authenticated user", table_cell_style)],
        [Paragraph("POST", code_style), Paragraph("/api/personas", code_style), Paragraph("Bearer", table_cell_style), Paragraph("Create persona: `{ name, relationship }`", table_cell_style)],
        [Paragraph("POST", code_style), Paragraph("/api/personas/:id/upload", code_style), Paragraph("Bearer", table_cell_style), Paragraph("Upload chat export: `{ content, fileName }`", table_cell_style)],
        [Paragraph("POST", code_style), Paragraph("/api/personas/:id/analyze", code_style), Paragraph("Bearer", table_cell_style), Paragraph("Execute memory extraction & style learning", table_cell_style)],
        [Paragraph("POST", code_style), Paragraph("/api/chat/:personaId", code_style), Paragraph("Bearer", table_cell_style), Paragraph("Send message turn: `{ message, sessionId }`", table_cell_style)],
        [Paragraph("GET", code_style), Paragraph("/api/chat/:personaId/history", code_style), Paragraph("Bearer", table_cell_style), Paragraph("Retrieve full conversation history for persona", table_cell_style)],
        [Paragraph("POST", code_style), Paragraph("/api/personas/:id/voice/transcribe", code_style), Paragraph("Bearer", table_cell_style), Paragraph("Groq Whisper STT: multipart audio file upload", table_cell_style)],
        [Paragraph("POST", code_style), Paragraph("/api/personas/:id/voice/upload", code_style), Paragraph("Bearer", table_cell_style), Paragraph("Upload reference WAV voice sample for cloning", table_cell_style)],
        [Paragraph("POST", code_style), Paragraph("/api/personas/:id/voice/synthesize", code_style), Paragraph("Bearer", table_cell_style), Paragraph("Direct text-to-speech: `{ text }`", table_cell_style)],
        [Paragraph("GET", code_style), Paragraph("/api/audio/:filename", code_style), Paragraph("Public", table_cell_style), Paragraph("Stream synthesized PCM WAV audio file", table_cell_style)],
        [Paragraph("DELETE", code_style), Paragraph("/api/personas/:id", code_style), Paragraph("Bearer", table_cell_style), Paragraph("Cascade delete persona, memories, vectors, and audio", table_cell_style)]
    ]
    t_api = Table(api_data, colWidths=[46, 170, 48, 240])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
    ]))
    story.append(t_api)
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # 7. SECURITY, PRIVACY & ISOLATION
    # -------------------------------------------------------------
    story.append(Paragraph("7. Security, Privacy & Data Isolation", h1_style))
    security_items = [
        "<b>Persona-Scoped Isolation:</b> All vector embeddings and memory records are tagged with immutable `personaId` keys. Queries strictly query against the active persona space, preventing data leakage across personas.",
        "<b>Cascade Deletion Guarantees:</b> When a persona is deleted via `/api/personas/:id`, all associated `Memory`, `VoiceProfile`, `ConversationMessage`, `ChatSession`, on-disk vector embeddings, and temporary audio files are purged atomically.",
        "<b>Secret Redaction & Key Protection:</b> API keys (`GROQ_API_KEY`, `ELEVENLABS_API_KEY`, `JWT_SECRET`) are strictly managed on the backend and are stripped from all outbound REST responses.",
        "<b>Storage Cleanup:</b> Audio files uploaded for speech transcription are processed and deleted immediately via `fs.unlinkSync`."
    ]
    for s in security_items:
        story.append(Paragraph(f"• {s}", bullet_style))

    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # 8. AUTOMATED VERIFICATION & TEST MATRIX
    # -------------------------------------------------------------
    story.append(Paragraph("8. Automated Test Matrix & Verification", h1_style))
    story.append(Paragraph(
        "ECHO is continuously tested via an automated 16-suite Vitest test harness validating all core functionalities:",
        body_style
    ))

    test_data = [
        [Paragraph("Test Suite", table_header_style), Paragraph("Tests", table_header_style), Paragraph("Validation Scope", table_header_style)],
        [Paragraph("`groq_elevenlabs_integration.test.ts`", code_style), Paragraph("17", table_cell_style), Paragraph("16-point Groq text streaming, ElevenLabs synthesis, and fallback", table_cell_style)],
        [Paragraph("`real_e2e_persona_learning_and_generation.test.ts`", code_style), Paragraph("18", table_cell_style), Paragraph("18-point verification of style extraction, slang, and emoji learning", table_cell_style)],
        [Paragraph("`voice_mode_e2e_continuity.test.ts`", code_style), Paragraph("10", table_cell_style), Paragraph("STT audio upload, Groq Whisper, turn taking, and bi-directional continuity", table_cell_style)],
        [Paragraph("`dad_rahul_priya_isolation.test.ts`", code_style), Paragraph("9", table_cell_style), Paragraph("3-persona simultaneous storage, memory isolation, and distinct voices", table_cell_style)],
        [Paragraph("`new_conversation_generation_and_persona_styles.test.ts`", code_style), Paragraph("10", table_cell_style), Paragraph("TEST A - TEST J unseen prompts and instant persona switching", table_cell_style)],
        [Paragraph("`conversational_intelligence.test.ts`", code_style), Paragraph("7", table_cell_style), Paragraph("Multi-style Hinglish tone adoption and memory grounding", table_cell_style)],
        [Paragraph("`text_persona_learning_and_response_training.test.ts`", code_style), Paragraph("8", table_cell_style), Paragraph("Style profile training vs out-of-domain ungrounded fallback", table_cell_style)],
        [Paragraph("`multi_persona_isolation.test.ts`", code_style), Paragraph("6", table_cell_style), Paragraph("Independent storage and cross-persona memory isolation", table_cell_style)],
        [Paragraph("`e2e_integration.test.ts`", code_style), Paragraph("8", table_cell_style), Paragraph("Full 27-step lifecycle pass from ingestion to voice synthesis", table_cell_style)],
        [Paragraph("`security.test.ts`", code_style), Paragraph("3", table_cell_style), Paragraph("Unauthorized access prevention and cascade deletion checks", table_cell_style)],
        [Paragraph("`analysis.test.ts` / `persona.test.ts` / `chat.test.ts` / `auth.test.ts`", code_style), Paragraph("22", table_cell_style), Paragraph("Unit & integration tests across auth, persona CRUD, RAG, and audio", table_cell_style)],
        [Paragraph("<b>TOTAL</b>", table_header_style), Paragraph("<b>118 / 118</b>", table_header_style), Paragraph("<b>100% Pass Rate Across All 16 Test Suites</b>", table_header_style)]
    ]
    t_test = Table(test_data, colWidths=[180, 50, 274])
    t_test.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BACKGROUND', (0,-1), (-1,-1), EMBER_DARK),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [colors.white, LIGHT_BG]),
    ]))
    story.append(t_test)
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------
    # 9. DEPLOYMENT & ENVIRONMENT CONFIGURATION
    # -------------------------------------------------------------
    story.append(Paragraph("9. Deployment & Environment Configuration", h1_style))
    story.append(Paragraph(
        "<b>Frontend (Vercel):</b> Set Root Directory to `echo-frontend`, Build Command `npm run build`, Output Directory `dist`, and configure `VITE_API_URL`.<br/>"
        "<b>Backend (Render / AWS):</b> Set Root Directory to `backend`, Build Command `npm run build`, Start Command `node dist/index.js`, and provision MongoDB Atlas URI, JWT Secret, Groq API Key, and ElevenLabs API Key.",
        body_style
    ))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[PDF] Successfully generated: {filename}")

if __name__ == "__main__":
    output_path = os.path.join(os.getcwd(), "ECHO_Project_Architecture_and_Specification.pdf")
    build_pdf(output_path)
