// Echo API client wired to backend endpoints.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getToken() {
  try {
    return localStorage.getItem("echo_token");
  } catch {
    return null;
  }
}

function setToken(token) {
  try {
    if (token) {
      localStorage.setItem("echo_token", token);
    } else {
      localStorage.removeItem("echo_token");
    }
  } catch {}
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }

  return data;
}

// --- Auth ---------------------------------------------------------------
export async function register({ email, password }) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data.token) {
    setToken(data.token);
  }
  return data.user;
}

export async function login({ email, password }) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data.token) {
    setToken(data.token);
  }
  return data.user;
}

export async function logout() {
  setToken(null);
  try {
    await request("/auth/logout", { method: "POST" });
  } catch {}
  return { success: true };
}

// --- Personas -------------------------------------------------------------
export async function createPersona({ name, relationship }) {
  return request("/personas", {
    method: "POST",
    body: JSON.stringify({ name, relationship }),
  });
}

export async function getPersonas() {
  return request("/personas");
}

export async function getPersona(id) {
  return request(`/personas/${id}`);
}

export async function updatePersona(id, patch) {
  return request(`/personas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deletePersona(id) {
  return request(`/personas/${id}`, {
    method: "DELETE",
  });
}

// --- Chat ingestion / analysis --------------------------------------------
export async function uploadChat(personaId, file) {
  const formData = new FormData();
  if (typeof file === "string") {
    // If passed raw string content or fallback
    return request(`/personas/${personaId}/upload`, {
      method: "POST",
      body: JSON.stringify({ content: file, fileName: "chat.txt" }),
    });
  }
  formData.append("file", file);
  return request(`/personas/${personaId}/upload`, {
    method: "POST",
    body: formData,
  });
}

export async function analyzePersona(personaId) {
  return request(`/personas/${personaId}/analyze`, {
    method: "POST",
  });
}

export async function reindexPersona(personaId) {
  return request(`/personas/${personaId}/reindex`, {
    method: "POST",
  });
}

// --- Voice ------------------------------------------------------------
export async function uploadVoice(personaId, file) {
  const formData = new FormData();
  formData.append("file", file);
  return request(`/personas/${personaId}/voice/upload`, {
    method: "POST",
    body: formData,
  });
}

export async function synthesizeVoice(personaId, text) {
  return request(`/personas/${personaId}/voice/synthesize`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function startVoiceSession(personaId) {
  return request(`/personas/${personaId}/voice/session`, {
    method: "POST",
  });
}

export async function transcribeVoice(personaId, audioBlob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "mic_input.wav");
  return request(`/personas/${personaId}/voice/transcribe`, {
    method: "POST",
    body: formData,
  });
}

// --- Memories -----------------------------------------------------------
export async function getMemories(personaId) {
  return request(`/personas/${personaId}/memories`);
}

export async function getMemoryMap(personaId) {
  return request(`/personas/${personaId}/memory-map`);
}

export async function updateMemory(personaId, memoryId, patch) {
  return request(`/personas/${personaId}/memories/${memoryId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteMemory(personaId, memoryId) {
  return request(`/personas/${personaId}/memories/${memoryId}`, {
    method: "DELETE",
  });
}

// --- Chat -----------------------------------------------------------------
export async function sendMessage(personaId, { message, sessionId }) {
  return request(`/chat/${personaId}`, {
    method: "POST",
    body: JSON.stringify({ message, sessionId }),
  });
}

export const API_BASE_URL = BASE_URL;
