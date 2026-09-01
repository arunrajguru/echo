const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
`;

export function GlobalStyle() {
  return (
    <style>{`
    ${FONTS}
    .echo-root {
      --void: #0a0c16;
      --panel: #12152540;
      --panel-solid: #12152a;
      --line: #2a3154;
      --ink: #f1eee6;
      --ink-dim: #9a9fc0;
      --ember: #e7a857;
      --ember-soft: rgba(231,168,87,0.14);
      --violet: #8b87d9;
      font-family: 'Inter', sans-serif;
      background: var(--void);
      color: var(--ink);
    }
    .echo-serif { font-family: 'Fraunces', serif; }
    .echo-mono { font-family: 'IBM Plex Mono', monospace; }
    .echo-fade-in { animation: echoFadeIn 0.5s ease both; }
    @keyframes echoFadeIn { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
    .echo-scrollbar::-webkit-scrollbar { width: 6px; }
    .echo-scrollbar::-webkit-scrollbar-thumb { background: var(--line); border-radius: 3px; }
    .echo-focus:focus-visible { outline: 2px solid var(--ember); outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) {
      .echo-fade-in { animation: none; }
    }
  `}</style>
  );
}

export default GlobalStyle;
