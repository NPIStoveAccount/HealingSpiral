# Healing Spiral Coach — Claude Code Handoff

## What This Is
A single-file React app (`healing-spiral-coach.jsx`, 1327 lines) that runs as a Claude.ai artifact. It guides users through a 10-dimension healing assessment, an AI-powered intake chat, a results/profile page, email capture, paywall, and a full AI coaching session — all powered by the Anthropic API called directly from the browser.

---

## File Location
`healing-spiral-coach.jsx` — copy this into your project root or a `/src` directory.

---

## Architecture

### Stage Flow (linear)
```
landing → persona → questionnaire → probing → results → email_capture → paywall → chat
```

### Key Constants
- **`DIMENSIONS`** — 10 healing dimensions, each with id, label, emoji, type, description, questions
  - 1 ground: `relational_field`
  - 6 cascade: `capacity_building → physiological_completion → affect_metabolization → differentiation → implicit_model_updating → identity_reorganization`
  - 3 orthogonal: `energetic_reorganization`, `shadow_integration`, `nondual_view`
- **`MODALITIES`** — 15 therapeutic modalities, each mapped to dimensions + tier (1-2)
- **`PERSONAS`** — 3 coach voices: Attuned Companion 🌿, Framework Peer 🧠, Straight Shooter ⚡
- **`TIER_LABELS`** — 7-tier scoring: Exemplary → Strong → Moderate → Developing → Emerging → Minimal → Harmful

### Scoring Logic (`computeScores`)
```js
// slider value 1-5 → tier 1-7 (inverted: high slider = low tier number = better)
scores[dim.id] = Math.round(((5 - val) / 4) * 5) + 1;
```

### Session Persistence
- Custom `usePersisted(key, default)` hook backed by `sessionStorage`
- Session key: `"healing_spiral_session"`
- Persisted keys: `stage`, `persona`, `clinicalMode`, `sliderResponses`, `currentDimIdx`, `probingMessages`, `probingDone`, `scores`, `email`, `emailSubmitted`, `chatMessages`
- **Persona rehydration**: persona is stored by value but `systemPrompt` (a function/string) can get stripped by JSON serialization — on load it's rehydrated via `PERSONAS.find(p => p.id === stored.id)`

---

## API Integration

### `callClaude(messages, systemPrompt, onChunk)`
```js
fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "anthropic-dangerous-direct-browser-access": "true"  // REQUIRED for browser calls
  },
  body: JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    messages
  })
})
```

### ⚠️ The Open Issue: API Not Responding
**Symptom:** Messages sent in the coaching chat, no response, or "Invalid response format" error.

**What we know:**
- The `anthropic-dangerous-direct-browser-access: true` header is present
- The model string `claude-haiku-4-5-20251001` is correct per the artifact environment
- Non-streaming (standard JSON fetch) is used — SSE was removed after causing silent failures
- Response parsing is hardened: finds `content[0].type === "text"` block
- Null persona guard added to `getSystemPrompt()`
- Error banner added to chat stage — shows exact error message when API fails

**Most likely causes to investigate:**
1. The Claude.ai artifact sandbox may intercept or block outbound fetch to `api.anthropic.com` — this would explain silent failures
2. The model string may need updating — check `https://docs.anthropic.com/en/docs/about-claude/models`
3. Try `claude-haiku-4-5` (without date suffix) or `claude-sonnet-4-5` as alternatives
4. If running outside the artifact sandbox (e.g. Vite/Next.js), you'll need an API key in headers: `"x-api-key": process.env.ANTHROPIC_API_KEY`

**Recommended first debug step in Claude Code:**
```js
// Test call outside component:
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [{ role: "user", content: "Say hello." }]
  })
});
console.log(await res.json());
```

---

## Component Tree

```
HealingSpiralApp          — main state, all API calls, stage routing
├── Landing               — animated intro, dimension preview chips
├── PersonaSelect         — 3 coach cards with hover state
├── Questionnaire         — 1 dimension at a time, slider 1-5, progress bar, back/next
├── ProbingChat           — 2-exchange AI intake, PROFILE_READY token detection
├── Results               — dimension bars, tier badges, growth edge, top modalities
├── EmailCapture          — email input, advances to paywall
├── Paywall               — pricing card ($0 beta), unlock button
└── CoachingChat          — sidebar + chat pane
    ├── sidebar           — persona switcher, lang toggle, profile bars, top modalities
    └── chat pane         — messages, typing indicator, nudge button, restart

Shared:
├── Bubble                — chat message bubble (user=gold, ai=dark)
├── Typing                — 3-dot bounce animation
├── Working               — pulsing gold bars with label
├── LangToggle            — clinical/plain toggle pill button
└── Glyph / GlyphSm       — ◎ spinning gold glyph
```

---

## Key Behaviors

### Probing Chat (`ProbingChat` + `sendProbingMessage`)
- Max 2 user exchanges
- On exchange 2, system prompt instructs AI to emit `[PROFILE_READY]` token
- Token stripped from display text before rendering
- `probingDone` triggers on: token present OR `aiSignaledTransition()` phrase match
- "Skip and view my profile →" link always visible after first AI message
- Coach voice switcher + language toggle in header

### Coaching Chat (`CoachingChat` + `sendChat` / `sendChatDirect`)
- `startChat()` fires on paywall unlock — skips if `chatMessages.length > 0` (session restore)
- `sendChatDirect(text)` — for nudge button prefills, avoids stale closure via functional updater
- System prompt explicitly says "do NOT re-introduce yourself or re-ask opening questions"
- Sidebar shows live profile bars, top 3 modalities, persona/language controls
- ↺ Restart button calls `clearSession()` + resets all state to defaults

### Language Modes
- `clinicalMode` (boolean) — toggled via `LangToggle`
- Injected into every system prompt via `getSystemPrompt(persona, clinical)`
- Clinical: precise terminology (polyvagal, window of tolerance, etc.)
- Plain: everyday language, felt-sense descriptions

### Error Handling
- All API calls wrapped in try/catch
- Errors surface as `⚠️ message` in the chat bubble
- Red debug banner at top of chat stage shows last `apiError` with dismiss button
- `getSystemPrompt()` has null persona guard: returns generic prompt if persona is null

---

## Known Issues / Backlog

| Issue | Priority | Notes |
|-------|----------|-------|
| **API not responding in artifact** | 🔴 Critical | See above — likely sandbox restriction or model string |
| Mobile layout | 🟡 Medium | Sidebar hardcoded 220px, breaks on phones < 600px |
| Email delivery | 🟡 Medium | Capture advances stage but doesn't actually send email |
| PDF report | 🟡 Medium | Referenced in UI, not built |
| sessionStorage scope | 🟢 Low | Tab-scoped only — clears on browser close |
| Stripe integration | 🟢 Low | Paywall is $0 beta placeholder |

---

## Styling Notes
- Font: Cormorant Garamond (loaded via Google Fonts in CSS injection)
- Color palette: `#0e0c0a` bg, `#e8e0d4` text, `#c9a227` gold, `#8a6d18` gold-dim
- CSS injected via `document.createElement("style")` — no external CSS file needed
- CSS class prefix: `hs-` (e.g. `hs-btn`, `hs-input`, `hs-root`)
- Keyframes: `spin`, `bounce`, `pulse-bar`, `fade-in`
- All inline styles otherwise — no Tailwind, no CSS modules

---

## Moving to a Real Dev Environment (Vite / Next.js)

1. Install deps: `npm install react react-dom` (or use Next.js)
2. Move API key to env: `ANTHROPIC_API_KEY=sk-...`
3. Update `callClaude` headers:
   ```js
   headers: {
     "Content-Type": "application/json",
     "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
     "anthropic-version": "2023-06-01"
     // remove "anthropic-dangerous-direct-browser-access" header
   }
   ```
4. Or route through a backend API endpoint to keep key server-side
5. Replace `sessionStorage` with `localStorage` for cross-session persistence
6. Consider adding a `useReducer` for the large state surface in `HealingSpiralApp`

---

## Framework Context (for AI coaching prompts)

The Healing Spiral is Eli's original framework. Key concepts to preserve:

- **Relational field as ground** — not just one dimension among others, but the substrate all healing occurs within
- **Reciprocal cascade** — the 6 cascade dimensions are directional (not strictly linear) with bidirectional feedback
- **Orthogonal dimensions** — energetic reorganization, shadow integration, nondual view cut across all cascade stages
- **Ambient vs acute relational field** — ongoing unconditional containers (AA, RC) vs peak/retreat experiences
- **Wedge concept** — different modalities unfuse specific experiential layer boundaries (sensation, emotion, narrative, identity, impulse)
- **7-tier scoring** — Exemplary (1) through Harmful (7); scoring is inverted from slider (high slider = low tier = more developed)

---

*Generated from a Claude.ai chat session. Full source file: `healing-spiral-coach.jsx`*
