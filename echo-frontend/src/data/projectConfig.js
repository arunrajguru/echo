/**
 * Digital Memory Companion — Global Project Configuration
 * 
 * Edit team members, founder information, capabilities, and contact links
 * from this single centralized file.
 */

export const PROJECT_INFO = {
  name: "Digital Memory Companion",
  shortName: "Echo",
  subtitle: "AI-Based Voice & Behavior Replica System",
  tagline: "Preserve authentic memories and converse with an grounded AI reflection.",
  description:
    "Digital Memory Companion analyzes uploaded conversational archives and voice samples to understand nuanced communication patterns, phrasing habits, and relational context. It produces dynamic, empathetic AI interactions strictly inspired by and grounded in preserved history.",
  disclaimer:
    "Simulated Reflection Notice: Echo generates simulated conversational responses using neural language and voice models grounded in your provided memories. It is an empathetic remembrance and assistive reflection tool, not an actual conscious entity or true recreation of an individual.",
};

export const CAPABILITIES = [
  {
    id: "chat-interaction",
    title: "AI Conversational Interaction",
    category: "Dialogue Engine",
    description:
      "Context-aware conversational interaction that respects relational tone, vocabulary choices, and dialogue history.",
    icon: "MessageSquareQuote",
    highlight: "Grounded in dialogue archives",
  },
  {
    id: "voice-interaction",
    title: "Voice Interaction",
    category: "Speech Pipeline",
    description:
      "Hands-free voice dialogue powered by high-accuracy speech-to-text and low-latency neural speech synthesis.",
    icon: "Mic",
    highlight: "Hands-free continuous mode",
  },
  {
    id: "style-analysis",
    title: "Communication-Style Analysis",
    category: "Linguistic Modeling",
    description:
      "Deep linguistic extraction analyzing sentiment, punctuation rhythms, brevity, vocabulary, and bilingual Hinglish nuances.",
    icon: "BrainCircuit",
    highlight: "Personalized style profile",
  },
  {
    id: "data-upload",
    title: "Chat & Document Upload",
    category: "Ingestion Pipeline",
    description:
      "Automated extraction from WhatsApp chat exports, CSV datasets, and voice audio clips with deduplication and sanitization.",
    icon: "FileUp",
    highlight: "Multi-format file parser",
  },
  {
    id: "rag-retrieval",
    title: "RAG-Based Knowledge Retrieval",
    category: "Dual RAG Grounding",
    description:
      "Strict semantic retrieval linking query context with persona-scoped memories. Prevents factual hallucinations with grounded fallbacks.",
    icon: "Layers",
    highlight: "Isolated persona vectors",
  },
  {
    id: "secure-handling",
    title: "Secure Data Handling",
    category: "Privacy & Security",
    description:
      "JWT-authenticated sessions, scoped user database schemas, isolated persona records, and zero cross-persona memory leakage.",
    icon: "ShieldCheck",
    highlight: "Encrypted & persona-scoped",
  },
  {
    id: "feedback-support",
    title: "Feedback & User Support",
    category: "Continuous Loop",
    description:
      "Integrated review workflows and rating feedback mechanisms designed for continuous refinement of memory synthesis and persona fidelity.",
    icon: "HeartHandshake",
    highlight: "Iterative quality feedback",
  },
];

/**
 * Project Founder / Project Lead Information
 * Editable from this single configuration block.
 */
export const FOUNDER_PROFILE = {
  name: "Arun Kumar P",
  role: "Project Lead / AI & Full-Stack Developer",
  photo: "/team/arun.jpg",
  introduction:
    "Responsible for the overall system architecture, AI/RAG orchestration, frontend and backend integration, voice synthesis pipelines, and production deployment of the Digital Memory Companion platform.",
  responsibilities: [
    "End-to-end System Architecture & Data Schema Design",
    "Dual-RAG Semantic Memory & Style Extraction Engine",
    "Real-time Voice Pipeline (Whisper STT + ElevenLabs / Edge TTS)",
    "Full-Stack Web Interface & Cloud Infrastructure Integration",
  ],
  github: "https://github.com/arunrajguru",
  linkedin: "https://www.linkedin.com/in/arun-kumar-p-5833632a7/", // Add LinkedIn profile link here
};

/**
 * Team VISORA Configuration (3 Members)
 * 
 * Replace placeholder values with your actual team details.
 * Empty strings for github/linkedin will automatically hide those action buttons.
 */
export const TEAM_MEMBERS = [
  {
    name: "Arun Kumar P",
    role: "Project Lead / AI & Full-Stack Developer",
    photo: "/team/arun.jpg",
    bio: "Leading system architecture, AI pipeline development, Dual-RAG retrieval, and full-stack integration.",
    contribution: "Project Architecture, Dual-RAG System, Full-Stack Engineering & Deployment",
    github: "https://github.com/arunrajguru",
    linkedin: "https://www.linkedin.com/in/arun-kumar-p-5833632a7/",
  },
  {
    name: "Anusha B L",
    role: "AI Research & RAG Systems Engineer",
    photo: "/team/anusha.jpg",
    bio: "Specializing in document parsing, vector indexing algorithms, and linguistic communication pattern analysis.",
    contribution: "Chat Ingestion Pipelines, Semantic Memory Indexing & Quality Assurance",
    github: "https://github.com/Anumin777",
    linkedin: "https://www.linkedin.com/in/anusha-bl-b3492b200?",
  },
  {
    name: "Hemanth Mardi K S",
    role: "Voice Pipeline & Neural Engine Engineer",
    photo: "/team/hemanth.jpg",
    bio: "Focusing on neural speech synthesis models, audio feature extraction, and continuous voice latency optimization.",
    contribution: "Neural Voice Engine, VoiceMode Continuity & Audio Processing",
    github: "https://github.com/Hemanth-Mardi",
    linkedin: "https://l1nk.dev/n67urjl",
  },
];

/**
 * Contact Options
 * Set values to display contact buttons. Empty strings will automatically be hidden.
 */
export const CONTACT_CONFIG = {
  email: "rajgurukotturu@gmail.com",
  whatsapp: "", // e.g. "+1234567890" or leave empty to hide
  github: "https://github.com/arunrajguru/echo",
  linkedin: "", // Replace with your LinkedIn organization or profile
  issueUrl: "https://github.com/arunrajguru/echo/issues",
};

export const LEGAL_INFO = {
  copyright: "© 2026 Arun Rajpurohit. All Rights Reserved.",
  ownershipNotice:
    "Developed by Team VISORA. This project and its underlying architecture are proprietary. Publicly available on GitHub for demonstration, research, and evaluation purposes.",
};
