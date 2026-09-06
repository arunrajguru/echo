import { useEffect, useState, useCallback } from "react";
import { GlobalStyle } from "./components/shared/GlobalStyle.jsx";
import { Landing } from "./components/Landing.jsx";
import { Auth } from "./components/Auth.jsx";
import { Wizard } from "./components/Wizard.jsx";
import { MemorySpace } from "./components/MemorySpace.jsx";
import { ChatScreen } from "./components/ChatScreen.jsx";
import { MOCK_PERSONA, MOCK_MEMORIES } from "./data/mockData.js";
import * as api from "./services/api.js";

export default function App() {
  // Start page defaults to Sign In page ("auth")
  const [screen, setScreen] = useState("auth");
  const [persona, setPersona] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("echo_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [personas, setPersonas] = useState([]);

  // Fetch all personas for the user
  const fetchPersonas = useCallback(async () => {
    try {
      const list = await api.getPersonas();
      if (Array.isArray(list)) {
        setPersonas(list);
      }
    } catch (err) {
      console.warn("[app] Failed to fetch personas:", err);
    }
  }, []);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas, user]);

  const requireAuthThen = (nextScreen) => {
    if (user && localStorage.getItem("echo_token")) {
      setScreen(nextScreen);
    } else {
      setScreen("auth");
    }
  };

  const handleSelectPersona = async (selected, targetScreen = "chat") => {
    const pId = selected.id || selected._id;
    let realMemories = selected.memories || [];
    if (pId && (!realMemories || realMemories.length === 0)) {
      try {
        const mems = await api.getMemories(pId);
        if (Array.isArray(mems) && mems.length > 0) {
          realMemories = mems;
        }
      } catch (err) {
        console.warn("[app] Could not fetch persona memories:", err);
      }
    }
    setPersona({
      id: pId,
      name: selected.name,
      relationship: selected.relationship,
      style: selected.styleProfile || selected.style || {},
      stats: selected.analysisMetadata?.stats || selected.stats || {},
      memories: realMemories,
    });
    setScreen(targetScreen);
  };

  return (
    <div className="echo-root w-full h-screen min-h-[640px] relative overflow-hidden">
      <GlobalStyle />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 20%, rgba(231,168,87,0.07), transparent 70%)",
        }}
      />
      <div className="relative w-full h-full">
        {screen === "landing" && (
          <Landing
            personas={personas}
            user={user}
            onOpenAuth={() => setScreen("auth")}
            onLogout={() => {
              localStorage.removeItem("echo_token");
              localStorage.removeItem("echo_user");
              setUser(null);
              setPersonas([]);
              setScreen("auth");
            }}
            onRefreshPersonas={fetchPersonas}
            onSelectPersona={handleSelectPersona}
            onCreate={() => requireAuthThen("wizard")}
            onExplore={() => {
              setPersona({ name: MOCK_PERSONA.name, memories: MOCK_MEMORIES });
              setScreen("space");
            }}
          />
        )}
        {screen === "auth" && (
          <Auth
            onBack={() => setScreen("landing")}
            onAuthenticated={(loggedInUser) => {
              try {
                if (loggedInUser) {
                  localStorage.setItem("echo_user", JSON.stringify(loggedInUser));
                }
              } catch {}
              setUser(loggedInUser);
              fetchPersonas();
              setScreen("landing");
            }}
          />
        )}
        {screen === "wizard" && (
          <Wizard
            onBack={() => {
              fetchPersonas();
              setScreen("landing");
            }}
            onComplete={(p) => {
              setPersona(p);
              fetchPersonas();
              setScreen("chat");
            }}
          />
        )}
        {screen === "space" && persona && (
          <MemorySpace
            persona={persona}
            onBack={() => {
              fetchPersonas();
              setScreen("landing");
            }}
            onOpenChat={() => setScreen("chat")}
          />
        )}
        {screen === "chat" && persona && (
          <ChatScreen
            persona={persona}
            onBack={() => {
              fetchPersonas();
              setScreen("landing");
            }}
            onOpenSpace={() => setScreen("space")}
          />
        )}
      </div>
    </div>
  );
}
