import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { jsPDF } from "jspdf";
import { applyPlugin } from "jspdf-autotable";
applyPlugin(jsPDF);

// ── CONSTANTS ──────────────────────────────────────────────────────────────

const DIMENSIONS = [
  { id: "relational_field", label: "Relational Field", emoji: "🌐", type: "ground",
    description: "The quality of safe, attuned connection — your ground for all healing.",
    questions: ["How safe do you feel being fully yourself with others?", "Do you have relationships where you can fall apart without consequence?"] },
  { id: "capacity_building", label: "Capacity Building", emoji: "🏗️", type: "cascade",
    description: "Building the nervous system's window of tolerance — your container for experience.",
    questions: ["How well can you stay present when emotions get intense?", "Do you have reliable ways to regulate your nervous system?"] },
  { id: "physiological_completion", label: "Physiological Completion", emoji: "⚡", type: "cascade",
    description: "Completing incomplete survival responses held in the body.",
    questions: ["Do you carry chronic tension or numbness in your body?", "Have you ever felt sensations move through and complete — leaving you lighter?"] },
  { id: "affect_metabolization", label: "Affect Metabolization", emoji: "🌊", type: "cascade",
    description: "Digesting emotions fully so they inform rather than overwhelm.",
    questions: ["When strong feelings arise, can you stay with them until they shift?", "Do emotions tend to get stuck — cycling without resolution?"] },
  { id: "differentiation", label: "Differentiation", emoji: "🧭", type: "cascade",
    description: "Knowing where you end and others begin — claiming your own center.",
    questions: ["Can you hold your perspective clearly in the presence of a strong other?", "Do you tend to lose yourself in relationships or take on others' emotional states?"] },
  { id: "implicit_model_updating", label: "Implicit Model Updating", emoji: "🔄", type: "cascade",
    description: "Revising the deep unconscious beliefs formed from early experience.",
    questions: ["Do you find yourself in similar relational patterns across different contexts?", "Have you had experiences where a core belief about yourself genuinely shifted?"] },
  { id: "identity_reorganization", label: "Identity Reorganization", emoji: "🦋", type: "cascade",
    description: "Letting old self-structures dissolve as a more authentic identity emerges.",
    questions: ["Are you in a period of identity flux — unclear who you are becoming?", "Have you integrated a major life reorganization in the past few years?"] },
  { id: "energetic_reorganization", label: "Energetic Reorganization", emoji: "✨", type: "orthogonal",
    description: "The movement of life-force through and beyond old blockages.",
    questions: ["Do you have access to states of aliveness, flow, or expanded energy?", "Do you work with practices that directly address energy or subtle body?"] },
  { id: "shadow_integration", label: "Shadow Integration", emoji: "🌑", type: "orthogonal",
    description: "Reclaiming disowned aspects — the gold in the darkness.",
    questions: ["Are there parts of yourself you find hard to acknowledge or own?", "Do you engage with your projections and reactive patterns as information?"] },
  { id: "nondual_view", label: "Nondual View", emoji: "∞", type: "orthogonal",
    description: "Recognizing awareness itself as ground — the view that holds everything.",
    questions: ["Do you have access to a perspective that isn't caught inside the problem?", "Have you had experiences of boundless awareness, even briefly?"] },
];

const MODALITIES = [
  { name: "Somatic Experiencing", dimensions: ["physiological_completion", "capacity_building"], tier: 1 },
  { name: "Internal Family Systems (IFS)", dimensions: ["shadow_integration", "differentiation", "affect_metabolization"], tier: 1 },
  { name: "EMDR", dimensions: ["physiological_completion", "implicit_model_updating"], tier: 1 },
  { name: "Mahamudra / Dzogchen", dimensions: ["nondual_view", "identity_reorganization"], tier: 2 },
  { name: "Re-evaluation Counseling", dimensions: ["relational_field", "affect_metabolization"], tier: 1 },
  { name: "Authentic Movement", dimensions: ["energetic_reorganization", "shadow_integration"], tier: 2 },
  { name: "12-Step Work", dimensions: ["relational_field", "shadow_integration", "affect_metabolization"], tier: 1 },
  { name: "Breathwork (Holotropic)", dimensions: ["energetic_reorganization", "physiological_completion"], tier: 2 },
  { name: "Psychotherapy (Relational)", dimensions: ["relational_field", "implicit_model_updating", "differentiation"], tier: 1 },
  { name: "Existential Kink", dimensions: ["shadow_integration", "affect_metabolization"], tier: 2 },
  { name: "Mindfulness Meditation", dimensions: ["capacity_building", "nondual_view"], tier: 1 },
  { name: "Bioenergetics", dimensions: ["physiological_completion", "energetic_reorganization"], tier: 2 },
  { name: "Parts Work (General)", dimensions: ["differentiation", "shadow_integration"], tier: 1 },
  { name: "Hakomi", dimensions: ["capacity_building", "implicit_model_updating"], tier: 1 },
  { name: "Systemic Constellations", dimensions: ["relational_field", "implicit_model_updating"], tier: 2 },
];

const PERSONAS = [
  { id: "direct", name: "The Straight Shooter", emoji: "⚡",
    desc: "No-fluff, outcome-focused, cuts to what matters",
    systemPrompt: `You are a direct, outcome-focused healing coach who uses the Healing Spiral framework with precision. No fluff. No spiritual bypass. You help people identify exactly where they're stuck, what dimension of the Spiral it maps to, and what the most leverage-point intervention would be. You ask sharp questions. You name patterns directly. You trust the person to handle honesty. You are warm but you don't waste time. You help people move.` },
  { id: "warm", name: "The Attuned Companion", emoji: "🌿",
    desc: "Warm, embodied, present — meets you in felt sense",
    systemPrompt: `You are a warm, deeply attuned healing coach versed in the Healing Spiral framework. Your presence is gentle and fully present. You track both what is said and what is felt. You ask one question at a time, with space. You never rush toward solution. You hold the person as a whole ecosystem. You can work somatically when the person wants body-based exploration, but you are equally skilled at teaching the framework, exploring patterns intellectually, sitting with emotions, or helping someone think through what's stuck. You follow the person's lead on what mode of exploration they want.` },
  { id: "peer", name: "The Framework Peer", emoji: "🧠",
    desc: "Intellectually rigorous, framework-fluent, challenges you",
    systemPrompt: `You are a framework-fluent intellectual peer coaching through the Healing Spiral. You hold the full 10-dimension map with precision: the relational field as ground, the six-dimension reciprocal cascade (capacity building → physiological completion → affect metabolization → differentiation → implicit model updating → identity reorganization), and three orthogonal dimensions (energetic reorganization, shadow integration, nondual view). You speak frankly, challenge assumptions, and help the person think clearly about where they actually are versus where they think they are. You bring conceptual rigor without losing the person in abstraction.` },
];

function aiSignaledTransition(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  const triggers = [
    "generate your profile", "generating your profile",
    "pull together your profile", "putting together your profile",
    "your full profile is ready", "view your full profile",
    "building your profile", "creating your profile", "preparing your profile",
    "enough to generate your profile", "enough now to build",
    "let me put your profile together",
  ];
  return triggers.some(t => lower.includes(t));
}

function getSystemPrompt(persona, clinical) {
  if (!persona) return "You are a helpful healing coach.";
  const modifier = clinical
    ? `

LANGUAGE MODE — CLINICAL: Use precise psychological and somatic terminology. Reference specific modalities, frameworks, and mechanisms by name (e.g. window of tolerance, polyvagal theory, implicit memory, interoception, dorsal vagal shutdown, parts language, etc.). Assume the person is fluent in therapeutic and developmental language. Do not over-explain terms.`
    : `

LANGUAGE MODE — PLAIN: Use plain, human, accessible language. Avoid jargon entirely. Translate any clinical concepts into everyday words and felt-sense descriptions. Speak as a wise friend who happens to know this terrain deeply — not as a clinician.`;
  return persona.systemPrompt + modifier;
}

const TIER_LABELS = ["", "Exemplary", "Strong", "Moderate", "Developing", "Emerging", "Minimal", "Harmful"];

// ── CLAUDE API CALL ────────────────────────────────────────────────────────

const MOCK_RESPONSES = [
  "I notice you scored lowest in the area of physiological completion — the body's ability to discharge and resolve held survival responses. I'm curious: when you feel tension or activation building in your body, what tends to happen? Does the energy move through, or does it get stuck somewhere?",
  "That makes a lot of sense. It sounds like there's a pattern of the body bracing — holding energy rather than letting it complete its arc. What does that feel like in your body right now, as you describe it?\n\n[PROFILE_READY]",
  "You mentioned that tension tends to get stuck in your shoulders and chest. I want to stay with that. In the Healing Spiral, physiological completion is about letting those incomplete survival responses finally move through. What happens when you bring gentle attention to that area right now — not trying to fix it, just noticing?",
  "That's a really important observation. The fact that you can notice the holding without immediately trying to change it — that's actually capacity building in action. It's the container that makes deeper release possible. What feels like the right next step for you here?",
  "I hear you. Sometimes the most powerful thing is simply to stay present with what's already moving, without rushing toward resolution. The body has its own intelligence about timing. What would it mean for you to trust that process a little more this week?",
];
let mockIdx = 0;

async function mockClaude(messages, systemPrompt, onChunk) {
  await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
  const text = MOCK_RESPONSES[mockIdx % MOCK_RESPONSES.length];
  mockIdx++;
  if (onChunk) onChunk(text);
  return text;
}

async function callClaude(messages, systemPrompt, onChunk) {
  if (import.meta.env.VITE_MOCK_API === "true") {
    return mockClaude(messages, systemPrompt, onChunk);
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      systemPrompt,
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error("API " + response.status + ": " + errBody.slice(0, 300));
  }

  let data;
  try { data = await response.json(); }
  catch (e) { throw new Error("Could not parse API response: " + e.message); }

  const block = Array.isArray(data.content) && data.content.find(b => b.type === "text");
  const text = (block && block.text) || (data.content && data.content[0] && data.content[0].text) || "";
  if (!text) throw new Error("Empty response. Data: " + JSON.stringify(data).slice(0, 200));
  if (onChunk) onChunk(text);
  return text;
}

// ── SCORING ────────────────────────────────────────────────────────────────

function computeScores(responses) {
  // responses: { [dimId]: number (1-5) }
  const scores = {};
  for (const dim of DIMENSIONS) {
    const val = responses[dim.id] || 3;
    // Map 1-5 slider to tier 1-7 (inverted — high slider = high tier)
    scores[dim.id] = Math.round(((5 - val) / 4) * 5) + 1; // 1=Exemplary, 6=Minimal
  }
  return scores;
}

function getTopModalities(scores, n = 5) {
  const dimScores = scores;
  const ranked = MODALITIES.map(mod => {
    const relevance = mod.dimensions.reduce((sum, d) => sum + (dimScores[d] || 3), 0) / mod.dimensions.length;
    return { ...mod, relevance };
  }).sort((a, b) => b.relevance - a.relevance);
  return ranked.slice(0, n);
}

// ── PDF GENERATION ────────────────────────────────────────────────────────

async function generatePDF(scores) {
  const doc = new jsPDF();
  // autoTable is available via the static import of jspdf-autotable

  // Header
  doc.setFontSize(26);
  doc.setTextColor(201, 162, 39);
  doc.text("The Healing Spiral", 105, 25, { align: "center" });
  doc.setFontSize(11);
  doc.setTextColor(120);
  doc.text("Your Personal Profile", 105, 33, { align: "center" });
  doc.setDrawColor(201, 162, 39);
  doc.line(20, 38, 190, 38);

  // Dimension table
  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text("Your 10 Dimensions", 14, 48);

  const tableData = DIMENSIONS.map(d => [
    d.emoji + " " + d.label,
    TIER_LABELS[scores[d.id]] || "N/A",
    scores[d.id] + " / 7",
  ]);

  doc.autoTable({
    startY: 52,
    head: [["Dimension", "Tier", "Score"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [201, 162, 39], textColor: [14, 12, 10] },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 40 }, 2: { cellWidth: 28, halign: "center" } },
    margin: { left: 14, right: 14 },
    tableWidth: "auto",
  });

  // Growth edge
  const lowestDims = DIMENSIONS.filter(d => (scores[d.id] || 0) >= 5);
  let y = (doc.lastAutoTable?.finalY || 120) + 14;
  if (lowestDims.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(201, 162, 39);
    doc.text("Key Growth Edge", 14, y);
    doc.setFontSize(10);
    doc.setTextColor(60);
    const edgeText = lowestDims.map(d => d.label).slice(0, 2).join(" and ") + ": " + (lowestDims[0]?.description || "");
    doc.text(edgeText, 14, y + 7, { maxWidth: 180 });
    y += 22;
  }

  // Top modalities
  const mods = getTopModalities(scores, 5);
  doc.setFontSize(14);
  doc.setTextColor(201, 162, 39);
  doc.text("Top Recommended Modalities", 14, y);
  doc.setFontSize(10);
  doc.setTextColor(60);
  mods.forEach((m, i) => {
    doc.text((i + 1) + ". " + m.name, 18, y + 8 + (i * 7));
  });

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("The Healing Spiral — An integrative map of personal evolution", 105, pageH - 10, { align: "center" });

  return doc.output("datauristring").split(",")[1];
}

async function downloadPDF(scores) {
  const base64 = await generatePDF(scores);
  const link = document.createElement("a");
  link.href = "data:application/pdf;base64," + base64;
  link.download = "healing-spiral-profile.pdf";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── MAIN APP ───────────────────────────────────────────────────────────────

// ── SESSION PERSISTENCE ────────────────────────────────────────────────────

const SESSION_KEY_ANON = "healing_spiral_session";

function emailHash(email) {
  let h = 0;
  for (let i = 0; i < email.length; i++) {
    h = ((h << 5) - h) + email.charCodeAt(i);
    h |= 0;
  }
  return "healing_spiral_" + Math.abs(h).toString(36);
}

let activeSessionKey = SESSION_KEY_ANON;

function setSessionKey(email) {
  activeSessionKey = email ? emailHash(email.toLowerCase().trim()) : SESSION_KEY_ANON;
}

function loadSession(key) {
  try {
    const raw = localStorage.getItem(key || activeSessionKey);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(patch) {
  try {
    const prev = loadSession() || {};
    localStorage.setItem(activeSessionKey, JSON.stringify({ ...prev, ...patch }));
  } catch {}
}

function clearSession() {
  try { localStorage.removeItem(activeSessionKey); } catch {}
}

// ── RESPONSIVE HOOK ───────────────────────────────────────────────────────

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

function usePersisted(key, defaultVal) {
  const [val, setVal] = useState(() => {
    const s = loadSession();
    return s && s[key] !== undefined ? s[key] : defaultVal;
  });
  const setAndPersist = useCallback((next) => {
    setVal(prev => {
      const resolved = typeof next === "function" ? next(prev) : next;
      saveSession({ [key]: resolved });
      return resolved;
    });
  }, [key]);
  return [val, setAndPersist];
}

export default function HealingSpiralApp() {
  // stages: landing | persona | questionnaire | probing | results | email_capture | paywall | chat
  const [stage, setStageRaw] = usePersisted("stage", "landing");
  const setStage = (s) => { setStageRaw(s); };
  const [_personaStored, setPersonaRaw] = usePersisted("persona", null);
  // Re-hydrate from PERSONAS array to restore functions/prompts stripped by JSON serialization
  const persona = _personaStored ? (PERSONAS.find(p => p.id === _personaStored.id) || _personaStored) : null;
  const setPersona = (p) => setPersonaRaw(p);
  const [clinicalMode, setClinicalMode] = usePersisted("clinicalMode", false);
  const [sliderResponses, setSliderResponses] = usePersisted("sliderResponses", {});
  const [currentDimIdx, setCurrentDimIdx] = usePersisted("currentDimIdx", 0);
  const [probingMessages, setProbingMessages] = usePersisted("probingMessages", []);
  const [probingInput, setProbingInput] = useState("");
  const [probingLoading, setProbingLoading] = useState(false);
  const [probingDone, setProbingDone] = usePersisted("probingDone", false);
  const [scores, setScores] = usePersisted("scores", null);
  const [email, setEmail] = usePersisted("email", "");
  const [emailSubmitted, setEmailSubmitted] = usePersisted("emailSubmitted", false);
  const [chatMessages, setChatMessages] = usePersisted("chatMessages", []);
  const [previousChatContext, setPreviousChatContext] = usePersisted("previousChatContext", null);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [apiError, setApiError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [emailSending, setEmailSending] = useState(false);
  const [userMessageCount, setUserMessageCount] = usePersisted("userMessageCount", 0);
  const [paymentVerified, setPaymentVerified] = usePersisted("paymentVerified", false);
  const chatBottomRef = useRef(null);
  const probingBottomRef = useRef(null);

  const FREE_MESSAGE_LIMIT = 20;
  const isMessageCapReached = !paymentVerified && userMessageCount >= FREE_MESSAGE_LIMIT;

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, []);

  // On mount: if anonymous session has an email, switch to email-keyed session
  useEffect(() => {
    const anon = loadSession(SESSION_KEY_ANON);
    if (anon?.email) {
      setSessionKey(anon.email);
      const keyed = loadSession();
      if (keyed && keyed.stage) {
        // Email-keyed session exists — it's already loaded via usePersisted
      }
    }
  }, []);

  // On mount: detect return from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const cancelled = params.get("payment");
    if (sessionId) {
      fetch(`/api/checkout/verify?session_id=${sessionId}`)
        .then(r => r.json())
        .then(data => {
          if (data.paid) {
            setPaymentVerified(true);
            setUserMessageCount(0);
            saveSession({ paymentVerified: true });
            addToast("Payment successful! Unlimited coaching unlocked.", "success");
          }
        })
        .catch(e => console.error("Payment verification error:", e));
      window.history.replaceState({}, "", window.location.pathname);
    } else if (cancelled === "cancelled") {
      addToast("Payment was cancelled. You can try again anytime.", "info");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, streamingText]);

  useEffect(() => {
    probingBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [probingMessages]);

  // Start probing after questionnaire
  const startProbing = useCallback(async (responses) => {
    const computedScores = computeScores(responses);
    setScores(computedScores);
    setStage("probing");
    setProbingLoading(true);

    const summaryLines = DIMENSIONS.map(d =>
      `${d.label}: ${responses[d.id] || 3}/5`
    ).join(", ");

    const systemPrompt = `${getSystemPrompt(persona, clinicalMode)}

You are conducting a brief intake deepening conversation. The person just completed a 10-dimension Healing Spiral self-assessment. Here are their scores (1=low/struggling, 5=high/thriving):
${summaryLines}

Your job: Ask ONE insightful, open-ended question that probes the area where they scored lowest. Make it personal, specific, and inviting. Do not explain the framework. Just ask the question warmly. Keep it to 2-3 sentences max.`;

    const msgs = [{ role: "user", content: "I just completed the assessment." }];
    let aiText = "";
    try {
      aiText = await callClaude(msgs, systemPrompt, (partial) => {
        setStreamingText(partial);
      });
    } catch (e) {
      aiText = `⚠️ Couldn\'t connect: ${e.message}. Please refresh and try again.`;
    }
    setStreamingText("");
    setProbingMessages([{ role: "assistant", content: aiText }]);
    setProbingLoading(false);
  }, [persona, clinicalMode]);

  const sendProbingMessage = async () => {
    if (!probingInput.trim() || probingLoading) return;
    const userMsg = { role: "user", content: probingInput };
    const newMsgs = [...probingMessages, userMsg];
    setProbingMessages(newMsgs);
    setProbingInput("");
    setProbingLoading(true);

    const userCount = newMsgs.filter(m => m.role === "user").length;
    const isLastExchange = userCount >= 2;

    const systemPrompt = `${getSystemPrompt(persona, clinicalMode)}

You are doing a brief intake deepening — maximum 2 user exchanges. ${isLastExchange
  ? `This is the FINAL exchange. You MUST end your response with exactly the token [PROFILE_READY] on its own line. Before it, write 1-2 sentences synthesizing what you heard.`
  : `Ask ONE focused follow-up question. Be brief. Do not wrap up yet.`}`;

    const apiMsgs = newMsgs.map(m => ({ role: m.role, content: m.content }));
    let aiText = "";
    try {
      aiText = await callClaude(apiMsgs, systemPrompt, (partial) => setStreamingText(partial));
    } catch (e) {
      aiText = isLastExchange ? "Thank you — I have what I need.\n[PROFILE_READY]" : "Say more — what's most present for you right now?";
    }

    // Strip the token from display text
    const hasToken = aiText.includes("[PROFILE_READY]");
    const cleanText = aiText.replace(/\[PROFILE_READY\]\s*/g, "").trim();

    setStreamingText("");
    const updated = [...newMsgs, { role: "assistant", content: cleanText }];
    setProbingMessages(updated);
    setProbingLoading(false);

    // Trigger done if token present OR (last exchange AND AI used wrap-up language)
    if (hasToken || (isLastExchange && aiSignaledTransition(cleanText))) {
      setProbingDone(true);
    }
  };

  const initiateCheckout = useCallback(async () => {
    try {
      const resp = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, returnUrl: window.location.origin }),
      });
      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        addToast(data.error || "Couldn't start checkout. Please try again.", "error");
      }
    } catch (e) {
      addToast("Payment service unavailable. Please try again later.", "error");
    }
  }, [email, addToast]);

  const startChat = useCallback(async () => {
    setStage("chat");
    // If session already has chat messages (restored), don't re-fire the opening
    if (chatMessages.length > 0) {
      setChatLoading(false);
      return;
    }
    setChatLoading(true);
    const topMods = getTopModalities(scores, 3).map(m => m.name).join(", ");
    const lowestDim = DIMENSIONS.reduce((a, b) => (scores[a.id] || 7) > (scores[b.id] || 7) ? a : b);

    const systemPrompt = `${getSystemPrompt(persona, clinicalMode)}

CONTEXT FROM INTAKE:
- Healing Spiral dimension scores: ${DIMENSIONS.map(d => `${d.label}: tier ${scores[d.id]}`).join(", ")}
- Most underdeveloped dimension: ${lowestDim.label}
- Top recommended modalities: ${topMods}
- Intake conversation: ${probingMessages.map(m => `${m.role}: ${m.content}`).join(" | ")}

${previousChatContext ? `PREVIOUS SESSION CONTEXT (the person has been here before and restarted):
${previousChatContext}

Open the coaching session by briefly acknowledging they're back. Offer a numbered list of directions — the FIRST option should always be to pick up where they left off, referencing the specific topic from their previous session. Then offer these additional options:
2. Explore the Healing Spiral framework itself — understand how the 10 dimensions map to their situation
3. Work with something that feels alive or present right now
4. Dig into something that feels stuck or repeating
5. Look at what might be being avoided or pushed away
6. Go deeper on a specific dimension from their profile (pick the one most relevant — name it and briefly say why)` :
`Open the coaching session by briefly acknowledging something specific from their intake, then offer 5 directions they could explore — framed as a numbered list. The five options should always be variations of:
1. Explore the Healing Spiral framework itself — understand how the 10 dimensions map to their situation, what their scores mean, and how the dimensions interact
2. Work with something that feels alive or present right now
3. Dig into something that feels stuck or repeating
4. Look at what might be being avoided or pushed away
5. Go deeper on a specific dimension from their profile (pick the one most relevant to what they shared — name it and briefly say why)`}
Personalize each option using what they shared in the intake. Keep the tone warm but efficient — the user has limited messages, so help them choose a focus quickly rather than diving straight into an exercise.`;

    let aiText = "";
    try {
      aiText = await callClaude([{ role: "user", content: "I'm ready to begin." }], systemPrompt, (p) => setStreamingText(p));
    } catch (e) {
      aiText = "⚠️ Could not connect: " + e.message;
    }
    setStreamingText("");
    setChatMessages([{ role: "assistant", content: aiText }]);
    setChatLoading(false);
  }, [persona, scores, probingMessages, clinicalMode, chatMessages.length, previousChatContext]);

  const sendChatDirect = async (text) => {
    if (chatLoading || isMessageCapReached) return;
    setUserMessageCount(c => c + 1);
    const userMsg = { role: "user", content: text };
    // Use functional updater to get latest chatMessages without stale closure
    let latestMsgs;
    setChatMessages(prev => {
      latestMsgs = [...prev, userMsg];
      return latestMsgs;
    });
    setChatInput("");
    setChatLoading(true);
    const topMods = getTopModalities(scores, 3).map(m => m.name).join(", ");
    const systemPrompt = `${getSystemPrompt(persona, clinicalMode)}

You are in an ongoing coaching session. The person has completed a Healing Spiral assessment. Key context: dimension scores: ${scores ? DIMENSIONS.map(d => d.label + ": tier " + scores[d.id]).join(", ") : "not available"}. Top modalities: ${topMods}. Continue the conversation — do NOT re-introduce yourself or re-ask opening questions. Pick up exactly where the conversation left off.${previousChatContext ? `

CONTEXT FROM PREVIOUS SESSION (if they chose to pick up where they left off, use this):
${previousChatContext}` : ""}

IMPORTANT: Follow the person's lead. If they want to explore the Healing Spiral framework or understand their dimensions, teach and explain — don't redirect into exercises. If they want to work with emotions or body sensations, go there. If they want to explore patterns or what's stuck, do that. Match the mode they're asking for.

THE HEALING SPIRAL FRAMEWORK (for when the person asks about it):
- The Relational Field is the ground — safe attuned connection that makes all other healing possible
- Six dimensions form a reciprocal cascade: Capacity Building → Physiological Completion → Affect Metabolization → Differentiation → Implicit Model Updating → Identity Reorganization
- Three orthogonal dimensions operate independently: Energetic Reorganization, Shadow Integration, Nondual View
- Tiers run from 1 (Exemplary) to 7 (Harmful). Lower numbers = more developed.`;
    // latestMsgs may be undefined if setChatMessages batched — fall back to snapshot
    setTimeout(async () => {
      const msgs = latestMsgs || [...chatMessages, userMsg];
      try {
        const aiText = await callClaude(msgs.map(m => ({ role: m.role, content: m.content })), systemPrompt, (p) => setStreamingText(p));
        setStreamingText("");
        setChatMessages([...msgs, { role: "assistant", content: aiText }]);
      } catch (e) {
        setStreamingText("");
        setChatMessages([...msgs, { role: "assistant", content: `⚠️ Connection error: ${e.message}. Please try again.` }]);
      }
      setChatLoading(false);
    }, 0);
  };

  const sendChat = async () => {
    const inputVal = typeof chatInput === "string" ? chatInput : String(chatInput ?? "");
    if (!inputVal.trim() || chatLoading || isMessageCapReached) return;
    setUserMessageCount(c => c + 1);
    const userMsg = { role: "user", content: inputVal };
    const newMsgs = [...chatMessages, userMsg];
    setChatMessages(newMsgs);
    setChatInput("");
    setChatLoading(true);

    const topMods = getTopModalities(scores, 3).map(m => m.name).join(", ");
    const systemPrompt = `${getSystemPrompt(persona, clinicalMode)}

You are in an ongoing coaching session. The person has completed a Healing Spiral assessment. Key context: dimension scores: ${scores ? DIMENSIONS.map(d => d.label + ": tier " + scores[d.id]).join(", ") : "not available"}. Top modalities: ${topMods}. Continue the conversation — do NOT re-introduce yourself or re-ask opening questions. Stay present with what they just said.${previousChatContext ? `

CONTEXT FROM PREVIOUS SESSION (if they chose to pick up where they left off, use this):
${previousChatContext}` : ""}

IMPORTANT: Follow the person's lead. If they want to explore the Healing Spiral framework or understand their dimensions, teach and explain — don't redirect into exercises. If they want to work with emotions or body sensations, go there. If they want to explore patterns or what's stuck, do that. Match the mode they're asking for.

THE HEALING SPIRAL FRAMEWORK (for when the person asks about it):
- The Relational Field is the ground — safe attuned connection that makes all other healing possible
- Six dimensions form a reciprocal cascade: Capacity Building → Physiological Completion → Affect Metabolization → Differentiation → Implicit Model Updating → Identity Reorganization
- Three orthogonal dimensions operate independently: Energetic Reorganization, Shadow Integration, Nondual View
- Tiers run from 1 (Exemplary) to 7 (Harmful). Lower numbers = more developed.`;

    let aiText = "";
    try {
      aiText = await callClaude(newMsgs.map(m => ({ role: m.role, content: m.content })), systemPrompt, (p) => setStreamingText(p));
    } catch (e) {
      setStreamingText("");
      setApiError(e.message);
      setChatMessages([...newMsgs, { role: "assistant", content: "⚠️ " + e.message }]);
      setChatLoading(false);
      return;
    }
    setStreamingText("");
    setChatMessages([...newMsgs, { role: "assistant", content: aiText }]);
    setChatLoading(false);
  };

  const clearAllData = useCallback(() => {
    // Remove all healing spiral keys from localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("healing_spiral") || key.startsWith("hs_"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    // Reset all state to defaults
    activeSessionKey = SESSION_KEY_ANON;
    setStageRaw("landing");
    setPersonaRaw(null);
    setClinicalMode(false);
    setSliderResponses({});
    setCurrentDimIdx(0);
    setProbingMessages([]);
    setProbingDone(false);
    setScores(null);
    setEmail("");
    setEmailSubmitted(false);
    setChatMessages([]);
    setPreviousChatContext(null);
    setUserMessageCount(0);
    setPaymentVerified(false);
  }, []);

  // ── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div style={styles.root}>
      <div style={styles.grain} />
      
      {stage === "landing" && <Landing onStart={() => setStage("persona")} onClearData={clearAllData} onLogin={(loginEmail) => {
        const key = emailHash(loginEmail.toLowerCase().trim());
        const existing = loadSession(key);
        if (existing && existing.scores) {
          // Returning user — restore their session
          setSessionKey(loginEmail);
          setEmail(loginEmail);
          setEmailSubmitted(true);
          if (existing.persona) setPersonaRaw(existing.persona);
          if (existing.scores) setScores(existing.scores);
          if (existing.probingMessages) setProbingMessages(existing.probingMessages);
          if (existing.clinicalMode !== undefined) setClinicalMode(existing.clinicalMode);
          setProbingDone(true);
          setStage("returning");
        } else {
          // New user — just pre-fill email and start assessment
          setEmail(loginEmail);
          setStage("persona");
        }
      }} />}

      {stage === "returning" && (
        <ReturningUser
          email={email}
          scores={scores}
          onContinueChat={() => {
            const existing = loadSession();
            if (existing?.chatMessages?.length > 0) {
              setChatMessages(existing.chatMessages);
              setUserMessageCount(existing.userMessageCount || 0);
              setPaymentVerified(existing.paymentVerified || false);
              setStage("chat");
            } else {
              setChatMessages([]);
              setUserMessageCount(0);
              setPaymentVerified(false);
              setStage("paywall");
            }
          }}
          onNewAssessment={() => {
            // Keep email, clear assessment data
            setSliderResponses({});
            setCurrentDimIdx(0);
            setProbingMessages([]);
            setProbingDone(false);
            setScores(null);
            setChatMessages([]);
            setUserMessageCount(0);
            setPaymentVerified(false);
            setStage("persona");
          }}
        />
      )}
      
      {stage === "persona" && (
        <PersonaSelect onSelect={(p) => { setPersona(p); setStage("questionnaire"); }} />
      )}

      {stage === "questionnaire" && (
        <Questionnaire
          dimIdx={currentDimIdx}
          responses={sliderResponses}
          onChange={(id, val) => setSliderResponses(r => ({ ...r, [id]: val }))}
          onNext={() => {
            if (currentDimIdx < DIMENSIONS.length - 1) {
              setCurrentDimIdx(i => i + 1);
            } else {
              startProbing(sliderResponses);
            }
          }}
          onBack={() => currentDimIdx > 0 && setCurrentDimIdx(i => i - 1)}
        />
      )}

      {stage === "probing" && (
        <ProbingChat
          messages={probingMessages}
          input={probingInput}
          loading={probingLoading}
          streaming={streamingText}
          done={probingDone}
          bottomRef={probingBottomRef}
          onInput={setProbingInput}
          onSend={sendProbingMessage}
          onDone={() => setStage("results")}
          currentPersona={persona}
          onPersonaChange={setPersona}
          clinicalMode={clinicalMode}
          onToggleClinical={() => setClinicalMode(c => !c)}
        />
      )}

      {stage === "results" && scores && (
        <Results
          scores={scores}
          modalities={getTopModalities(scores, 5)}
          onEmailCapture={() => setStage("email_capture")}
          onDownloadPDF={() => downloadPDF(scores)}
        />
      )}

      {stage === "email_capture" && (
        <EmailCapture
          email={email}
          onChange={setEmail}
          loading={emailSending}
          onSubmit={async () => {
            setEmailSending(true);
            setEmailSubmitted(true);

            // Check for returning user with this email
            const keyedSession = loadSession(emailHash(email.toLowerCase().trim()));
            if (keyedSession?.chatMessages?.length > 0) {
              setSessionKey(email);
              if (keyedSession.persona) setPersonaRaw(keyedSession.persona);
              if (keyedSession.scores) setScores(keyedSession.scores);
              if (keyedSession.chatMessages) setChatMessages(keyedSession.chatMessages);
              if (keyedSession.probingMessages) setProbingMessages(keyedSession.probingMessages);
              if (keyedSession.clinicalMode !== undefined) setClinicalMode(keyedSession.clinicalMode);
              setProbingDone(true);
              setEmailSending(false);
              setStage("chat");
              return;
            }

            // New user — migrate session to email-keyed storage
            setSessionKey(email);
            saveSession({
              stage: "paywall", email, emailSubmitted: true,
              persona: _personaStored, clinicalMode, sliderResponses,
              scores, probingMessages, probingDone: true,
            });

            // Generate PDF and send email with feedback
            try {
              const pdfBase64 = await generatePDF(scores);
              try {
                const resp = await fetch("/api/send-report", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email, scores,
                    dimensions: DIMENSIONS.map(d => ({ id: d.id, label: d.label, emoji: d.emoji, description: d.description })),
                    tierLabels: TIER_LABELS,
                    modalities: getTopModalities(scores, 5).map(m => ({ name: m.name, dimensions: m.dimensions })),
                    pdfBase64,
                  }),
                });
                if (!resp.ok) throw new Error("Server returned " + resp.status);
                addToast("Your report has been sent! Check your inbox.", "success");
              } catch (e) {
                console.error("Email send failed:", e);
                addToast("Couldn't send report email. You can still download the PDF.", "error");
              }
            } catch (e) {
              console.error("PDF generation error:", e);
              addToast("Couldn't generate PDF. Your results are still saved.", "error");
            }

            setEmailSending(false);
            setStage("paywall");
          }}
        />
      )}

      {stage === "paywall" && (
        <Paywall onUnlock={() => startChat()} />
      )}

      {stage === "chat" && apiError && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: "rgba(127, 29, 29, 0.95)", color: "#fca5a5",
          padding: "0.75rem 1.25rem", fontSize: "0.85rem",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          display: "flex", alignItems: "center", gap: "0.75rem",
          borderBottom: "1px solid rgba(252,165,165,0.3)",
        }}>
          <span>⚠️</span>
          <span style={{ flex: 1 }}>Something went wrong connecting to the AI. Please try again.</span>
          <button onClick={() => setApiError("")} style={{
            background: "none", border: "none", color: "#fca5a5",
            cursor: "pointer", fontFamily: "inherit", fontSize: "1.1rem",
          }}>×</button>
        </div>
      )}
      {stage === "chat" && (
        <CoachingChat
          persona={persona}
          messages={chatMessages}
          input={chatInput}
          loading={chatLoading}
          streaming={streamingText}
          bottomRef={chatBottomRef}
          scores={scores}
          onInput={setChatInput}
          onSend={sendChat}
          onSendDirect={sendChatDirect}
          onPersonaChange={setPersona}
          clinicalMode={clinicalMode}
          onToggleClinical={() => setClinicalMode(c => !c)}
          isMessageCapReached={isMessageCapReached}
          userMessageCount={userMessageCount}
          freeMessageLimit={FREE_MESSAGE_LIMIT}
          paymentVerified={paymentVerified}
          onInitiateCheckout={initiateCheckout}
          onRestart={() => {
            // Save previous chat context so the next session can offer "pick up where we left off"
            if (chatMessages.length > 1) {
              // Keep last 6 messages as context (enough to capture the thread)
              const recentMsgs = chatMessages.slice(-6).map(m => `${m.role}: ${m.content}`).join("\n");
              setPreviousChatContext(recentMsgs);
            }
            // Preserve profile (scores, persona, email, probing) — only reset chat
            setChatMessages([]);
            setUserMessageCount(0);
            setPaymentVerified(false);
            setStageRaw("paywall");
          }}
          onClearData={clearAllData}
        />
      )}

      {toasts.length > 0 && (
        <div style={{
          position: "fixed", top: "1rem", right: "1rem", zIndex: 200,
          display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 380,
        }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              background: t.type === "error" ? "rgba(127, 29, 29, 0.95)" : t.type === "success" ? "rgba(22, 101, 52, 0.95)" : "rgba(50, 50, 50, 0.95)",
              color: t.type === "error" ? "#fca5a5" : t.type === "success" ? "#86efac" : "#e8e0d4",
              padding: "0.75rem 1.25rem", borderRadius: 8, fontSize: "0.85rem",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              display: "flex", alignItems: "center", gap: "0.75rem",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)", animation: "fade-in 0.3s ease",
              border: `1px solid ${t.type === "error" ? "rgba(252,165,165,0.3)" : t.type === "success" ? "rgba(134,239,172,0.3)" : "rgba(255,255,255,0.1)"}`,
            }}>
              <span>{t.type === "error" ? "⚠️" : t.type === "success" ? "✓" : "ℹ"}</span>
              <span style={{ flex: 1 }}>{t.message}</span>
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} style={{
                background: "none", border: "none",
                color: t.type === "error" ? "#fca5a5" : t.type === "success" ? "#86efac" : "#e8e0d4",
                cursor: "pointer", fontSize: "1rem", padding: "0 0.25rem",
              }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LANDING ────────────────────────────────────────────────────────────────

function Landing({ onStart, onLogin, onClearData }) {
  const [visible, setVisible] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);
  return (
    <div style={{ ...styles.page, opacity: visible ? 1 : 0, transition: "opacity 1.2s ease" }}>
      <div style={styles.landingInner}>
        <div style={styles.spiralGlyph}>◎</div>
        <h1 style={styles.landingTitle}>The Healing Spiral</h1>
        <p style={styles.landingSubtitle}>An integrative map of ten dimensions of personal evolution.</p>
        <p style={styles.landingBody}>
          Most healing approaches target symptoms. The Healing Spiral maps the terrain itself —
          the ten recursive dimensions through which genuine transformation moves. Discover where
          you are, what's calling for attention, and what practice best meets you there.
        </p>
        <div style={styles.dimPreview}>
          {DIMENSIONS.slice(0, 5).map(d => (
            <span key={d.id} style={styles.dimChip}>{d.emoji} {d.label}</span>
          ))}
          <span style={styles.dimChip}>+ 5 more</span>
        </div>
        <button style={styles.primaryBtn} onClick={onStart}>
          Begin Your Assessment →
        </button>
        <p style={styles.landingMeta}>Free assessment · AI coaching · 10 minutes</p>
        {!showLogin ? (
          <button onClick={() => setShowLogin(true)} style={{
            background: "none", border: "none", color: "var(--gold)",
            fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "0.9rem",
            cursor: "pointer", marginTop: "1.5rem", opacity: 0.7,
            textDecoration: "underline", textUnderlineOffset: "3px",
          }}>
            Already have a profile? Sign in
          </button>
        ) : (
          <form onSubmit={e => { e.preventDefault(); if (loginEmail.trim()) onLogin(loginEmail.trim()); }} style={{
            marginTop: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", width: "100%", maxWidth: 380,
          }}>
            <input
              type="email"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              placeholder="your@email.com"
              autoFocus
              style={{ ...styles.emailInput, width: "100%" }}
            />
            <button type="submit" style={{ ...styles.primaryBtn, width: "100%", marginTop: "0.25rem", padding: "0.7rem 1.5rem", fontSize: "0.9rem" }}>
              Continue →
            </button>
          </form>
        )}
        {onClearData && (
          <div style={{ marginTop: "2.5rem" }}>
            {!confirmClear ? (
              <button onClick={() => setConfirmClear(true)} style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.25)",
                fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "0.75rem",
                cursor: "pointer", letterSpacing: "0.05em",
              }}>
                Clear saved data
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
                  This will erase your profile, scores, and chat history.
                </span>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={() => { onClearData(); setConfirmClear(false); }} style={{
                    background: "rgba(200,50,50,0.15)", border: "1px solid rgba(200,50,50,0.4)",
                    color: "#e05050", padding: "0.35rem 1rem", borderRadius: 4,
                    fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "0.8rem",
                    cursor: "pointer", letterSpacing: "0.03em",
                  }}>
                    Yes, clear everything
                  </button>
                  <button onClick={() => setConfirmClear(false)} style={{
                    background: "none", border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.4)", padding: "0.35rem 1rem", borderRadius: 4,
                    fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "0.8rem",
                    cursor: "pointer",
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── RETURNING USER ────────────────────────────────────────────────────────

function ReturningUser({ email, scores, onContinueChat, onNewAssessment }) {
  const topDims = scores ? DIMENSIONS.filter(d => scores[d.id] && scores[d.id] <= 3).slice(0, 3) : [];
  return (
    <div style={styles.page}>
      <div style={styles.sectionInner}>
        <div style={styles.spiralGlyph}>◎</div>
        <h2 style={styles.sectionTitle}>Welcome Back</h2>
        <p style={styles.sectionSub}>
          We found your Healing Spiral profile{email ? ` for ${email}` : ""}.
        </p>
        {topDims.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", margin: "1rem 0" }}>
            {topDims.map(d => (
              <span key={d.id} style={styles.dimChip}>{d.emoji} {d.label}</span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", maxWidth: 380, marginTop: "1.5rem" }}>
          <button style={styles.primaryBtn} onClick={onContinueChat}>
            Continue Coaching →
          </button>
          <button onClick={onNewAssessment} style={{
            ...styles.primaryBtn, background: "transparent",
            border: "1px solid var(--gold)", color: "var(--gold)",
          }}>
            Start New Assessment
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PERSONA SELECT ─────────────────────────────────────────────────────────

function PersonaSelect({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  const isMobile = useIsMobile();
  return (
    <div style={styles.page}>
      <div style={styles.sectionInner}>
        <h2 style={styles.sectionTitle}>Choose Your Coach</h2>
        <p style={styles.sectionSub}>Your AI coach will accompany you through the assessment and into deeper work.</p>
        <div style={{ ...styles.personaGrid, gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {PERSONAS.map(p => (
            <button
              key={p.id}
              style={{ ...styles.personaCard, ...(hovered === p.id ? styles.personaCardHover : {}) }}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(p)}
            >
              <div style={styles.personaEmoji}>{p.emoji}</div>
              <div style={styles.personaName}>{p.name}</div>
              <div style={styles.personaDesc}>{p.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── QUESTIONNAIRE ──────────────────────────────────────────────────────────

function Questionnaire({ dimIdx, responses, onChange, onNext, onBack }) {
  const dim = DIMENSIONS[dimIdx];
  const val = responses[dim.id] || 3;
  const touched = responses[dim.id] !== undefined;
  const progress = ((dimIdx + 1) / DIMENSIONS.length) * 100;

  return (
    <div style={styles.page}>
      <div style={styles.sectionInner}>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
        <div style={styles.dimMeta}>{dimIdx + 1} of {DIMENSIONS.length}</div>
        <div style={styles.dimEmoji}>{dim.emoji}</div>
        <h2 style={styles.sectionTitle}>{dim.label}</h2>
        <p style={styles.dimDesc}>{dim.description}</p>
        <div style={styles.questionBlock}>
          {dim.questions.map((q, i) => (
            <p key={i} style={styles.question}>"{q}"</p>
          ))}
        </div>
        <div style={styles.sliderBlock}>
          {!touched && <p style={{ fontSize: "0.78rem", opacity: 0.4, textAlign: "center", marginBottom: "0.5rem", fontStyle: "italic" }}>Move the slider to respond</p>}
          <div style={styles.sliderLabels}>
            <span>Struggling</span><span>Thriving</span>
          </div>
          <input
            type="range" min={1} max={5} step={1}
            value={val}
            onChange={e => onChange(dim.id, parseInt(e.target.value))}
            style={styles.slider}
          />
          <div style={styles.sliderDots}>
            {[1,2,3,4,5].map(n => (
              <div key={n} style={{ ...styles.sliderDot, background: n <= val ? "var(--gold)" : "rgba(255,255,255,0.2)" }} />
            ))}
          </div>
        </div>
        <div style={styles.navRow}>
          {dimIdx > 0 && <button style={styles.secondaryBtn} onClick={onBack}>← Back</button>}
          <button style={styles.primaryBtn} onClick={onNext}>
            {dimIdx < DIMENSIONS.length - 1 ? "Next →" : "Complete Assessment →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PROBING CHAT ───────────────────────────────────────────────────────────

function ProbingChat({ messages, input, loading, streaming, done, bottomRef, onInput, onSend, onDone, currentPersona, onPersonaChange, clinicalMode, onToggleClinical }) {
  const inputRef = useRef(null);
  const handleSend = () => { onSend(); setTimeout(() => inputRef.current?.focus(), 50); };
  return (
    <div style={styles.page}>
      <div style={styles.chatOuter}>
        <div style={styles.chatHeader}>
          <div style={styles.spiralGlyphSmall}>◎</div>
          <span style={styles.chatHeaderTitle}>Intake Deepening</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.7rem", opacity: 0.4, letterSpacing: "0.08em" }}>VOICE</span>
            {PERSONAS.map(p => (
              <button
                key={p.id}
                onClick={() => onPersonaChange(p)}
                title={p.name}
                style={{
                  background: p.id === currentPersona.id ? "rgba(201,162,39,0.2)" : "transparent",
                  border: p.id === currentPersona.id ? "1px solid var(--gold)" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 4, width: 32, height: 32, cursor: "pointer",
                  fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                {p.emoji}
              </button>
            ))}
          </div>
          <LanguageToggle clinical={clinicalMode} onToggle={onToggleClinical} />
        </div>
        <div style={styles.chatBody}>
          {messages.length === 0 && loading && !streaming && (
            <div style={{ padding: "3rem 1.5rem" }}>
              <WorkingIndicator label="Reading your assessment…" />
            </div>
          )}
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role} content={m.content} />
          ))}
          {messages.length > 0 && loading && !streaming && <TypingIndicator />}
          {streaming && <ChatBubble role="assistant" content={streaming} streaming />}
          <div ref={bottomRef} />
        </div>
        {done ? (
          <>
            <NudgeButton label="View My Full Profile" onClick={onDone} />
            <div style={styles.chatInputRow}>
              <button style={{ ...styles.primaryBtn, flex: 1, margin: 0 }} onClick={onDone}>
                View My Full Profile →
              </button>
            </div>
          </>
        ) : (
          <>
            {!loading && messages.length > 0 && aiSignaledTransition(messages[messages.length - 1]?.content) && !done && (
              <WorkingIndicator label="Preparing your profile…" />
            )}
            <div style={styles.chatInputRow}>
              <input
                ref={inputRef}
                style={styles.chatInput}
                value={input}
                onChange={e => onInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                maxLength={2000}
                placeholder="Share what's true for you… (Enter to send)"
                disabled={loading}
                autoFocus
              />
              <button style={styles.sendBtn} onClick={() => handleSend()} disabled={loading || !input.trim()}>→</button>
            </div>
            {!loading && messages.length > 0 && (
              <div style={{ textAlign: "center", paddingBottom: "0.75rem" }}>
                <button onClick={onDone} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.3)", fontSize: "0.78rem",
                  fontFamily: "inherit", letterSpacing: "0.05em",
                  textDecoration: "underline", textUnderlineOffset: 3,
                }}>
                  Skip and view my profile →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── RESULTS ────────────────────────────────────────────────────────────────

function Results({ scores, modalities, onEmailCapture, onDownloadPDF }) {
  const lowestDims = DIMENSIONS.filter(d => scores[d.id] >= 5);
  
  return (
    <div style={styles.page}>
      <div style={styles.sectionInner}>
        <div style={styles.spiralGlyph}>◎</div>
        <h2 style={styles.sectionTitle}>Your Healing Spiral Profile</h2>
        <p style={styles.sectionSub}>Across ten dimensions of personal evolution.</p>

        <div style={styles.dimGrid}>
          {DIMENSIONS.map(d => {
            const tier = scores[d.id];
            const pct = Math.max(10, ((7 - tier) / 6) * 100);
            return (
              <div key={d.id} style={styles.dimRow}>
                <span style={styles.dimRowEmoji}>{d.emoji}</span>
                <div style={styles.dimRowInfo}>
                  <span style={styles.dimRowLabel}>{d.label}</span>
                  <div style={styles.dimBarBg}>
                    <div style={{ ...styles.dimBar, width: `${pct}%`, background: getTierColor(tier) }} />
                  </div>
                </div>
                <span style={{ ...styles.tierBadge, background: getTierColor(tier) }}>{TIER_LABELS[tier]}</span>
              </div>
            );
          })}
        </div>

        {lowestDims.length > 0 && (
          <div style={styles.insightBox}>
            <p style={styles.insightTitle}>Key Growth Edge</p>
            <p style={styles.insightText}>
              Your strongest growth opportunity lies in{" "}
              <strong>{lowestDims.map(d => d.label).slice(0, 2).join(" and ")}</strong>.{" "}
              {lowestDims[0]?.description}
            </p>
          </div>
        )}

        <h3 style={styles.subheading}>Top Recommended Modalities</h3>
        <div style={styles.modList}>
          {modalities.slice(0, 3).map(m => (
            <div key={m.name} style={styles.modChip}>
              <span style={styles.modName}>{m.name}</span>
              <span style={styles.modDims}>{m.dimensions.map(d => DIMENSIONS.find(x => x.id === d)?.emoji).join(" ")}</span>
            </div>
          ))}
        </div>

        <div style={styles.paywallTeaser}>
          <p style={styles.teaserText}>
            📄 Get your full PDF report with all 10 dimensions, modality recommendations, and narrative arc — free.
          </p>
          <button style={styles.primaryBtn} onClick={onEmailCapture}>
            Get My Full Report →
          </button>
          <button
            style={{ ...styles.primaryBtn, background: "transparent", border: "1px solid #c9a227", color: "#c9a227", marginTop: "0.5rem" }}
            onClick={onDownloadPDF}
          >
            Download PDF Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EMAIL CAPTURE ──────────────────────────────────────────────────────────

function EmailCapture({ email, onChange, onSubmit, loading }) {
  return (
    <div style={styles.page}>
      <div style={styles.sectionInner}>
        <div style={styles.spiralGlyph}>◎</div>
        <h2 style={styles.sectionTitle}>Your Full Report</h2>
        <p style={styles.sectionSub}>
          We'll send your complete Healing Spiral profile — all 10 dimensions, top modalities,
          and a personalized narrative of where you are in your evolution.
        </p>
        <div style={styles.emailBlock}>
          <input
            style={styles.emailInput}
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && email.includes("@") && !loading && onSubmit()}
            disabled={loading}
          />
          <button
            style={{ ...styles.primaryBtn, marginTop: 0, opacity: loading ? 0.6 : 1 }}
            onClick={onSubmit}
            disabled={!email.includes("@") || loading}
          >
            {loading ? "Sending..." : "Send My Report →"}
          </button>
        </div>
        <p style={styles.emailMeta}>No spam. You can unsubscribe anytime.</p>
      </div>
    </div>
  );
}

// ── PAYWALL ────────────────────────────────────────────────────────────────

function Paywall({ onUnlock }) {
  return (
    <div style={styles.page}>
      <div style={styles.sectionInner}>
        <div style={styles.spiralGlyph}>◎</div>
        <h2 style={styles.sectionTitle}>Begin the Coaching</h2>
        <p style={styles.sectionSub}>
          Your report is on its way. Now go deeper — into a live AI coaching session
          that holds your full Healing Spiral profile.
        </p>
        <div style={styles.pricingCard}>
          <div style={styles.pricingBadge}>FREE TO START</div>
          <div style={styles.pricingPrice}>20<span style={styles.pricingPer}> free messages</span></div>
          <p style={styles.pricingDesc}>Try the coaching experience free. Unlock unlimited access anytime.</p>
          <ul style={styles.featureList}>
            <li>✦ Full 10-dimension context</li>
            <li>✦ Modality recommendations woven in</li>
            <li>✦ Your chosen coach persona</li>
            <li>✦ 20 messages free, then pay to continue</li>
          </ul>
          <button style={{ ...styles.primaryBtn, width: "100%", marginTop: "1.5rem" }} onClick={onUnlock}>
            Enter the Coaching Session →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── COACHING CHAT ──────────────────────────────────────────────────────────

function CoachingChat({ persona, messages, input, loading, streaming, bottomRef, scores, onInput, onSend, onSendDirect, onPersonaChange, clinicalMode, onToggleClinical, onRestart, onClearData, isMessageCapReached, userMessageCount, freeMessageLimit, paymentVerified, onInitiateCheckout }) {
  const topMods = getTopModalities(scores, 3);
  const chatInputRef = useRef(null);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close sidebar when switching from mobile to desktop
  useEffect(() => { if (!isMobile) setSidebarOpen(false); }, [isMobile]);

  const handleSend = (prefill) => {
    if (prefill) { onSendDirect(prefill); }
    else { onSend(); }
    setTimeout(() => chatInputRef.current?.focus(), 50);
  };

  const sidebarContent = (
    <>
      {isMobile && (
        <div style={{ padding: "0.5rem 0.75rem", textAlign: "right", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => setSidebarOpen(false)} style={{
            background: "none", border: "none", color: "var(--text)",
            fontSize: "1.2rem", cursor: "pointer",
          }}>×</button>
        </div>
      )}
      <div style={styles.sidebarHeader}>
        <div style={styles.spiralGlyphSmall}>◎</div>
        <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>Healing Spiral</span>
      </div>
      <div style={{ ...styles.sidebarPersona, borderBottom: '1px solid var(--border)' }}>
        <div style={styles.sidebarLabel}>COACH VOICE</div>
        {PERSONAS.map(p => (
          <button key={p.id} onClick={() => { onPersonaChange(p); if (isMobile) setSidebarOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              width: "100%", background: p.id === persona.id ? "rgba(201,162,39,0.15)" : "transparent",
              border: p.id === persona.id ? "1px solid var(--gold)" : "1px solid transparent",
              borderRadius: 4, padding: "0.35rem 0.5rem", cursor: "pointer",
              color: "var(--text)", fontFamily: "inherit", marginBottom: "0.25rem", transition: "all 0.15s",
            }}>
            <span style={{ fontSize: "1rem" }}>{p.emoji}</span>
            <span style={{ fontSize: "0.72rem", textAlign: "left", lineHeight: 1.3 }}>{p.name}</span>
          </button>
        ))}
      </div>
      <div style={{ ...styles.sidebarSection, borderBottom: '1px solid var(--border)' }}>
        <div style={styles.sidebarLabel}>LANGUAGE</div>
        <LanguageToggle clinical={clinicalMode} onToggle={onToggleClinical} sidebar />
      </div>
      <div style={styles.sidebarSection}>
        <div style={styles.sidebarLabel}>YOUR PROFILE</div>
        {DIMENSIONS.map(d => {
          const tier = scores[d.id];
          const pct = Math.max(8, ((7 - tier) / 6) * 100);
          return (
            <div key={d.id} style={styles.sidebarDimRow}>
              <span style={{ fontSize: "0.7rem", opacity: 0.7, minWidth: 14 }}>{d.emoji}</span>
              <div style={styles.sidebarBarBg}>
                <div style={{ width: `${pct}%`, height: "100%", background: getTierColor(tier), borderRadius: 2 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={styles.sidebarSection}>
        <div style={styles.sidebarLabel}>TOP MODALITIES</div>
        {topMods.map(m => (
          <div key={m.name} style={styles.sidebarMod}>{m.name}</div>
        ))}
      </div>
      {onClearData && (
        <ClearDataButton onClear={onClearData} />
      )}
    </>
  );

  const restartBtnStyle = {
    marginLeft: "auto", background: "transparent",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4,
    color: "rgba(255,255,255,0.35)", fontSize: "0.65rem",
    letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "0.2rem 0.5rem", cursor: "pointer", fontFamily: "inherit",
  };

  return (
    <div style={{ ...styles.page, flexDirection: isMobile ? "column" : "row", alignItems: "stretch", padding: 0 }}>
      {/* Mobile header */}
      {isMobile && (
        <div style={{
          padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: "0.75rem",
          background: "rgba(0,0,0,0.3)", flexShrink: 0,
        }}>
          <button onClick={() => setSidebarOpen(true)} style={{
            background: "none", border: "1px solid var(--border)", borderRadius: 4,
            color: "var(--text)", padding: "0.3rem 0.5rem", cursor: "pointer", fontSize: "1rem",
          }}>☰</button>
          <div style={styles.spiralGlyphSmall}>◎</div>
          <span style={styles.chatHeaderTitle}>Coaching Session</span>
          <button onClick={onRestart} title="Start over" style={restartBtnStyle}>↺</button>
        </div>
      )}

      {/* Sidebar: fixed overlay on mobile, inline on desktop */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40,
        }} />
      )}
      {(!isMobile || sidebarOpen) && (
        <div style={{
          ...styles.sidebar,
          ...(isMobile ? {
            position: "fixed", top: 0, left: 0, bottom: 0,
            width: 260, zIndex: 50, boxShadow: "4px 0 20px rgba(0,0,0,0.5)",
            background: "var(--bg)",
          } : {}),
        }}>
          {sidebarContent}
        </div>
      )}

      <div style={{ ...styles.chatOuter, height: isMobile ? "calc(100dvh - 50px)" : "100dvh" }}>
        {!isMobile && (
          <div style={styles.chatHeader}>
            <div style={styles.spiralGlyphSmall}>◎</div>
            <span style={styles.chatHeaderTitle}>Coaching Session</span>
            <button onClick={onRestart} title="Start over" style={{ ...restartBtnStyle, fontSize: "0.7rem", padding: "0.25rem 0.6rem" }}>↺ Restart</button>
          </div>
        )}
        <div style={styles.chatBody}>
          {messages.length === 0 && loading && !streaming && (
            <div style={{ padding: "2rem 1.5rem" }}>
              <WorkingIndicator label="Preparing your session…" />
            </div>
          )}
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role} content={m.content} />
          ))}
          {messages.length > 0 && loading && !streaming && <TypingIndicator />}
          {streaming && <ChatBubble role="assistant" content={streaming} streaming />}
          <div ref={bottomRef} />
        </div>
        {!loading && messages.length > 0 && aiSignaledTransition(messages[messages.length - 1]?.content) && (
          <NudgeButton label="I'm ready" onClick={() => handleSend("I'm ready to continue.")} />
        )}
        {!isMessageCapReached && !paymentVerified && userMessageCount > (freeMessageLimit - 6) && userMessageCount < freeMessageLimit && (
          <div style={{ textAlign: "center", padding: "0.25rem", fontSize: "0.7rem", opacity: 0.4, letterSpacing: "0.05em" }}>
            {freeMessageLimit - userMessageCount} free messages remaining
          </div>
        )}
        {(() => {
          if (loading || !messages.length) return null;
          const lastMsg = messages[messages.length - 1];
          if (!lastMsg || lastMsg.role !== "assistant") return null;
          const opts = parseNumberedOptions(lastMsg.content);
          if (!opts) return null;
          return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", padding: "0.5rem 1rem", borderTop: "1px solid var(--border)" }}>
              {opts.map((opt, i) => (
                <button key={i} onClick={() => handleSend(opt)} style={{
                  background: "transparent",
                  borderWidth: "1px", borderStyle: "solid", borderColor: "var(--gold)",
                  color: "var(--gold)", padding: "0.4rem 0.85rem", borderRadius: "999px",
                  fontSize: "0.78rem", fontFamily: "'Cormorant Garamond', Georgia, serif",
                  cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.02em",
                }}
                onMouseEnter={e => { e.target.style.background = "var(--gold)"; e.target.style.color = "#1a1208"; }}
                onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "var(--gold)"; }}
                >
                  {opt}
                </button>
              ))}
            </div>
          );
        })()}
        {isMessageCapReached ? (
          <div style={{
            padding: "1.5rem", textAlign: "center",
            borderTop: "1px solid var(--border)", background: "rgba(201,162,39,0.05)",
          }}>
            <p style={{ fontSize: "0.95rem", marginBottom: "0.75rem", opacity: 0.9 }}>
              You've used your {freeMessageLimit} free messages.
            </p>
            <p style={{ fontSize: "0.85rem", opacity: 0.6, marginBottom: "1rem" }}>
              Unlock unlimited coaching to continue this session.
            </p>
            <button onClick={onInitiateCheckout} style={{ ...styles.primaryBtn, marginTop: 0, width: "100%" }}>
              Unlock Unlimited Coaching →
            </button>
          </div>
        ) : (
          <div style={styles.chatInputRow}>
            <input
              ref={chatInputRef}
              style={styles.chatInput}
              value={input}
              onChange={e => onInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="What's on your mind… (Enter to send)"
              disabled={loading}
              maxLength={2000}
              autoFocus
            />
            <button style={styles.sendBtn} onClick={() => handleSend()} disabled={loading || !input.trim()}>→</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SHARED COMPONENTS ──────────────────────────────────────────────────────

function LanguageToggle({ clinical, onToggle, sidebar }) {
  return (
    <button
      onClick={onToggle}
      title={clinical ? 'Switch to plain language' : 'Switch to clinical language'}
      style={{
        display: 'flex', alignItems: 'center', gap: sidebar ? '0.4rem' : '0.5rem',
        background: 'transparent',
        border: '1px solid ' + (clinical ? 'var(--gold)' : 'rgba(255,255,255,0.15)'),
        borderRadius: 20,
        padding: sidebar ? '0.3rem 0.6rem' : '0.3rem 0.75rem',
        cursor: 'pointer', color: clinical ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
        fontFamily: 'inherit', fontSize: '0.7rem', letterSpacing: '0.08em',
        textTransform: 'uppercase', transition: 'all 0.2s',
        width: sidebar ? '100%' : 'auto',
        justifyContent: sidebar ? 'center' : 'flex-start',
      }}
    >
      <span style={{ fontSize: '0.85rem' }}>{clinical ? '🔬' : '💬'}</span>
      <span>{clinical ? 'Clinical' : 'Plain'}</span>
    </button>
  );
}


function WorkingIndicator({ label = "Working on it…" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.6rem 1rem", animation: "fade-in 0.3s ease",
    }}>
      <div style={{ display: "flex", gap: 3 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 28, height: 3, borderRadius: 2,
            background: "var(--gold)",
            animationName: "pulse-bar",
            animationDuration: "1.4s",
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationDelay: `${i * 0.2}s`,
            transformOrigin: "left center",
          }} />
        ))}
      </div>
      <span style={{ fontSize: "0.8rem", opacity: 0.5, fontStyle: "italic", letterSpacing: "0.03em" }}>
        {label}
      </span>
    </div>
  );
}

function ClearDataButton({ onClear }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div style={{ marginTop: "auto", padding: "1rem 0.75rem", borderTop: "1px solid var(--border)" }}>
      {!confirm ? (
        <button onClick={() => setConfirm(true)} style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.2)",
          fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "0.7rem",
          cursor: "pointer", letterSpacing: "0.05em", width: "100%", textAlign: "center",
        }}>
          Clear all saved data
        </button>
      ) : (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem" }}>
            Erase profile, scores, and chat history?
          </p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            <button onClick={() => { onClear(); setConfirm(false); }} style={{
              background: "rgba(200,50,50,0.12)", border: "1px solid rgba(200,50,50,0.35)",
              color: "#e05050", padding: "0.25rem 0.7rem", borderRadius: 4,
              fontFamily: "inherit", fontSize: "0.7rem", cursor: "pointer",
            }}>
              Clear
            </button>
            <button onClick={() => setConfirm(false)} style={{
              background: "none", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.35)", padding: "0.25rem 0.7rem", borderRadius: 4,
              fontFamily: "inherit", fontSize: "0.7rem", cursor: "pointer",
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NudgeButton({ label, onClick }) {
  return (
    <div style={{ padding: "0 1.5rem 0.75rem", animation: "fade-in 0.4s ease" }}>
      <button
        onClick={onClick}
        style={{
          background: "rgba(201,162,39,0.1)", border: "1px solid var(--gold)",
          borderRadius: 20, padding: "0.45rem 1.25rem",
          color: "var(--gold)", fontSize: "0.85rem", fontFamily: "inherit",
          cursor: "pointer", letterSpacing: "0.02em", transition: "all 0.2s",
        }}
      >
        {label} →
      </button>
    </div>
  );
}

function parseNumberedOptions(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const options = [];
  const optionRegex = /^\d+\.\s+\*{0,2}(.+?)\*{0,2}\s*[—–-]\s*/;
  for (const line of lines) {
    const match = line.match(optionRegex);
    if (match) {
      const label = match[1].replace(/\*+/g, "").trim();
      options.push(label);
    }
  }
  return options.length >= 2 ? options : null;
}

function ChatBubble({ role, content, streaming }) {
  const isUser = role === "user";
  return (
    <div style={{ ...styles.bubble, justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div style={{
        ...styles.bubbleInner,
        background: isUser ? "var(--gold)" : "rgba(255,255,255,0.07)",
        color: isUser ? "#1a1208" : "var(--text)",
        alignSelf: isUser ? "flex-end" : "flex-start",
        borderBottomRightRadius: isUser ? 4 : 18,
        borderBottomLeftRadius: isUser ? 18 : 4,
        opacity: streaming ? 0.9 : 1,
      }}>
        {content}
        {streaming && <span style={{ opacity: 0.5, marginLeft: 4 }}>▌</span>}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ ...styles.bubble, justifyContent: "flex-start" }}>
      <div style={{ ...styles.bubbleInner, background: "rgba(255,255,255,0.07)", padding: "0.75rem 1rem" }}>
        <span style={styles.typingDot} />
        <span style={{ ...styles.typingDot, animationDelay: "0.2s" }} />
        <span style={{ ...styles.typingDot, animationDelay: "0.4s" }} />
      </div>
    </div>
  );
}

// ── UTILS ──────────────────────────────────────────────────────────────────

function getTierColor(tier) {
  const colors = ["", "#c9a227", "#8bc34a", "#29b6f6", "#ab47bc", "#ff7043", "#ef5350", "#b71c1c"];
  return colors[Math.min(tier, 7)] || "#888";
}

// ── STYLES ─────────────────────────────────────────────────────────────────

const styles = {
  root: {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "'Cormorant Garamond', 'Georgia', serif",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    "--bg": "#0e0c0a",
    "--text": "#e8e0d4",
    "--gold": "#c9a227",
    "--gold-dim": "#8a6d18",
    "--border": "rgba(201,162,39,0.2)",
  },
  grain: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
    opacity: 0.4,
  },
  page: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "2rem 1rem", position: "relative", zIndex: 1,
    minHeight: "100vh",
  },
  landingInner: {
    maxWidth: 600, width: "100%", textAlign: "center",
  },
  spiralGlyph: {
    fontSize: "4rem", color: "var(--gold)", lineHeight: 1,
    marginBottom: "1rem", animation: "spin 20s linear infinite",
    display: "inline-block",
  },
  spiralGlyphSmall: {
    fontSize: "1.2rem", color: "var(--gold)",
  },
  landingTitle: {
    fontSize: "clamp(2.5rem, 6vw, 4rem)",
    fontWeight: 300, letterSpacing: "0.05em",
    margin: "0.5rem 0", color: "var(--text)",
    lineHeight: 1.1,
  },
  landingSubtitle: {
    fontSize: "1.1rem", opacity: 0.6, marginBottom: "1.5rem",
    fontStyle: "italic", letterSpacing: "0.02em",
  },
  landingBody: {
    fontSize: "1.05rem", lineHeight: 1.7, opacity: 0.8,
    maxWidth: 520, margin: "0 auto 2rem",
  },
  dimPreview: {
    display: "flex", flexWrap: "wrap", gap: "0.5rem",
    justifyContent: "center", marginBottom: "2.5rem",
  },
  dimChip: {
    fontSize: "0.75rem", padding: "0.3rem 0.75rem",
    border: "1px solid var(--border)", borderRadius: 20,
    opacity: 0.7, letterSpacing: "0.03em",
  },
  landingMeta: {
    fontSize: "0.8rem", opacity: 0.4, marginTop: "1rem",
    letterSpacing: "0.05em", textTransform: "uppercase",
  },
  primaryBtn: {
    background: "var(--gold)", color: "#1a1208",
    border: "none", borderRadius: 4, padding: "0.9rem 2rem",
    fontSize: "1rem", fontFamily: "inherit", fontWeight: 600,
    cursor: "pointer", letterSpacing: "0.02em",
    transition: "all 0.2s", marginTop: "1rem",
    display: "inline-block",
  },
  secondaryBtn: {
    background: "transparent", color: "var(--text)",
    border: "1px solid var(--border)", borderRadius: 4,
    padding: "0.8rem 1.5rem", fontSize: "1rem",
    fontFamily: "inherit", cursor: "pointer",
  },
  sectionInner: {
    maxWidth: 680, width: "100%", textAlign: "center",
  },
  sectionTitle: {
    fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 300,
    letterSpacing: "0.04em", margin: "0.5rem 0 0.75rem",
  },
  sectionSub: {
    fontSize: "1.05rem", opacity: 0.6, marginBottom: "2rem",
    fontStyle: "italic",
  },
  personaGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1rem", marginTop: "1rem",
  },
  personaCard: {
    background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "1.5rem 1rem", cursor: "pointer",
    transition: "all 0.2s", textAlign: "center", fontFamily: "inherit",
    color: "var(--text)",
  },
  personaCardHover: {
    background: "rgba(201,162,39,0.1)", border: "1px solid var(--gold)",
    transform: "translateY(-2px)",
  },
  personaEmoji: { fontSize: "2rem", marginBottom: "0.5rem" },
  personaName: { fontSize: "1rem", fontWeight: 600, marginBottom: "0.4rem" },
  personaDesc: { fontSize: "0.85rem", opacity: 0.6, fontStyle: "italic" },
  progressBar: {
    height: 3, background: "rgba(255,255,255,0.1)",
    borderRadius: 2, marginBottom: "2rem", overflow: "hidden",
  },
  progressFill: {
    height: "100%", background: "var(--gold)",
    borderRadius: 2, transition: "width 0.4s ease",
  },
  dimMeta: { fontSize: "0.8rem", opacity: 0.4, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" },
  dimEmoji: { fontSize: "2.5rem", marginBottom: "0.5rem" },
  dimDesc: { fontSize: "0.95rem", opacity: 0.6, fontStyle: "italic", marginBottom: "1.5rem" },
  questionBlock: { marginBottom: "2rem" },
  question: { fontSize: "1.05rem", opacity: 0.8, fontStyle: "italic", marginBottom: "0.5rem" },
  sliderBlock: { marginBottom: "2rem" },
  sliderLabels: {
    display: "flex", justifyContent: "space-between",
    fontSize: "0.8rem", opacity: 0.5, marginBottom: "0.5rem",
  },
  slider: { width: "100%", accentColor: "var(--gold)", cursor: "pointer" },
  sliderDots: { display: "flex", justifyContent: "space-between", marginTop: "0.5rem", padding: "0 2px" },
  sliderDot: { width: 10, height: 10, borderRadius: "50%", transition: "background 0.2s" },
  navRow: { display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" },
  dimGrid: { display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "2rem", textAlign: "left" },
  dimRow: { display: "flex", alignItems: "center", gap: "0.75rem" },
  dimRowEmoji: { fontSize: "1.1rem", width: 24, textAlign: "center", flexShrink: 0 },
  dimRowInfo: { flex: 1 },
  dimRowLabel: { fontSize: "0.8rem", opacity: 0.7, display: "block", marginBottom: "3px" },
  dimBarBg: { height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" },
  dimBar: { height: "100%", borderRadius: 3, transition: "width 0.6s ease" },
  tierBadge: {
    fontSize: "0.65rem", padding: "2px 8px", borderRadius: 10,
    fontWeight: 700, letterSpacing: "0.05em", color: "rgba(0,0,0,0.8)",
    flexShrink: 0, textTransform: "uppercase",
  },
  insightBox: {
    background: "rgba(201,162,39,0.08)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "1.25rem", marginBottom: "2rem", textAlign: "left",
  },
  insightTitle: { fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--gold)", marginBottom: "0.5rem" },
  insightText: { fontSize: "0.95rem", lineHeight: 1.6, opacity: 0.85 },
  subheading: { fontSize: "1.2rem", fontWeight: 400, letterSpacing: "0.05em", marginBottom: "1rem" },
  modList: { display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", marginBottom: "2rem" },
  modChip: {
    background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
    borderRadius: 6, padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem",
  },
  modName: { fontSize: "0.9rem" },
  modDims: { fontSize: "0.8rem", opacity: 0.6 },
  paywallTeaser: {
    background: "rgba(201,162,39,0.06)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "1.5rem", marginTop: "1rem",
  },
  teaserText: { fontSize: "1rem", lineHeight: 1.6, marginBottom: "1rem" },
  emailBlock: { display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 400, margin: "0 auto" },
  emailInput: {
    background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
    borderRadius: 4, padding: "0.85rem 1rem", fontSize: "1rem",
    color: "var(--text)", fontFamily: "inherit", outline: "none",
    width: "100%", boxSizing: "border-box",
  },
  emailMeta: { fontSize: "0.8rem", opacity: 0.4, marginTop: "0.75rem" },
  pricingCard: {
    background: "rgba(255,255,255,0.04)", border: "1px solid var(--gold)",
    borderRadius: 12, padding: "2rem", maxWidth: 400, margin: "0 auto", textAlign: "center",
  },
  pricingBadge: {
    fontSize: "0.7rem", letterSpacing: "0.15em", color: "var(--gold)",
    textTransform: "uppercase", marginBottom: "1rem",
  },
  pricingPrice: { fontSize: "3rem", fontWeight: 300, marginBottom: "0.5rem" },
  pricingPer: { fontSize: "1rem", opacity: 0.6 },
  pricingDesc: { fontSize: "0.9rem", opacity: 0.6, marginBottom: "1.5rem" },
  featureList: {
    listStyle: "none", padding: 0, margin: 0, textAlign: "left",
    display: "flex", flexDirection: "column", gap: "0.5rem",
  },
  chatOuter: {
    flex: 1, display: "flex", flexDirection: "column",
    maxHeight: "100dvh", height: "100dvh", position: "relative", zIndex: 1,
  },
  chatHeader: {
    padding: "1rem 1.5rem", borderBottom: "1px solid var(--border)",
    display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0,
  },
  chatHeaderTitle: { fontSize: "1rem", letterSpacing: "0.05em", opacity: 0.8 },
  chatBody: {
    flex: 1, overflowY: "auto", padding: "1.5rem",
    display: "flex", flexDirection: "column", gap: "1rem",
  },
  chatInputRow: {
    padding: "1rem 1.5rem", borderTop: "1px solid var(--border)",
    display: "flex", gap: "0.75rem", alignItems: "center", flexShrink: 0,
  },
  chatInput: {
    flex: 1, background: "rgba(255,255,255,0.06)",
    border: "1px solid var(--border)", borderRadius: 4,
    padding: "0.75rem 1rem", fontSize: "1rem", color: "var(--text)",
    fontFamily: "inherit", outline: "none",
  },
  sendBtn: {
    background: "var(--gold)", color: "#1a1208", border: "none",
    borderRadius: 4, width: 44, height: 44, fontSize: "1.1rem",
    cursor: "pointer", fontWeight: 700, flexShrink: 0,
  },
  bubble: { display: "flex", width: "100%" },
  bubbleInner: {
    maxWidth: "78%", padding: "0.75rem 1rem",
    borderRadius: 18, lineHeight: 1.65, fontSize: "0.97rem",
    whiteSpace: "pre-wrap",
  },
  typingDot: {
    display: "inline-block", width: 7, height: 7,
    borderRadius: "50%", background: "rgba(255,255,255,0.4)",
    margin: "0 2px", animation: "bounce 1.2s ease infinite",
  },
  sidebar: {
    width: 220, flexShrink: 0, borderRight: "1px solid var(--border)",
    display: "flex", flexDirection: "column", overflowY: "auto",
    background: "rgba(0,0,0,0.2)",
  },
  sidebarHeader: {
    padding: "1rem", borderBottom: "1px solid var(--border)",
    display: "flex", alignItems: "center", gap: "0.5rem",
  },
  sidebarPersona: {
    padding: "1rem", borderBottom: "1px solid var(--border)",
    display: "flex", alignItems: "center", gap: "0.5rem",
  },
  sidebarSection: { padding: "1rem" },
  sidebarLabel: {
    fontSize: "0.65rem", letterSpacing: "0.12em", opacity: 0.4,
    textTransform: "uppercase", marginBottom: "0.75rem",
  },
  sidebarDimRow: {
    display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.35rem",
  },
  sidebarBarBg: {
    flex: 1, height: 4, background: "rgba(255,255,255,0.08)",
    borderRadius: 2, overflow: "hidden",
  },
  sidebarMod: {
    fontSize: "0.75rem", opacity: 0.7, marginBottom: "0.4rem",
    paddingLeft: "0.5rem", borderLeft: "2px solid var(--gold-dim)",
  },
};

// Inject keyframes
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
    @keyframes pulse-bar { 0%, 100% { opacity: 0.3; transform: scaleX(0.6); } 50% { opacity: 1; transform: scaleX(1); } }
    @keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0e0c0a; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.3); border-radius: 2px; }
    input[type=range] { -webkit-appearance: none; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.15); }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--gold, #c9a227); cursor: pointer; }
    button:hover { filter: brightness(1.1); }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
  `;
  document.head.appendChild(style);
}
