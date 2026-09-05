// Echo API client.
//
// STATUS: not yet wired to a backend. Every export below is a stub that
// throws, on purpose — so that if a screen calls one before the backend
// step of this build exists, the failure is loud instead of silently
// falling back to mock data. Replace each stub's body with a real
// `fetch` call against VITE_API_URL when the backend is ready; keep the
// function signatures so the screens that already call them don't change.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function notImplemented(name) {
  throw new Error(
    `[api] ${name}() is not wired to a backend yet. See src/services/api.js.`
  );
}

// --- Auth ---------------------------------------------------------------
export async function register({ email, password }) {
  return notImplemented("register");
}

export async function login({ email, password }) {
  return notImplemented("login");
}

export async function logout() {
  return notImplemented("logout");
}

// --- Personas -------------------------------------------------------------
export async function createPersona({ name, relationship }) {
  return notImplemented("createPersona");
}

export async function getPersonas() {
  return notImplemented("getPersonas");
}

export async function getPersona(id) {
  return notImplemented("getPersona");
}

export async function updatePersona(id, patch) {
  return notImplemented("updatePersona");
}

export async function deletePersona(id) {
  return notImplemented("deletePersona");
}

// --- Chat ingestion / analysis --------------------------------------------
export async function uploadChat(personaId, file) {
  return notImplemented("uploadChat");
}

export async function analyzePersona(personaId) {
  return notImplemented("analyzePersona");
}

export async function reindexPersona(personaId) {
  return notImplemented("reindexPersona");
}

// --- Voice ------------------------------------------------------------
export async function uploadVoice(personaId, file) {
  return notImplemented("uploadVoice");
}

export async function synthesizeVoice(personaId, text) {
  return notImplemented("synthesizeVoice");
}

export async function startVoiceSession(personaId) {
  return notImplemented("startVoiceSession");
}

// --- Memories -----------------------------------------------------------
export async function getMemories(personaId) {
  return notImplemented("getMemories");
}

export async function getMemoryMap(personaId) {
  return notImplemented("getMemoryMap");
}

export async function updateMemory(personaId, memoryId, patch) {
  return notImplemented("updateMemory");
}

export async function deleteMemory(personaId, memoryId) {
  return notImplemented("deleteMemory");
}

// --- Chat -----------------------------------------------------------------
export async function sendMessage(personaId, { message, sessionId }) {
  return notImplemented("sendMessage");
}

export const API_BASE_URL = BASE_URL;
