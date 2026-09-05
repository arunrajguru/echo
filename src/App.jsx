import { useState } from "react";
import { GlobalStyle } from "./components/shared/GlobalStyle.jsx";
import { Landing } from "./components/Landing.jsx";
import { Auth } from "./components/Auth.jsx";
import { Wizard } from "./components/Wizard.jsx";
import { MemorySpace } from "./components/MemorySpace.jsx";
import { ChatScreen } from "./components/ChatScreen.jsx";
import { MOCK_PERSONA, MOCK_MEMORIES } from "./data/mockData.js";

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [persona, setPersona] = useState(null);
  const [user, setUser] = useState(null);

  // "Create an Echo" requires an account, since personas must be scoped to a
  // user once a backend exists. "Explore memory space" stays open — it's a
  // read-only look at the demo persona, not a real Echo tied to any account.
  const requireAuthThen = (nextScreen) => {
    if (user) {
      setScreen(nextScreen);
    } else {
      setScreen("auth");
    }
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
              setUser(loggedInUser);
              setScreen("wizard");
            }}
          />
        )}
        {screen === "wizard" && (
          <Wizard
            onBack={() => setScreen("landing")}
            onComplete={(p) => {
              setPersona(p);
              setScreen("space");
            }}
          />
        )}
        {screen === "space" && persona && (
          <MemorySpace
            persona={persona}
            onBack={() => setScreen("landing")}
            onOpenChat={() => setScreen("chat")}
          />
        )}
        {screen === "chat" && persona && (
          <ChatScreen
            persona={persona}
            onBack={() => setScreen("space")}
            onOpenSpace={() => setScreen("space")}
          />
        )}
      </div>
    </div>
  );
}
