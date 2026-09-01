# Echo — frontend

This is your original single-file `echo-app_jsx.txt` component, split into a
real Vite project with no visual or behavioral changes except the two you
asked for:

1. A minimal **login/register screen** (`src/components/Auth.jsx`), gating
   "Create an Echo" (not "Explore memory space", which stays a read-only
   look at the demo persona).
2. A minimal **voice-upload field** added to Wizard step 3
   (`src/components/Wizard.jsx`), since consent previously had nothing to
   consent to. Voice stays optional — consent is only required once a file
   is attached.

## What's real vs. still mocked

Nothing here talks to a backend yet. `src/services/api.js` has one stub per
endpoint your spec calls for (`login`, `createPersona`, `uploadChat`,
`sendMessage`, etc.) — each one currently throws a clear "not wired yet"
error instead of silently faking success. `Auth.jsx` is the only screen
actually wired to call into `api.js` right now; every other screen still
runs on `src/data/mockData.js`, exactly as before.

## Running it

```bash
npm install
npm run dev
```

Then open the printed local URL. Copy `.env.example` to `.env` and point
`VITE_API_URL` at the backend once it exists.

## File map

```
src/
  App.jsx                 — screen router (landing/auth/wizard/space/chat)
  components/
    Landing.jsx
    Auth.jsx               — new
    Wizard.jsx              — voice upload field added in step 3
    MemorySpace.jsx
    ChatScreen.jsx
    MemoryOrb.jsx           — vanilla three.js, unchanged
    shared/
      GlobalStyle.jsx       — design tokens, unchanged
      Basics.jsx            — Logo, Disclaimer, PrimaryButton, GhostButton
  data/mockData.js          — MOCK_PERSONA, MOCK_MEMORIES
  services/api.js           — stub client, one function per backend endpoint
```

## Next step

Backend (Node/Express + MongoDB + RAG + OpenVoice) per the full spec —
not built yet.
