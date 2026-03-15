import { useState, useEffect, useRef, useCallback, useMemo, forwardRef } from "react";
import { jsPDF } from "jspdf";
import { applyPlugin } from "jspdf-autotable";
applyPlugin(jsPDF);
import { MODS, MOD_CATEGORIES } from "./modalities.js";

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
  { id: "mystic", name: "The Mystic Mirror", emoji: "🪞",
    desc: "Poetic, paradoxical, speaks to the soul beneath the story",
    systemPrompt: `You are The Mystic Mirror — a poetic, contemplative healing coach who works through the Healing Spiral framework with metaphor, paradox, and deep reflection. You speak to the soul beneath the story. You use imagery and felt-sense language. You are comfortable with silence, mystery, and not-knowing. You reflect back what the person can't yet see about themselves. You draw from contemplative and wisdom traditions without being preachy or appropriative. You work especially well with the orthogonal dimensions — Shadow Integration, Nondual View, and Energetic Reorganization — but can hold the entire Spiral. You trust that insight often arrives sideways, through a crack in the expected.` },
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

function buildModalityContext(userModalities, userModalitiesOther) {
  if ((!userModalities || userModalities.length === 0) && !userModalitiesOther?.trim()) return "";
  const namedMods = userModalities.map(k => MODS[k]).filter(Boolean);
  const all = [...namedMods];
  if (userModalitiesOther?.trim()) all.push(userModalitiesOther.trim());
  if (all.length === 0) return "";
  return `\n\nMODALITY FAMILIARITY: The user has experience with these healing modalities/frameworks: ${all.join(", ")}. When relevant, use language, concepts, and terminology from these frameworks. Reference specific techniques or principles from modalities they know. This helps the coaching feel personalized and meets them where they are.`;
}

function buildUserContextNote(userContext) {
  if (!userContext?.trim()) return "";
  return `\n\nADDITIONAL CONTEXT FROM USER: After reviewing their profile, the user added this note: "${userContext.trim()}". Keep this in mind as important context for your coaching.`;
}

const TIER_LABELS = ["", "Exemplary", "Strong", "Moderate", "Developing", "Emerging", "Minimal", "Harmful"];

const BOOKING_URL = "https://www.eliwhipple.com/coaching";

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

  const hdrs = { "Content-Type": "application/json" };
  const token = localStorage.getItem('hs_auth_token');
  if (token) hdrs['Authorization'] = `Bearer ${token}`;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: hdrs,
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
  // stages: landing | persona | assessment_choice | modality_profile | questionnaire | confirm_assessment | socratic | probing | profile_review | results | email_capture | paywall | chat
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
  const [chatSummary, setChatSummary] = usePersisted("chatSummary", "");
  const [previousChatContext, setPreviousChatContext] = usePersisted("previousChatContext", null);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [apiError, setApiError] = useState("");
  const [toasts, setToasts] = useState([]);
  const [emailSending, setEmailSending] = useState(false);
  const [userMessageCount, setUserMessageCount] = usePersisted("userMessageCount", 0);
  const [paymentVerified, setPaymentVerified] = usePersisted("paymentVerified", false);
  const [socraticMessages, setSocraticMessages] = usePersisted("socraticMessages", []);
  const [socraticInput, setSocraticInput] = useState("");
  const [socraticLoading, setSocraticLoading] = useState(false);
  const [userModalities, setUserModalities] = usePersisted("userModalities", []);
  const [userModalitiesOther, setUserModalitiesOther] = usePersisted("userModalitiesOther", "");
  const [assessmentMethod, setAssessmentMethod] = usePersisted("assessmentMethod", null);
  const [scoreRationale, setScoreRationale] = usePersisted("scoreRationale", null);
  const [userContext, setUserContext] = usePersisted("userContext", "");
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalComposing, setJournalComposing] = useState(false);
  const [journalMood, setJournalMood] = useState(null);
  const [journalDimension, setJournalDimension] = useState(null);
  const [journalText, setJournalText] = useState("");
  const [journalPanelOpen, setJournalPanelOpen] = useState(false);
  const [journalLoading, setJournalLoading] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState({ google: false, dropbox: false });
  const [syncingService, setSyncingService] = useState(null);
  const chatBottomRef = useRef(null);
  const probingBottomRef = useRef(null);
  const socraticBottomRef = useRef(null);

  // ── AUTH STATE ──
  const [authToken, setAuthToken] = useState(() => {
    try { return localStorage.getItem('hs_auth_token') || null; } catch { return null; }
  });
  const [authUser, setAuthUser] = useState(null);
  const [authSubscription, setAuthSubscription] = useState(null);

  const authHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  }, [authToken]);

  const saveAuthToken = useCallback((token) => {
    setAuthToken(token);
    if (token) localStorage.setItem('hs_auth_token', token);
    else localStorage.removeItem('hs_auth_token');
  }, []);

  // Validate token on mount
  useEffect(() => {
    if (!authToken) return;
    fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${authToken}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setAuthUser(data.user);
        setAuthSubscription(data.subscription);
        if (data.paymentVerified) setPaymentVerified(true);
        if (data.messageCount) setUserMessageCount(data.messageCount);
      })
      .catch(() => { saveAuthToken(null); setAuthUser(null); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch journal entries when authenticated
  const fetchJournalEntries = useCallback(() => {
    if (!authToken) return;
    fetch('/api/journal', { headers: { 'Authorization': `Bearer ${authToken}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setJournalEntries(data.entries || []))
      .catch(() => {});
  }, [authToken]);

  useEffect(() => { fetchJournalEntries(); }, [fetchJournalEntries]);

  // Fetch cloud sync status
  useEffect(() => {
    if (!authToken) return;
    fetch('/api/cloud-sync/status', { headers: { 'Authorization': `Bearer ${authToken}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setCloudSyncStatus(data))
      .catch(() => {});
  }, [authToken]);

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data === 'google-drive-connected' || e.data === 'dropbox-connected') {
        fetch('/api/cloud-sync/status', { headers: { 'Authorization': `Bearer ${authToken}` } })
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(data => setCloudSyncStatus(data))
          .catch(() => {});
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [authToken]);

  const saveJournalEntry = useCallback(async (content, { prompt, dimension, mood, source } = {}) => {
    if (!authToken || !content?.trim()) return null;
    try {
      const resp = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), prompt, dimension, mood, source: source || 'chat' }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data.entry) setJournalEntries(prev => [data.entry, ...prev]);
      return data.entry;
    } catch { return null; }
  }, [authToken]);

  const requestReflection = useCallback(async (entryId) => {
    if (!authToken) return null;
    try {
      const resp = await fetch(`/api/journal/${entryId}/reflect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      });
      const data = await resp.json();
      if (data.requiresSubscription) return { error: 'subscription_required' };
      if (data.reflection) {
        setJournalEntries(prev => prev.map(e => e.id === entryId ? { ...e, aiReflection: data.reflection } : e));
        return { reflection: data.reflection };
      }
      return null;
    } catch { return null; }
  }, [authToken]);

  const syncToCloud = useCallback(async (service) => {
    if (!authToken) return;
    setSyncingService(service);
    try {
      const resp = await fetch(`/api/cloud-sync/${service}/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      return { success: true, entries: data.entries };
    } catch (err) {
      return { error: err.message };
    } finally {
      setSyncingService(null);
    }
  }, [authToken]);

  // Analytics helper (fire-and-forget)
  const trackEvent = useCallback((event_type, metadata = {}) => {
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ event_type, metadata }),
    }).catch(() => {});
  }, [authHeaders]);

  // Global error tracking
  useEffect(() => {
    const handleError = (event) => {
      trackEvent('client_error', { message: event.message, filename: event.filename, lineno: event.lineno });
    };
    const handleRejection = (event) => {
      trackEvent('client_error', { message: event.reason?.message || String(event.reason), type: 'unhandledrejection' });
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [trackEvent]);

  // Session sync (debounced, for authenticated users)
  const syncTimerRef = useRef(null);
  useEffect(() => {
    if (!authToken || !scores) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      fetch('/api/sessions/current', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          scores, persona: persona?.id, clinicalMode,
          chatMessages: chatMessages.slice(-50), // Keep last 50 messages
          chatSummary, messageCount: userMessageCount,
          assessmentMethod, sliderResponses, scoreRationale,
          userModalities, userModalitiesOther: userModalitiesOther || null,
          userContext: userContext || null,
          probingMessages: probingMessages.slice(-50),
          socraticMessages: socraticMessages.slice(-50),
        }),
      }).catch(() => {});
    }, 5000);
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [authToken, scores, chatMessages, userMessageCount, assessmentMethod, sliderResponses, scoreRationale, userModalities, probingMessages, socraticMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  const FREE_MESSAGE_LIMIT = 20;
  const SUMMARIZE_THRESHOLD = 24;
  const KEEP_RECENT = 8;
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

  useEffect(() => {
    socraticBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [socraticMessages]);

  // Summarize older messages and trim the history to keep context manageable
  const summarizeAndTrim = useCallback(async (messages) => {
    const toSummarize = messages.slice(0, messages.length - KEEP_RECENT);
    const recent = messages.slice(-KEEP_RECENT);

    const summaryInput = toSummarize.map(m => `${m.role}: ${m.content}`).join("\n\n");

    const prompt = chatSummary
      ? `Here is the existing summary of earlier conversation:\n${chatSummary}\n\nNow summarize this additional conversation, integrating it with the existing summary. Capture key themes, patterns, insights, breakthroughs, and where the conversation was heading. Write 3-5 sentences max. Use second person ("you").\n\n${summaryInput}`
      : `Summarize this coaching conversation concisely. Capture key themes, patterns the person identified, insights or breakthroughs, and where the conversation was heading. Write 3-5 sentences max. Use second person ("you").\n\n${summaryInput}`;

    try {
      const summary = await callClaude(
        [{ role: "user", content: prompt }],
        "You are a concise summarizer. Output only the summary, nothing else.",
        null
      );
      setChatSummary(summary);
      setChatMessages(recent);
      return recent;
    } catch {
      // If summarization fails, continue with full history
      return messages;
    }
  }, [chatSummary]);

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

Your job: Ask ONE insightful, open-ended question that probes the area where they scored lowest. Make it personal, specific, and inviting. Do not explain the framework. Just ask the question warmly. Keep it to 2-3 sentences max.${buildModalityContext(userModalities, userModalitiesOther)}`;

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
  }, [persona, clinicalMode, userModalities, userModalitiesOther]);

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
  : `Ask ONE focused follow-up question. Be brief. Do not wrap up yet.`}${buildModalityContext(userModalities, userModalitiesOther)}`;

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

  const socraticSystemPrompt = `${getSystemPrompt(persona, clinicalMode)}

You are conducting an indirect assessment of someone's position across 10 dimensions of the Healing Spiral framework. Do NOT ask them to rate themselves. Instead, ask them questions that help understand where they stand on the different dimensions of contact.

IMPORTANT FRAMING: Early in the conversation, gently communicate that this assessment reflects how they are showing up RIGHT NOW — it's a snapshot, not a fixed diagnosis. People are dynamic, and scores will shift as they grow. This isn't about labeling them — it's about seeing where they are so they can move from here. Use your own words, woven naturally into the conversation.

From their answers, you will privately assess where they fall on each dimension (1=Exemplary, 2=Strong, 3=Moderate, 4=Developing, 5=Emerging, 6=Minimal, 7=Harmful).

The 10 dimensions are:
1. Relational Field (relational_field) — The quality of safe, attuned connection
2. Capacity Building (capacity_building) — The nervous system's window of tolerance
3. Physiological Completion (physiological_completion) — Completing incomplete survival responses
4. Affect Metabolization (affect_metabolization) — Digesting emotions fully
5. Differentiation (differentiation) — Knowing where you end and others begin
6. Implicit Model Updating (implicit_model_updating) — Revising deep unconscious beliefs
7. Identity Reorganization (identity_reorganization) — Letting old self-structures dissolve
8. Energetic Reorganization (energetic_reorganization) — Movement of life-force through blockages
9. Shadow Integration (shadow_integration) — Reclaiming disowned aspects
10. Nondual View (nondual_view) — Recognizing awareness itself as ground

Make sure to ask about what modalities or practices the person is actually engaging in — what have they been doing in the last week and month, what are their daily practices (meditation, therapy, bodywork, journaling, movement, breathwork, etc.), and what healing or growth work they're actively involved in. This grounds the assessment in real behavior, not just self-perception.

Ask 6-10 questions total. Each question should naturally reveal information about multiple dimensions. If the user hasn't given you enough information to make a judgement about a particular dimension, inquire about it. After you have enough information (at least 6 user exchanges), end your final message with this exact format on its own line:
[SCORES:{"relational_field":N,"capacity_building":N,"physiological_completion":N,"affect_metabolization":N,"differentiation":N,"implicit_model_updating":N,"identity_reorganization":N,"energetic_reorganization":N,"shadow_integration":N,"nondual_view":N}]

Immediately after the SCORES token, on the next line, include a RATIONALE token with a brief 1-2 sentence explanation for each dimension score — what you observed in the conversation that led to that rating:
[RATIONALE:{"relational_field":"explanation","capacity_building":"explanation","physiological_completion":"explanation","affect_metabolization":"explanation","differentiation":"explanation","implicit_model_updating":"explanation","identity_reorganization":"explanation","energetic_reorganization":"explanation","shadow_integration":"explanation","nondual_view":"explanation"}]

Do NOT show these tokens to the user or explain them. Just include them naturally at the very end of your final reflective message. Before the tokens, write a warm 2-3 sentence summary of what you've heard and noticed.${buildModalityContext(userModalities, userModalitiesOther)}`;

  const startSocratic = useCallback(async () => {
    setStage("socratic");
    setSocraticLoading(true);
    setSocraticMessages([]);

    const msgs = [{ role: "user", content: "I'd like you to assess where I stand across the different dimensions through conversation, rather than a questionnaire." }];
    let aiText = "";
    try {
      aiText = await callClaude(msgs, socraticSystemPrompt, (partial) => {
        setStreamingText(partial);
      });
    } catch (e) {
      aiText = "I'd love to get a sense of where you are across these different dimensions. Let me start with a few questions — how would you describe the quality of your closest relationships right now? Do you feel safe and seen in them?";
    }
    setStreamingText("");
    setSocraticMessages([{ role: "assistant", content: aiText }]);
    setSocraticLoading(false);
  }, [persona, clinicalMode, userModalities, userModalitiesOther]);

  const sendSocraticMessage = async () => {
    if (!socraticInput.trim() || socraticLoading) return;
    const userMsg = { role: "user", content: socraticInput };
    const newMsgs = [...socraticMessages, userMsg];
    setSocraticMessages(newMsgs);
    setSocraticInput("");
    setSocraticLoading(true);

    const apiMsgs = newMsgs.map(m => ({ role: m.role, content: m.content }));
    let aiText = "";
    try {
      aiText = await callClaude(apiMsgs, socraticSystemPrompt, (partial) => setStreamingText(partial));
    } catch (e) {
      aiText = "Thank you for sharing that. Let me ask about another area — when strong emotions come up, what tends to happen? Do they move through you, or do they tend to get stuck?";
    }

    // Check for [SCORES:{...}] and [RATIONALE:{...}] patterns
    const scoresMatch = aiText.match(/\[SCORES:\s*(\{[^}]+\})\s*\]/);
    const rationaleMatch = aiText.match(/\[RATIONALE:\s*(\{[\s\S]*?\})\s*\]/);
    const cleanText = aiText.replace(/\[SCORES:\s*\{[^}]+\}\s*\]/g, "").replace(/\[RATIONALE:\s*\{[\s\S]*?\}\s*\]/g, "").trim();

    setStreamingText("");
    const updated = [...newMsgs, { role: "assistant", content: cleanText }];
    setSocraticMessages(updated);
    setSocraticLoading(false);

    const handleValidScores = (parsedScores, rationaleObj, conversationMsgs) => {
      setScores(parsedScores);
      if (rationaleObj) setScoreRationale(rationaleObj);
      setProbingMessages(conversationMsgs);
      setProbingDone(true);
      setTimeout(() => setStage("profile_review"), 1500);
    };

    if (scoresMatch) {
      try {
        const parsed = JSON.parse(scoresMatch[1]);
        let rationale = null;
        if (rationaleMatch) {
          try { rationale = JSON.parse(rationaleMatch[1]); } catch (e) { console.warn("Could not parse rationale:", e); }
        }
        // Validate all 10 dimensions present with values 1-7
        const validDimensions = DIMENSIONS.filter(d => {
          const v = parsed[d.id];
          return typeof v === "number" && v >= 1 && v <= 7;
        });
        if (validDimensions.length === DIMENSIONS.length) {
          handleValidScores(parsed, rationale, updated);
        } else {
          // Retry: ask AI to provide complete scores
          const missing = DIMENSIONS.filter(d => {
            const v = parsed[d.id];
            return !(typeof v === "number" && v >= 1 && v <= 7);
          }).map(d => d.id);
          console.warn("Incomplete scores, missing:", missing);
          setSocraticLoading(true);
          const retryMsgs = [...updated, { role: "user", content: `[SYSTEM: Your score output was incomplete — missing or invalid values for: ${missing.join(", ")}. Please provide the complete SCORES and RATIONALE tokens with all 10 dimensions. Do not show them to me, just append them to a brief closing remark.]` }];
          try {
            let retryText = await callClaude(retryMsgs, socraticSystemPrompt, (partial) => setStreamingText(partial));
            const retryScoresMatch = retryText.match(/\[SCORES:\s*(\{[^}]+\})\s*\]/);
            const retryRationaleMatch = retryText.match(/\[RATIONALE:\s*(\{[\s\S]*?\})\s*\]/);
            setStreamingText("");
            if (retryScoresMatch) {
              const retryParsed = JSON.parse(retryScoresMatch[1]);
              const retryValid = DIMENSIONS.every(d => {
                const v = retryParsed[d.id];
                return typeof v === "number" && v >= 1 && v <= 7;
              });
              if (retryValid) {
                let retryRationale = null;
                if (retryRationaleMatch) { try { retryRationale = JSON.parse(retryRationaleMatch[1]); } catch(e) {} }
                const retryClean = retryText.replace(/\[SCORES:\s*\{[^}]+\}\s*\]/g, "").replace(/\[RATIONALE:\s*\{[\s\S]*?\}\s*\]/g, "").trim();
                const finalMsgs = [...updated, { role: "assistant", content: retryClean }];
                setSocraticMessages(finalMsgs);
                handleValidScores(retryParsed, retryRationale || rationale, finalMsgs);
              }
            }
          } catch (e) {
            console.error("Score retry failed:", e);
          }
          setSocraticLoading(false);
        }
      } catch (e) {
        console.error("Failed to parse socratic scores:", e);
      }
    }
  };

  // Generate rationale for questionnaire-path scores (called when entering profile_review without existing rationale)
  const generateRationale = useCallback(async () => {
    if (!scores || scoreRationale) return;
    const scoresDesc = DIMENSIONS.map(d => `${d.label}: tier ${scores[d.id]} (${TIER_LABELS[scores[d.id]]})`).join(", ");
    const conversationContext = probingMessages.length > 0
      ? `\n\nConversation during intake:\n${probingMessages.map(m => `${m.role}: ${m.content}`).join("\n")}`
      : "";
    const prompt = `${getSystemPrompt(persona, clinicalMode)}

You are reviewing a Healing Spiral assessment. The person's scores are: ${scoresDesc}.${conversationContext}

For each dimension, write a brief 1-2 sentence observation explaining what this score level typically reflects. If conversation context is available, reference specific things the person shared. Be warm and insightful.

Respond ONLY with a JSON object mapping dimension IDs to explanation strings, like:
{"relational_field":"Your explanation here","capacity_building":"Your explanation here",...}

Include all 10 dimensions. Do NOT wrap in markdown code blocks.`;

    try {
      const aiText = await callClaude([{ role: "user", content: prompt }], prompt);
      // Parse the JSON from the response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.relational_field) {
          setScoreRationale(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not generate rationale:", e);
    }
  }, [scores, scoreRationale, probingMessages, persona, clinicalMode]);

  const initiateCheckout = useCallback(async (plan = "subscription") => {
    trackEvent('checkout_initiated', { plan });
    try {
      const resp = await fetch("/api/checkout", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email, returnUrl: window.location.origin, plan }),
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

  const startChat = useCallback(async (force = false) => {
    setStage("chat");
    // If session already has chat messages (restored), don't re-fire the opening
    if (!force && chatMessages.length > 0) {
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
Personalize each option using what they shared in the intake. Keep the tone warm but efficient — the user has limited messages, so help them choose a focus quickly rather than diving straight into an exercise.${buildModalityContext(userModalities, userModalitiesOther)}${buildUserContextNote(userContext)}`;

    let aiText = "";
    try {
      aiText = await callClaude([{ role: "user", content: "I'm ready to begin." }], systemPrompt, (p) => setStreamingText(p));
    } catch (e) {
      aiText = "⚠️ Could not connect: " + e.message;
    }
    setStreamingText("");
    setChatMessages([{ role: "assistant", content: aiText }]);
    setChatLoading(false);
  }, [persona, scores, probingMessages, clinicalMode, chatMessages.length, previousChatContext, userModalities, userModalitiesOther, userContext]);

  const buildChatSystemPrompt = (topMods, continuationNote) => `${getSystemPrompt(persona, clinicalMode)}

You are in an ongoing coaching session. The person has completed a Healing Spiral assessment. Key context: dimension scores: ${scores ? DIMENSIONS.map(d => d.label + ": tier " + scores[d.id]).join(", ") : "not available"}. Top modalities: ${topMods}. Continue the conversation — do NOT re-introduce yourself or re-ask opening questions. ${continuationNote}${chatSummary ? `

CONVERSATION HISTORY SUMMARY (earlier in this session):
${chatSummary}` : ""}${previousChatContext ? `

CONTEXT FROM PREVIOUS SESSION (if they chose to pick up where they left off, use this):
${previousChatContext}` : ""}

IMPORTANT: Follow the person's lead. If they want to explore the Healing Spiral framework or understand their dimensions, teach and explain — don't redirect into exercises. If they want to work with emotions or body sensations, go there. If they want to explore patterns or what's stuck, do that. Match the mode they're asking for.

JOURNALING: Occasionally (every 5-8 exchanges, when it feels natural), invite the person to journal. When you want to suggest a journal prompt, include this exact marker format in your message:

[JOURNAL_PROMPT: Your prompt text here]

For example: "This feels like an important realization. [JOURNAL_PROMPT: What are you noticing right now about the pattern you just described? Write freely — let whatever wants to come through, come through.]"

Use journal prompts when:
- The person has had an insight or emotional shift
- They're processing something that would benefit from reflective writing
- A theme has emerged that deserves deeper personal exploration
- The conversation reaches a natural pause point

Don't overuse them — they should feel like an organic invitation, not a homework assignment.

THE HEALING SPIRAL FRAMEWORK (for when the person asks about it):
- The Relational Field is the ground — safe attuned connection that makes all other healing possible
- Six dimensions form a reciprocal cascade: Capacity Building → Physiological Completion → Affect Metabolization → Differentiation → Implicit Model Updating → Identity Reorganization
- Three orthogonal dimensions operate independently: Energetic Reorganization, Shadow Integration, Nondual View
- Tiers run from 1 (Exemplary) to 7 (Harmful). Lower numbers = more developed.${buildModalityContext(userModalities, userModalitiesOther)}${buildUserContextNote(userContext)}`;

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
    const systemPrompt = buildChatSystemPrompt(topMods, "Pick up exactly where the conversation left off.");
    // latestMsgs may be undefined if setChatMessages batched — fall back to snapshot
    setTimeout(async () => {
      let msgs = latestMsgs || [...chatMessages, userMsg];
      // Summarize and trim if conversation is getting long
      if (msgs.length > SUMMARIZE_THRESHOLD) {
        msgs = await summarizeAndTrim(msgs);
      }
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
    let newMsgs = [...chatMessages, userMsg];
    setChatMessages(newMsgs);
    setChatInput("");
    setChatLoading(true);

    // Summarize and trim if conversation is getting long
    if (newMsgs.length > SUMMARIZE_THRESHOLD) {
      newMsgs = await summarizeAndTrim(newMsgs);
    }

    const topMods = getTopModalities(scores, 3).map(m => m.name).join(", ");
    const systemPrompt = buildChatSystemPrompt(topMods, "Stay present with what they just said.");

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
    // Auto-download a local export before clearing so data is never lost
    try { downloadLocalExport(); } catch {}
    // Archive current session server-side before clearing (for authenticated users)
    if (authToken) {
      // First, do a final sync to make sure all data is saved
      if (scores) {
        fetch('/api/sessions/current', {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            scores, persona: persona?.id, clinicalMode,
            chatMessages: chatMessages.slice(-50),
            chatSummary, messageCount: userMessageCount,
            assessmentMethod, sliderResponses, scoreRationale,
            userModalities, userModalitiesOther: userModalitiesOther || null,
            userContext: userContext || null,
            probingMessages: probingMessages.slice(-50),
            socraticMessages: socraticMessages.slice(-50),
          }),
        })
          .then(() => fetch('/api/sessions/archive', {
            method: 'POST',
            headers: authHeaders(),
          }))
          .catch(() => {});
      }
    }
    // Remove all healing spiral keys from localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("healing_spiral") || key.startsWith("hs_")) && key !== "hs_auth_token") {
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
    setChatSummary("");
    setPreviousChatContext(null);
    setUserMessageCount(0);
    setPaymentVerified(false);
    setSocraticMessages([]);
    setUserModalities([]);
    setUserModalitiesOther("");
    setAssessmentMethod(null);
    setScoreRationale(null);
    setUserContext("");
  }, [authToken, authHeaders, scores, persona, clinicalMode, chatMessages, chatSummary, userMessageCount, assessmentMethod, sliderResponses, scoreRationale, userModalities, userModalitiesOther, userContext, probingMessages, socraticMessages]);

  // ── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div style={styles.root}>
      <div style={styles.grain} />
      
      {stage === "landing" && <Landing onStart={() => { setStage("persona"); trackEvent('assessment_started'); }} onClearData={clearAllData} onAuthLogin={(token, user, loginEmail) => {
        // Auth-based login: save token, restore from server
        saveAuthToken(token);
        setAuthUser(user);
        setEmail(loginEmail);
        setEmailSubmitted(true);
        setSessionKey(loginEmail);
        // Try to restore session from server
        fetch('/api/sessions/current', { headers: { 'Authorization': `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : { session: null })
          .then(data => {
            if (data.session?.scores) {
              setScores(data.session.scores);
              if (data.session.persona) setPersonaRaw(PERSONAS.find(p => p.id === data.session.persona) || null);
              if (data.session.clinicalMode !== undefined) setClinicalMode(data.session.clinicalMode);
              if (data.session.chatMessages?.length > 0) setChatMessages(data.session.chatMessages);
              if (data.session.chatSummary) setChatSummary(data.session.chatSummary);
              if (data.session.messageCount) setUserMessageCount(data.session.messageCount);
              if (data.session.assessmentMethod) setAssessmentMethod(data.session.assessmentMethod);
              if (data.session.sliderResponses) setSliderResponses(data.session.sliderResponses);
              if (data.session.scoreRationale) setScoreRationale(data.session.scoreRationale);
              if (data.session.userModalities?.length > 0) setUserModalities(data.session.userModalities);
              if (data.session.userModalitiesOther) setUserModalitiesOther(data.session.userModalitiesOther);
              if (data.session.userContext) setUserContext(data.session.userContext);
              if (data.session.probingMessages?.length > 0) setProbingMessages(data.session.probingMessages);
              if (data.session.socraticMessages?.length > 0) setSocraticMessages(data.session.socraticMessages);
              setProbingDone(true);
              setStage("returning");
            } else {
              // No server session — check localStorage
              const key = emailHash(loginEmail.toLowerCase().trim());
              const existing = loadSession(key);
              if (existing?.scores) {
                if (existing.persona) setPersonaRaw(existing.persona);
                if (existing.scores) setScores(existing.scores);
                setProbingDone(true);
                // Migrate localStorage to server
                fetch('/api/sessions/migrate', {
                  method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    scores: existing.scores, persona: existing.persona?.id, clinicalMode: existing.clinicalMode,
                    chatMessages: existing.chatMessages, chatSummary: existing.chatSummary, messageCount: existing.userMessageCount || 0,
                    assessmentMethod: existing.assessmentMethod, sliderResponses: existing.sliderResponses,
                    scoreRationale: existing.scoreRationale, userModalities: existing.userModalities,
                    userModalitiesOther: existing.userModalitiesOther, userContext: existing.userContext,
                    probingMessages: existing.probingMessages, socraticMessages: existing.socraticMessages,
                  }),
                }).catch(() => {});
                setStage("returning");
              } else {
                addToast("Welcome! Let's create your profile.", "info");
                setStage("persona");
              }
            }
          })
          .catch(() => setStage("persona"));
        trackEvent('user_logged_in');
      }} onLogin={(loginEmail) => {
        const key = emailHash(loginEmail.toLowerCase().trim());
        const existing = loadSession(key);
        if (existing && existing.scores) {
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
          setEmail(loginEmail);
          addToast("No existing profile found — let's create one!", "info");
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
        <PersonaSelect onSelect={(p) => { setPersona(p); setStage("assessment_choice"); }} onBack={() => setStage("landing")} />
      )}

      {stage === "assessment_choice" && (
        <div style={styles.page}>
          <BackButton onClick={() => setStage("persona")} />
          <div style={styles.sectionInner}>
            <div style={styles.spiralGlyph}>◎</div>
            <h2 style={styles.sectionTitle}>How Would You Like to Be Assessed?</h2>
            <p style={styles.sectionSub}>Choose the approach that feels right for you.</p>
            <p style={{ fontSize: "0.8rem", opacity: 0.4, maxWidth: 480, lineHeight: 1.6, marginTop: "0.25rem" }}>
              Your results will be saved and available to you after the assessment — you can review, export, or revisit them anytime.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem", maxWidth: 560, width: "100%" }}>
              <button
                onClick={() => { setAssessmentMethod("questionnaire"); setStage("modality_profile"); }}
                style={{
                  ...styles.personaCard,
                  textAlign: "left", fontFamily: "inherit", color: "var(--text)", cursor: "pointer",
                  padding: "1.25rem",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
                <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.4rem" }}>Self-Assessment</div>
                <div style={{ fontSize: "0.85rem", opacity: 0.6, fontStyle: "italic", marginBottom: "0.6rem" }}>Quick and reflective — 3 to 5 minutes</div>
                <ul style={{ fontSize: "0.78rem", opacity: 0.5, margin: 0, paddingLeft: "1.1rem", lineHeight: 1.7 }}>
                  <li>Rate yourself on 10 healing dimensions</li>
                  <li>Slider-based — intuitive and fast</li>
                  <li>Followed by 2 deepening questions from the coach</li>
                  <li>Good if you already have some self-awareness</li>
                </ul>
              </button>
              <button
                onClick={() => { setAssessmentMethod("socratic"); setStage("modality_profile"); }}
                style={{
                  ...styles.personaCard,
                  textAlign: "left", fontFamily: "inherit", color: "var(--text)", cursor: "pointer",
                  padding: "1.25rem",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💬</div>
                <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.4rem" }}>Guided Conversation</div>
                <div style={{ fontSize: "0.85rem", opacity: 0.6, fontStyle: "italic", marginBottom: "0.6rem" }}>Deeper and more exploratory — 5 to 10 minutes</div>
                <ul style={{ fontSize: "0.78rem", opacity: 0.5, margin: 0, paddingLeft: "1.1rem", lineHeight: 1.7 }}>
                  <li>The coach asks questions and listens</li>
                  <li>Your profile emerges from the conversation</li>
                  <li>No self-rating required — the AI reads between the lines</li>
                  <li>Best if you prefer dialogue over forms</li>
                </ul>
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === "modality_profile" && (
        <ModalityProfile
          selected={userModalities}
          otherText={userModalitiesOther}
          onToggle={(key) => setUserModalities(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
          )}
          onOtherChange={setUserModalitiesOther}
          onContinue={() => {
            if (assessmentMethod === "socratic") {
              startSocratic();
            } else {
              setStage("questionnaire");
            }
          }}
          onBack={() => setStage("assessment_choice")}
        />
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
              // Check if all responses are uniform (likely defaults)
              // Note: untouched sliders default to 3 but aren't stored in sliderResponses
              const vals = DIMENSIONS.map(d => sliderResponses[d.id] || 3);
              const allSame = vals.every(v => v === vals[0]);
              const mostDefault = vals.filter(v => v === 3).length >= 8;
              if (allSame || mostDefault) {
                setStage("confirm_assessment");
              } else {
                startProbing(sliderResponses);
              }
            }
          }}
          onBack={() => currentDimIdx > 0 && setCurrentDimIdx(i => i - 1)}
        />
      )}

      {stage === "confirm_assessment" && (
        <div style={styles.page}>
          <BackButton onClick={() => { setCurrentDimIdx(0); setStage("questionnaire"); }} />
          <div style={styles.sectionInner}>
            <div style={styles.spiralGlyph}>◎</div>
            <h2 style={styles.sectionTitle}>Just Checking</h2>
            <p style={styles.sectionSub}>
              It looks like you may have clicked through without adjusting the sliders.
              Would you like to try again, or continue as-is?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", maxWidth: 380, marginTop: "1.5rem" }}>
              <button style={styles.primaryBtn} onClick={() => { setCurrentDimIdx(0); setStage("questionnaire"); }}>
                🔄 Retake the Self-Assessment
              </button>
              <button onClick={() => { setSocraticMessages([]); startSocratic(); }} style={styles.primaryBtn}>
                💬 Try a Guided Conversation Instead
              </button>
              <button onClick={() => startProbing(sliderResponses)} style={{
                ...styles.primaryBtn, background: "transparent",
                border: "1px solid var(--gold)", color: "var(--gold)",
              }}>
                Continue with These Scores
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === "socratic" && (
        <SocraticAssessment
          messages={socraticMessages}
          input={socraticInput}
          loading={socraticLoading}
          streaming={streamingText}
          bottomRef={socraticBottomRef}
          onInput={setSocraticInput}
          onSend={sendSocraticMessage}
          onBack={() => { setSocraticMessages([]); setStreamingText(""); setStage("assessment_choice"); }}
          currentPersona={persona}
          onPersonaChange={setPersona}
          clinicalMode={clinicalMode}
          onToggleClinical={() => setClinicalMode(c => !c)}
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
          onDone={() => setStage("profile_review")}
          currentPersona={persona}
          onPersonaChange={setPersona}
          clinicalMode={clinicalMode}
          onToggleClinical={() => setClinicalMode(c => !c)}
        />
      )}

      {stage === "profile_review" && scores && (
        <ProfileReview
          scores={scores}
          rationale={scoreRationale}
          userContext={userContext}
          onContextChange={setUserContext}
          onGenerateRationale={generateRationale}
          onContinue={() => setStage("results")}
          onBack={() => setStage(assessmentMethod === "socratic" ? "assessment_choice" : "questionnaire")}
        />
      )}

      {stage === "results" && scores && (
        <Results
          scores={scores}
          modalities={getTopModalities(scores, 5)}
          onBack={() => setStage("profile_review")}
          onEmailCapture={() => {
            // If user is already logged in, skip email capture — send report in background and go to paywall
            if (email && email.includes("@") && emailSubmitted) {
              // Migrate session to email-keyed storage if needed
              setSessionKey(email);
              saveSession({
                stage: "paywall", email, emailSubmitted: true,
                persona: _personaStored, clinicalMode, sliderResponses,
                scores, probingMessages, probingDone: true,
              });
              // Send report email in background
              (async () => {
                try {
                  const pdfBase64 = await generatePDF(scores);
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
                  if (resp.ok) addToast("Your report has been sent! Check your inbox.", "success");
                  else addToast("Couldn't send report email. You can still download the PDF.", "error");
                } catch { addToast("Couldn't send report email. You can still download the PDF.", "error"); }
              })();
              setStage("paywall");
            } else {
              setStage("email_capture");
            }
          }}
          onDownloadPDF={() => downloadPDF(scores)}
          onSkipToCoaching={() => {
            // If user has email, migrate session; either way go to paywall
            if (email && email.includes("@")) {
              setSessionKey(email);
              saveSession({
                stage: "paywall", email, emailSubmitted: true,
                persona: _personaStored, clinicalMode, sliderResponses,
                scores, probingMessages, probingDone: true,
              });
            }
            setStage("paywall");
          }}
        />
      )}

      {stage === "email_capture" && (
        <EmailCapture
          email={email}
          onChange={setEmail}
          loading={emailSending}
          onBack={() => setStage("results")}
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
        <Paywall onUnlock={() => startChat()} reportSent={emailSubmitted && email} messagesUsed={userMessageCount} onBack={() => setStage("results")} />
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
            // Include the summary if we have one, plus the last 6 messages
            const summaryPart = chatSummary ? `[Summary of earlier conversation: ${chatSummary}]\n` : "";
            if (chatMessages.length > 1) {
              const recentMsgs = chatMessages.slice(-6).map(m => `${m.role}: ${m.content}`).join("\n");
              setPreviousChatContext(summaryPart + recentMsgs);
            } else if (chatSummary) {
              setPreviousChatContext(summaryPart);
            }
            // Preserve profile (scores, persona, email, probing) — only reset chat
            setChatMessages([]);
            setChatSummary("");
            setUserMessageCount(0);
            setPaymentVerified(false);
            startChat(true);
          }}
          onRetakeAssessment={() => {
            setStage("assessment_choice");
            setScores(null);
            setScoreRationale(null);
            setSliderResponses({});
            setCurrentDimIdx(0);
            setProbingMessages([]);
            setProbingDone(false);
            setSocraticMessages([]);
            setAssessmentMethod(null);
          }}
          onClearData={clearAllData}
          authToken={authToken}
          authSubscription={authSubscription}
          onSubscriptionChange={(sub) => setAuthSubscription(sub)}
          journalEntries={journalEntries}
          journalComposing={journalComposing}
          setJournalComposing={setJournalComposing}
          journalMood={journalMood}
          setJournalMood={setJournalMood}
          journalDimension={journalDimension}
          setJournalDimension={setJournalDimension}
          journalText={journalText}
          setJournalText={setJournalText}
          journalPanelOpen={journalPanelOpen}
          setJournalPanelOpen={setJournalPanelOpen}
          journalLoading={journalLoading}
          onSaveJournal={async (content, opts) => {
            setJournalLoading(true);
            const entry = await saveJournalEntry(content, opts);
            setJournalLoading(false);
            return entry;
          }}
          onRequestReflection={requestReflection}
          onExportJournal={async () => {
            if (!authToken) return;
            try {
              const resp = await fetch('/api/journal/export', {
                headers: { 'Authorization': `Bearer ${authToken}` },
              });
              if (!resp.ok) throw new Error();
              const blob = await resp.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `healing-spiral-journal-${new Date().toISOString().split('T')[0]}.md`;
              a.click();
              URL.revokeObjectURL(url);
            } catch { /* handled in UI */ }
          }}
          cloudSyncStatus={cloudSyncStatus}
          syncingService={syncingService}
          onSyncToCloud={syncToCloud}
          onConnectCloud={async (service) => {
            if (!authToken) return;
            try {
              const resp = await fetch(`/api/cloud-sync/${service}/auth`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
              });
              const data = await resp.json();
              if (data.url) window.open(data.url, '_blank', 'width=600,height=700');
              else if (data.error) return { error: data.error };
            } catch { return { error: 'Connection failed' }; }
          }}
          onDisconnectCloud={async (service) => {
            if (!authToken) return;
            await fetch(`/api/cloud-sync/${service}/disconnect`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${authToken}` },
            });
            setCloudSyncStatus(prev => ({ ...prev, [service]: false }));
          }}
          fetchJournalEntries={fetchJournalEntries}
          userModalities={userModalities}
          onToggleModality={(key) => setUserModalities(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
          )}
          userModalitiesOther={userModalitiesOther}
          onModalitiesOtherChange={setUserModalitiesOther}
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

function Landing({ onStart, onLogin, onAuthLogin, onClearData }) {
  const [visible, setVisible] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim()) return;
    // If no password, use legacy email-only flow
    if (!loginPassword) {
      onLogin(loginEmail.trim());
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setAuthError(data.error || 'Authentication failed');
      } else {
        onAuthLogin(data.token, data.user, loginEmail.trim());
      }
    } catch {
      setAuthError('Connection error. Please try again.');
    }
    setAuthLoading(false);
  };
  return (
    <div style={{
      ...styles.page, opacity: visible ? 1 : 0, transition: "opacity 1.2s ease",
    }}>
      <div style={styles.landingInner}>
        <img src="/landing-bg.png" alt="Healing Spiral" style={{
          width: "120px", height: "120px", borderRadius: "50%", objectFit: "cover",
          marginBottom: "1rem",
          boxShadow: "0 0 30px rgba(212,175,55,0.3)",
        }} />
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
        <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{
          color: "var(--gold)", opacity: 0.5, fontSize: "0.85rem",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          marginTop: "0.5rem", textDecoration: "none", letterSpacing: "0.03em",
        }}>
          Or book a live session with Eli
        </a>
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
          <form onSubmit={handleAuthSubmit} style={{
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
            <input
              type="password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              placeholder="Password (optional — for account sync)"
              style={{ ...styles.emailInput, width: "100%" }}
            />
            {authError && <p style={{ color: "#fca5a5", fontSize: "0.8rem", margin: 0 }}>{authError}</p>}
            <button type="submit" disabled={authLoading} style={{ ...styles.primaryBtn, width: "100%", marginTop: "0.25rem", padding: "0.7rem 1.5rem", fontSize: "0.9rem", opacity: authLoading ? 0.6 : 1 }}>
              {authLoading ? "..." : isRegistering ? "Create Account →" : "Sign In →"}
            </button>
            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setAuthError(""); }} style={{
              background: "none", border: "none", color: "var(--gold)", opacity: 0.6,
              fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "0.8rem",
              cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px",
            }}>
              {isRegistering ? "Already have an account? Sign in" : "New here? Create an account"}
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
                <span style={{ fontSize: "0.75rem", color: "var(--gold)" }}>
                  💡 Create an account first to keep a backup of your data.
                </span>
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
                  A copy will be downloaded automatically before clearing.
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
  return (
    <div style={styles.page}>
      <div style={styles.sectionInner}>
        <div style={styles.spiralGlyph}>◎</div>
        <h2 style={styles.sectionTitle}>Welcome Back</h2>
        <p style={styles.sectionSub}>
          We found your Healing Spiral profile{email ? ` for ${email}` : ""}.
        </p>
        {scores && (
          <div style={{ width: "100%", maxWidth: 380, margin: "1rem auto" }}>
            {DIMENSIONS.map(d => {
              const tier = scores[d.id];
              if (!tier) return null;
              const pct = Math.max(10, ((7 - tier) / 6) * 100);
              return (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                  <span style={{ fontSize: "0.75rem", width: 20, textAlign: "center" }}>{d.emoji}</span>
                  <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: getTierColor(tier), borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
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

function BackButton({ onClick, label }) {
  return (
    <button onClick={onClick} style={{
      position: "absolute", top: "1rem", left: "1rem", zIndex: 10,
      background: "none", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 4, color: "rgba(255,255,255,0.35)", fontSize: "0.7rem",
      padding: "0.3rem 0.6rem", cursor: "pointer", fontFamily: "inherit",
      letterSpacing: "0.03em", transition: "all 0.2s",
    }}
    onMouseEnter={e => { e.target.style.color = "var(--gold)"; e.target.style.borderColor = "var(--gold)"; }}
    onMouseLeave={e => { e.target.style.color = "rgba(255,255,255,0.35)"; e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
    >
      ← {label || "Back"}
    </button>
  );
}

function PersonaSelect({ onSelect, onBack }) {
  const [hovered, setHovered] = useState(null);
  const isMobile = useIsMobile();
  return (
    <div style={styles.page}>
      {onBack && <BackButton onClick={onBack} />}
      <div style={styles.sectionInner}>
        <h2 style={styles.sectionTitle}>Choose Your Coach</h2>
        <p style={styles.sectionSub}>Your AI coach will accompany you through the assessment and into deeper work.</p>
        <div style={{ ...styles.personaGrid, gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)" }}>
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

// ── MODALITY PROFILE ──────────────────────────────────────────────────────

function ModalityProfile({ selected, otherText, onToggle, onOtherChange, onContinue, onBack }) {
  const [expandedCategory, setExpandedCategory] = useState(null);
  return (
    <div style={styles.page}>
      <div style={{ ...styles.sectionInner, maxWidth: 760 }}>
        <div style={styles.spiralGlyph}>◎</div>
        <h2 style={styles.sectionTitle}>Your Healing Background</h2>
        <p style={styles.sectionSub}>
          Select any modalities or frameworks you have experience with.
          This helps your coach speak your language.
        </p>
        <p style={{ fontSize: "0.82rem", opacity: 0.4, marginBottom: "1.5rem", fontStyle: "italic" }}>
          Optional — skip if you prefer
        </p>

        <div style={{ textAlign: "left", width: "100%" }}>
          {Object.entries(MOD_CATEGORIES).map(([category, keys]) => {
            const selectedInCategory = keys.filter(k => selected.includes(k)).length;
            const isExpanded = expandedCategory === category;
            return (
              <div key={category} style={{ marginBottom: "0.5rem" }}>
                <button
                  onClick={() => setExpandedCategory(prev => prev === category ? null : category)}
                  style={{
                    background: selectedInCategory > 0 ? "rgba(201,162,39,0.06)" : "none",
                    border: "none", color: "var(--gold)",
                    fontSize: "0.9rem", fontFamily: "inherit", cursor: "pointer",
                    padding: "0.6rem 0.8rem", fontWeight: 600, letterSpacing: "0.03em",
                    width: "100%", textAlign: "left", borderRadius: 6,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    transition: "all 0.15s",
                  }}
                >
                  <span>{category}</span>
                  <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>
                    {selectedInCategory > 0 ? `(${selectedInCategory})` : ""}
                    {" "}{isExpanded ? "▾" : "▸"}
                  </span>
                </button>
                {isExpanded && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", padding: "0.5rem 0.8rem 0.8rem" }}>
                    {keys.map(key => {
                      const isSelected = selected.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => onToggle(key)}
                          style={{
                            padding: "0.3rem 0.75rem",
                            borderRadius: 20,
                            border: isSelected ? "1px solid var(--gold)" : "1px solid var(--border)",
                            background: isSelected ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.04)",
                            color: isSelected ? "var(--gold)" : "var(--text)",
                            fontSize: "0.82rem",
                            fontFamily: "inherit",
                            cursor: "pointer",
                            transition: "all 0.15s",
                            opacity: isSelected ? 1 : 0.7,
                          }}
                        >
                          {MODS[key]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "1.5rem", textAlign: "left", width: "100%" }}>
          <label style={{ fontSize: "0.85rem", opacity: 0.6, display: "block", marginBottom: "0.4rem" }}>
            Other modalities not listed:
          </label>
          <input
            type="text"
            value={otherText}
            onChange={e => onOtherChange(e.target.value)}
            placeholder="e.g., Focusing, Process Work, NARM..."
            style={{
              width: "100%", padding: "0.7rem 1rem",
              background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
              borderRadius: 4, color: "var(--text)", fontSize: "0.95rem",
              fontFamily: "inherit", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {selected.length > 0 && (
          <div style={{ marginTop: "1rem", fontSize: "0.82rem", opacity: 0.5 }}>
            {selected.length} modalit{selected.length !== 1 ? "ies" : "y"} selected
          </div>
        )}

        <div style={{ ...styles.navRow, marginTop: "2rem" }}>
          <button style={styles.secondaryBtn} onClick={onBack}>← Back</button>
          <button style={styles.primaryBtn} onClick={onContinue}>
            {selected.length > 0 || otherText.trim() ? "Continue →" : "Skip →"}
          </button>
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
    <div style={{ ...styles.page, padding: 0, overflow: "hidden" }}>
      <div style={{ ...styles.chatOuter, height: "100dvh" }}>
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
          <div style={styles.chatInputRow}>
            <button style={{ ...styles.primaryBtn, flex: 1, margin: 0 }} onClick={onDone}>
              View My Full Profile →
            </button>
          </div>
        ) : (
          <>
            {!loading && messages.length > 0 && aiSignaledTransition(messages[messages.length - 1]?.content) && !done && (
              <WorkingIndicator label="Preparing your profile…" />
            )}
            <div style={styles.chatInputRow}>
              <AutoTextarea
                ref={inputRef}
                value={input}
                onChange={e => onInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                maxLength={2000}
                placeholder="Share what's true for you… (Enter to send, Shift+Enter for new line)"
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

// ── SOCRATIC ASSESSMENT ────────────────────────────────────────────────────

function SocraticAssessment({ messages, input, loading, streaming, bottomRef, onInput, onSend, onBack, currentPersona, onPersonaChange, clinicalMode, onToggleClinical }) {
  const inputRef = useRef(null);
  const handleSend = () => { onSend(); setTimeout(() => inputRef.current?.focus(), 50); };
  return (
    <div style={{ ...styles.page, padding: 0, overflow: "hidden" }}>
      <div style={{ ...styles.chatOuter, height: "100dvh" }}>
        <div style={styles.chatHeader}>
          <button
            onClick={onBack}
            title="Back to assessment choice"
            style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 4, width: 32, height: 32, cursor: "pointer",
              fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--gold)", transition: "all 0.15s", marginRight: "0.3rem",
            }}
          >
            ←
          </button>
          <div style={styles.spiralGlyphSmall}>◎</div>
          <span style={styles.chatHeaderTitle}>Guided Assessment</span>
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
              <WorkingIndicator label="Preparing your guided assessment..." />
            </div>
          )}
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role} content={m.content} />
          ))}
          {messages.length > 0 && loading && !streaming && <TypingIndicator />}
          {streaming && <ChatBubble role="assistant" content={streaming} streaming />}
          <div ref={bottomRef} />
        </div>
        <div style={styles.chatInputRow}>
          <AutoTextarea
            ref={inputRef}
            value={input}
            onChange={e => onInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            maxLength={2000}
            placeholder="Share what's true for you... (Enter to send, Shift+Enter for new line)"
            disabled={loading}
            autoFocus
          />
          <button style={styles.sendBtn} onClick={() => handleSend()} disabled={loading || !input.trim()}>→</button>
        </div>
      </div>
    </div>
  );
}

// ── PROFILE REVIEW ────────────────────────────────────────────────────────

function ProfileReview({ scores, rationale, userContext, onContextChange, onGenerateRationale, onContinue, onBack }) {
  const [expandedDim, setExpandedDim] = useState(null);

  // Generate rationale on mount if not already present
  useEffect(() => {
    if (!rationale) onGenerateRationale();
  }, [rationale, onGenerateRationale]);

  return (
    <div style={styles.page}>
      {onBack && <BackButton onClick={onBack} />}
      <div style={{ ...styles.sectionInner, maxWidth: 720 }}>
        <div style={styles.spiralGlyph}>◎</div>
        <h2 style={styles.sectionTitle}>Review Your Profile</h2>
        <p style={styles.sectionSub}>
          Here's what we observed across each dimension — tap any to see why.
        </p>

        <div style={{ width: "100%", textAlign: "left", marginBottom: "1.5rem" }}>
          {DIMENSIONS.map(d => {
            const tier = scores[d.id];
            const pct = Math.max(10, ((7 - tier) / 6) * 100);
            const isExpanded = expandedDim === d.id;
            const reason = rationale?.[d.id];
            return (
              <div key={d.id} style={{ marginBottom: "0.4rem" }}>
                <button
                  onClick={() => setExpandedDim(prev => prev === d.id ? null : d.id)}
                  style={{
                    width: "100%", background: isExpanded ? "rgba(201,162,39,0.06)" : "transparent",
                    border: "none", padding: "0.5rem 0.4rem", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "0.6rem",
                    borderRadius: 6, transition: "all 0.15s", fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: "1.1rem", width: 24, textAlign: "center", flexShrink: 0 }}>{d.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                      <span style={{ fontSize: "0.88rem", color: "var(--text)", fontWeight: 500 }}>{d.label}</span>
                      <span style={{
                        fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: 12,
                        background: getTierColor(tier), color: "#fff", fontWeight: 600,
                      }}>{TIER_LABELS[tier]}</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: getTierColor(tier), borderRadius: 2, transition: "width 0.3s" }} />
                    </div>
                  </div>
                  <span style={{ fontSize: "0.7rem", opacity: 0.4, flexShrink: 0 }}>{isExpanded ? "▾" : "▸"}</span>
                </button>
                {isExpanded && (
                  <div style={{
                    padding: "0.6rem 0.8rem 0.8rem 2.8rem",
                    fontSize: "0.88rem", opacity: 0.75, lineHeight: 1.5,
                    fontStyle: "italic", color: "var(--text)",
                  }}>
                    {reason || "Generating insight..."}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ width: "100%", textAlign: "left", marginBottom: "1.5rem" }}>
          <label style={{ fontSize: "0.9rem", fontWeight: 500, display: "block", marginBottom: "0.5rem", color: "var(--gold)" }}>
            Anything you'd like to add or clarify?
          </label>
          <p style={{ fontSize: "0.82rem", opacity: 0.5, marginBottom: "0.5rem" }}>
            Is there context the assessment might have missed? Anything you'd want your coach to know?
          </p>
          <textarea
            value={userContext}
            onChange={e => onContextChange(e.target.value)}
            placeholder="e.g., I've been doing a lot of somatic work lately that might not have come through, or I'm in a particularly intense period right now..."
            style={{
              width: "100%", minHeight: 90, padding: "0.8rem 1rem",
              background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
              borderRadius: 6, color: "var(--text)", fontSize: "0.92rem",
              fontFamily: "inherit", outline: "none", resize: "vertical",
              boxSizing: "border-box", lineHeight: 1.5,
            }}
          />
        </div>

        <div style={styles.navRow}>
          <button style={styles.primaryBtn} onClick={onContinue}>
            Continue to Profile →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RESULTS ────────────────────────────────────────────────────────────────

function Results({ scores, modalities, onEmailCapture, onDownloadPDF, onSkipToCoaching, onBack }) {
  const lowestDims = DIMENSIONS.filter(d => scores[d.id] >= 5);

  return (
    <div style={styles.page}>
      {onBack && <BackButton onClick={onBack} />}
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
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.5rem" }}>
          {modalities.slice(0, 3).map(m => {
            const targetDims = m.dimensions.map(d => DIMENSIONS.find(x => x.id === d)).filter(Boolean);
            return (
              <div key={m.name} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.15)",
                borderRadius: 8, padding: "0.75rem 1rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 600 }}>{m.name}</span>
                  <span style={{ fontSize: "0.85rem", opacity: 0.5 }}>{targetDims.map(d => d.emoji).join(" ")}</span>
                </div>
                <div style={{ fontSize: "0.78rem", opacity: 0.5, lineHeight: 1.5 }}>
                  Targets {targetDims.map((d, i) => (
                    <span key={d.id}>
                      <strong style={{ opacity: 0.8 }}>{d.label}</strong>
                      {scores[d.id] >= 5 ? ' (growth edge)' : ''}
                      {i < targetDims.length - 1 ? ' and ' : ''}
                    </span>
                  ))}
                  {' — '}
                  {targetDims.some(d => scores[d.id] >= 5)
                    ? 'directly addresses your areas with the most room for development.'
                    : 'strengthens dimensions where you already have some foundation.'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.paywallTeaser}>
          <button style={styles.primaryBtn} onClick={onSkipToCoaching}>
            Start Coaching Session →
          </button>
          <p style={{ ...styles.teaserText, marginTop: "1.5rem" }}>
            📄 Or get your full PDF report with all 10 dimensions and modality recommendations — free.
          </p>
          <button
            style={{ ...styles.primaryBtn, background: "transparent", border: "1px solid #c9a227", color: "#c9a227", marginTop: "0.25rem" }}
            onClick={onEmailCapture}
          >
            Get My Full Report →
          </button>
          <button
            style={{ ...styles.primaryBtn, background: "transparent", border: "1px solid rgba(201, 162, 39, 0.4)", color: "rgba(201, 162, 39, 0.6)", marginTop: "0.5rem", fontSize: "0.85rem" }}
            onClick={onDownloadPDF}
          >
            Download PDF Preview
          </button>
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{
            display: "block", marginTop: "1.5rem", color: "var(--gold)", opacity: 0.6,
            fontSize: "0.85rem", fontFamily: "'Cormorant Garamond', Georgia, serif",
            textDecoration: "none", letterSpacing: "0.03em",
          }}>
            Want to go deeper? Book a live coaching session with Eli
          </a>
        </div>
      </div>
    </div>
  );
}

// ── EMAIL CAPTURE ──────────────────────────────────────────────────────────

function EmailCapture({ email, onChange, onSubmit, loading, onBack }) {
  return (
    <div style={styles.page}>
      {onBack && <BackButton onClick={onBack} />}
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

function Paywall({ onUnlock, reportSent, messagesUsed = 0, onBack }) {
  return (
    <div style={styles.page}>
      {onBack && <BackButton onClick={onBack} />}
      <div style={styles.sectionInner}>
        <div style={styles.spiralGlyph}>◎</div>
        <h2 style={styles.sectionTitle}>Begin the Coaching</h2>
        <p style={styles.sectionSub}>
          {reportSent
            ? "Your report is on its way. Now go deeper — into a live AI coaching session that holds your full Healing Spiral profile."
            : "Your profile is ready. Now go deeper — into a live AI coaching session that holds your full Healing Spiral profile."}
        </p>
        <div style={styles.pricingCard}>
          <div style={styles.pricingBadge}>FREE TO START</div>
          <div style={styles.pricingPrice}>{messagesUsed > 0 ? (20 - messagesUsed) : 20}<span style={styles.pricingPer}> free messages{messagesUsed > 0 ? " remaining" : ""}</span></div>
          <p style={styles.pricingDesc}>Try the coaching experience free. Unlock unlimited access when you're ready.</p>
          <ul style={styles.featureList}>
            <li>✦ Full 10-dimension context</li>
            <li>✦ Modality recommendations woven in</li>
            <li>✦ Your chosen coach persona</li>
            <li>✦ 20 free messages to start</li>
          </ul>
          <button style={{ ...styles.primaryBtn, width: "100%", marginTop: "1.5rem" }} onClick={onUnlock}>
            Enter the Coaching Session →
          </button>
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{
            display: "block", marginTop: "1rem", color: "var(--gold)", opacity: 0.5,
            fontSize: "0.8rem", fontFamily: "'Cormorant Garamond', Georgia, serif",
            textDecoration: "none", textAlign: "center", letterSpacing: "0.03em",
          }}>
            Or book a live session with Eli
          </a>
        </div>
      </div>
    </div>
  );
}

// ── COACHING CHAT ──────────────────────────────────────────────────────────

function CoachingChat({ persona, messages, input, loading, streaming, bottomRef, scores, onInput, onSend, onSendDirect, onPersonaChange, clinicalMode, onToggleClinical, onRestart, onRetakeAssessment, onClearData, isMessageCapReached, userMessageCount, freeMessageLimit, paymentVerified, onInitiateCheckout, authToken, authSubscription, onSubscriptionChange, journalEntries, journalComposing, setJournalComposing, journalMood, setJournalMood, journalDimension, setJournalDimension, journalText, setJournalText, journalPanelOpen, setJournalPanelOpen, journalLoading, onSaveJournal, onRequestReflection, onExportJournal, cloudSyncStatus, syncingService, onSyncToCloud, onConnectCloud, onDisconnectCloud, fetchJournalEntries, userModalities, onToggleModality, userModalitiesOther, onModalitiesOtherChange }) {
  const topMods = getTopModalities(scores, 3);
  const chatInputRef = useRef(null);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalityEditorOpen, setModalityEditorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        <span style={{ fontSize: "0.85rem", opacity: 0.7, flex: 1 }}>Healing Spiral</span>
        <button onClick={() => setSettingsOpen(true)} title="Settings" style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.35)",
          fontSize: "1rem", cursor: "pointer", padding: "0.2rem",
          transition: "color 0.2s",
        }}
        onMouseEnter={e => e.target.style.color = "var(--gold)"}
        onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.35)"}
        >⚙</button>
      </div>
      <div style={{ padding: "0.5rem 0.75rem", borderBottom: '1px solid var(--border)' }}>
        <div style={styles.sidebarLabel}>COACH VOICE</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.2rem" }}>
          {PERSONAS.map(p => (
            <button key={p.id} onClick={() => { onPersonaChange(p); if (isMobile) setSidebarOpen(false); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.1rem",
                background: p.id === persona.id ? "rgba(201,162,39,0.15)" : "transparent",
                border: p.id === persona.id ? "1px solid var(--gold)" : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 4, padding: "0.2rem 0.2rem", cursor: "pointer",
                color: "var(--text)", fontFamily: "inherit", transition: "all 0.15s",
              }}>
              <span style={{ fontSize: "0.75rem" }}>{p.emoji}</span>
              <span style={{ fontSize: "0.5rem", textAlign: "center", lineHeight: 1.1, opacity: 0.8 }}>{p.name.replace('The ', '')}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ ...styles.sidebarSection, borderBottom: '1px solid var(--border)', padding: "0.4rem 0.75rem" }}>
        <div style={{ ...styles.sidebarLabel, marginBottom: "0.2rem" }}>LANGUAGE</div>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={styles.sidebarLabel}>RECOMMENDED MODALITIES</div>
          <button onClick={() => setModalityEditorOpen(v => !v)} style={{
            background: "none", border: "none", color: "var(--gold)", fontSize: "0.55rem",
            cursor: "pointer", fontFamily: "inherit", opacity: 0.6, padding: "0 0.2rem",
            letterSpacing: "0.03em",
          }}>{modalityEditorOpen ? "Done" : "Edit"}</button>
        </div>
        {topMods.map(m => (
          <div key={m.name} style={styles.sidebarMod}>{m.name}</div>
        ))}
        {modalityEditorOpen && (
          <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
            <div style={{ fontSize: "0.6rem", opacity: 0.4, marginBottom: "0.4rem" }}>
              Your healing background — helps the coach speak your language:
            </div>
            {Object.entries(MOD_CATEGORIES).map(([category, keys]) => {
              const selectedInCategory = keys.filter(k => userModalities.includes(k)).length;
              return (
                <details key={category} style={{ marginBottom: "0.25rem" }}>
                  <summary style={{
                    fontSize: "0.7rem", color: "var(--gold)", cursor: "pointer", padding: "0.25rem 0",
                    opacity: selectedInCategory > 0 ? 1 : 0.6,
                  }}>
                    {category} {selectedInCategory > 0 ? `(${selectedInCategory})` : ""}
                  </summary>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", padding: "0.3rem 0 0.4rem 0.5rem" }}>
                    {keys.map(key => {
                      const isSelected = userModalities.includes(key);
                      return (
                        <button key={key} onClick={() => onToggleModality(key)} style={{
                          padding: "0.15rem 0.5rem", borderRadius: 12, fontSize: "0.6rem",
                          border: isSelected ? "1px solid var(--gold)" : "1px solid var(--border)",
                          background: isSelected ? "rgba(201,162,39,0.15)" : "transparent",
                          color: isSelected ? "var(--gold)" : "var(--text)",
                          fontFamily: "inherit", cursor: "pointer", opacity: isSelected ? 1 : 0.6,
                          transition: "all 0.15s",
                        }}>{MODS[key]}</button>
                      );
                    })}
                  </div>
                </details>
              );
            })}
            <input
              type="text"
              value={userModalitiesOther}
              onChange={e => onModalitiesOtherChange(e.target.value)}
              placeholder="Other modalities..."
              style={{
                width: "100%", padding: "0.3rem 0.5rem", marginTop: "0.3rem",
                background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                borderRadius: 4, color: "var(--text)", fontSize: "0.65rem",
                fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        )}
      </div>
      <div style={{ ...styles.sidebarSection, borderBottom: "1px solid var(--border)", padding: "0.4rem 0.75rem" }}>
        <div style={{ ...styles.sidebarLabel, marginBottom: "0.2rem" }}>JOURNAL</div>
        <div style={{ fontSize: "0.6rem", opacity: 0.5, marginBottom: "0.2rem" }}>
          {journalEntries.length} entr{journalEntries.length === 1 ? 'y' : 'ies'}
        </div>
        {journalEntries.length > 0 && (
          <div style={{
            fontSize: "0.6rem", opacity: 0.4, padding: "0.2rem 0.4rem",
            background: "rgba(255,255,255,0.02)", borderRadius: 4, marginBottom: "0.2rem",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {journalEntries[0]?.mood ? journalEntries[0].mood + ' ' : ''}{journalEntries[0]?.content?.slice(0, 60)}...
          </div>
        )}
        <button onClick={() => setJournalPanelOpen(true)} style={{
          background: "none", border: "1px solid rgba(201,162,39,0.15)", color: "var(--gold)",
          padding: "0.2rem 0.5rem", borderRadius: 4, fontFamily: "inherit", fontSize: "0.55rem",
          cursor: "pointer", width: "100%", textAlign: "center", opacity: 0.7,
        }}>
          View all entries
        </button>
      </div>
      <div style={{ padding: "0.4rem 0.75rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <button onClick={onRetakeAssessment} style={{
          width: "100%", padding: "0.25rem 0.5rem", borderRadius: 4,
          background: "none", border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.45)", fontFamily: "inherit", fontSize: "0.55rem",
          cursor: "pointer", letterSpacing: "0.03em", transition: "all 0.2s",
          textTransform: "uppercase",
        }}
        onMouseEnter={e => { e.target.style.color = "var(--gold)"; e.target.style.borderColor = "var(--gold)"; }}
        onMouseLeave={e => { e.target.style.color = "rgba(255,255,255,0.45)"; e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
        >↻ Retake Assessment</button>
        <a href="https://www.newpowerindustry.com/healingspiral/app" target="_blank" rel="noopener noreferrer" style={{
          display: "block", color: "var(--gold)", opacity: 0.6,
          fontSize: "0.55rem", fontFamily: "'Cormorant Garamond', Georgia, serif",
          textDecoration: "none", textAlign: "center", letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          View Full Profile →
        </a>
        <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{
          display: "block", color: "var(--gold)", opacity: 0.45,
          fontSize: "0.55rem", fontFamily: "'Cormorant Garamond', Georgia, serif",
          textDecoration: "none", textAlign: "center", letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          Book a session with Eli
        </a>
        <button onClick={downloadLocalExport} style={{
          width: "100%", padding: "0.25rem 0.5rem", borderRadius: 4,
          background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)",
          color: "var(--gold)", fontFamily: "inherit", fontSize: "0.55rem",
          cursor: "pointer", letterSpacing: "0.03em", transition: "all 0.2s",
        }}
        onMouseEnter={e => { e.target.style.background = "rgba(201,162,39,0.15)"; }}
        onMouseLeave={e => { e.target.style.background = "rgba(201,162,39,0.08)"; }}
        >⬇ Download My Data</button>
      </div>
      {authSubscription && (
        <SubscriptionManager authToken={authToken} subscription={authSubscription} onStatusChange={onSubscriptionChange} />
      )}
      {onClearData && (
        <ClearDataButton onClear={onClearData} authToken={authToken} />
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
          {messages.map((m, i) => {
            const isLastAssistant = i === messages.length - 1 && m.role === "assistant" && !loading;
            let displayContent = m.content;

            // Extract journal prompt if present
            const journalPromptMatch = m.role === "assistant" && displayContent.match(/\[JOURNAL_PROMPT:\s*(.+?)\]/);
            if (journalPromptMatch) {
              displayContent = displayContent.replace(/\[JOURNAL_PROMPT:\s*.+?\]/, '').trim();
            }

            if (isLastAssistant) {
              const opts = parseNumberedOptions(displayContent);
              if (opts) {
                const lines = displayContent.split("\n");
                const firstOptIdx = lines.findIndex(l => /^\d+\.\s+\*{0,2}.+\*{0,2}\s*[—–-]/.test(l));
                if (firstOptIdx > 0) {
                  displayContent = lines.slice(0, firstOptIdx).join("\n").trim();
                }
              }
            }
            return (
              <div key={i}>
                <ChatBubble role={m.role} content={displayContent} />
                {journalPromptMatch && authToken && (
                  <JournalPromptCard
                    promptText={journalPromptMatch[1]}
                    onRespond={(text, prompt) => onSaveJournal(text, { prompt, source: 'chat' })}
                  />
                )}
              </div>
            );
          })}
          {messages.length > 0 && loading && !streaming && <TypingIndicator />}
          {streaming && <ChatBubble role="assistant" content={streaming} streaming />}
          <div ref={bottomRef} />
        </div>
        {!loading && messages.length > 0 && aiSignaledTransition(messages[messages.length - 1]?.content) && (
          <NudgeButton label="I'm ready" onClick={() => handleSend("I'm ready to continue.")} />
        )}
        {!isMessageCapReached && !paymentVerified && userMessageCount > 0 && (
          <div style={{ textAlign: "center", padding: "0.25rem", fontSize: "0.7rem", opacity: userMessageCount > (freeMessageLimit - 6) ? 0.6 : 0.3, letterSpacing: "0.05em", transition: "opacity 0.3s" }}>
            {freeMessageLimit - userMessageCount} free message{freeMessageLimit - userMessageCount !== 1 ? 's' : ''} remaining
          </div>
        )}
        {(() => {
          if (loading || !messages.length) return null;
          const lastMsg = messages[messages.length - 1];
          if (!lastMsg || lastMsg.role !== "assistant") return null;
          const opts = parseNumberedOptions(lastMsg.content);
          if (!opts) return null;
          return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", padding: "0.75rem 1rem", borderTop: "1px solid var(--border)", background: "var(--bg, #1a1208)", flexShrink: 0 }}>
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
              Unlock unlimited coaching to continue.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={() => onInitiateCheckout("subscription")} style={{ ...styles.primaryBtn, marginTop: 0, flex: 1 }}>
                $4.99/mo
              </button>
              <button onClick={() => onInitiateCheckout("onetime")} style={{ ...styles.primaryBtn, marginTop: 0, flex: 1, background: "transparent", border: "1px solid var(--gold)", color: "var(--gold)" }}>
                $20 lifetime
              </button>
            </div>
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{
              display: "block", marginTop: "1rem", color: "var(--gold)", opacity: 0.5,
              fontSize: "0.8rem", fontFamily: "'Cormorant Garamond', Georgia, serif",
              textDecoration: "none", textAlign: "center", letterSpacing: "0.03em",
            }}>
              Or book a live coaching session with Eli
            </a>
          </div>
        ) : journalComposing ? (
          <JournalCompose
            text={journalText}
            setText={setJournalText}
            mood={journalMood}
            setMood={setJournalMood}
            dimension={journalDimension}
            setDimension={setJournalDimension}
            loading={journalLoading}
            onSave={async () => {
              if (!journalText.trim()) return;
              const entry = await onSaveJournal(journalText, { mood: journalMood, dimension: journalDimension, source: 'direct' });
              if (entry) {
                setJournalText("");
                setJournalMood(null);
                setJournalDimension(null);
                setJournalComposing(false);
                setTimeout(() => chatInputRef.current?.focus(), 50);
              }
            }}
            onCancel={() => { setJournalComposing(false); setJournalText(""); setJournalMood(null); setJournalDimension(null); setTimeout(() => chatInputRef.current?.focus(), 50); }}
          />
        ) : (
          <div style={styles.chatInputRow}>
            <button
              onClick={() => setJournalComposing(true)}
              title="Write a journal entry"
              style={{
                background: "transparent", border: "1px solid var(--border)", borderRadius: 4,
                width: 44, height: 44, fontSize: "1.1rem", cursor: "pointer", color: "var(--gold)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                opacity: 0.6, transition: "opacity 0.2s",
              }}
              onMouseEnter={e => e.target.style.opacity = 1}
              onMouseLeave={e => e.target.style.opacity = 0.6}
            >
              ✎
            </button>
            <AutoTextarea
              ref={chatInputRef}
              value={input}
              onChange={e => onInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="What's on your mind… (Enter to send, Shift+Enter for new line)"
              disabled={loading}
              maxLength={4000}
              autoFocus
            />
            <button style={styles.sendBtn} onClick={() => handleSend()} disabled={loading || !input.trim()}>→</button>
          </div>
        )}
      </div>

      <JournalPanel
        entries={journalEntries}
        open={journalPanelOpen}
        onClose={() => setJournalPanelOpen(false)}
        onExport={onExportJournal}
        onRequestReflection={onRequestReflection}
        cloudSyncStatus={cloudSyncStatus}
        syncingService={syncingService}
        onSyncToCloud={onSyncToCloud}
        onConnectCloud={onConnectCloud}
        onDisconnectCloud={onDisconnectCloud}
        authToken={authToken}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        authToken={authToken}
        authSubscription={authSubscription}
        onSubscriptionChange={onSubscriptionChange}
        onClearData={onClearData}
      />
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

// ── AUTO-EXPANDING TEXTAREA ───────────────────────────────────────────────

const AutoTextarea = forwardRef(function AutoTextarea({ value, onChange, onKeyDown, placeholder, disabled, maxLength, autoFocus, style: extraStyle }, ref) {
  const internalRef = useRef(null);
  const textareaRef = ref || internalRef;

  const resize = useCallback(() => {
    const el = typeof textareaRef === 'function' ? null : textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [textareaRef]);

  useEffect(() => { resize(); }, [value, resize]);

  return (
    <textarea
      ref={textareaRef}
      style={{ ...styles.chatInput, resize: "none", overflow: "hidden", minHeight: 44, maxHeight: 200, ...extraStyle }}
      value={value}
      onChange={e => { onChange(e); }}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      autoFocus={autoFocus}
      rows={1}
    />
  );
});

// ── JOURNAL MOOD SELECTOR ─────────────────────────────────────────────────

const MOODS = [
  { emoji: "\u{1F60A}", label: "Good" },
  { emoji: "\u{1F614}", label: "Sad" },
  { emoji: "\u{1F620}", label: "Frustrated" },
  { emoji: "\u{1F914}", label: "Reflective" },
  { emoji: "\u{1F4AA}", label: "Empowered" },
  { emoji: "\u{1F64F}", label: "Grateful" },
];

// ── JOURNAL COMPOSE ───────────────────────────────────────────────────────

function JournalCompose({ text, setText, mood, setMood, dimension, setDimension, loading, onSave, onCancel }) {
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = 'auto';
      textRef.current.style.height = Math.min(textRef.current.scrollHeight, 300) + 'px';
    }
  }, [text]);

  return (
    <div style={{
      borderTop: "1px solid var(--border)", padding: "1rem 1.5rem",
      background: "rgba(201,162,39,0.03)", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.75rem", opacity: 0.5, letterSpacing: "0.08em", textTransform: "uppercase" }}>Journal Entry</span>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "1rem" }}>×</button>
      </div>

      <textarea
        ref={textRef}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write freely — let whatever wants to come through, come through..."
        style={{
          ...styles.chatInput, width: "100%", resize: "none", minHeight: 80, maxHeight: 300,
          overflow: "hidden", marginBottom: "0.5rem",
        }}
        autoFocus
      />

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {MOODS.map(m => (
            <button key={m.emoji} onClick={() => setMood(mood === m.emoji ? null : m.emoji)}
              title={m.label}
              style={{
                background: mood === m.emoji ? "rgba(201,162,39,0.2)" : "transparent",
                border: mood === m.emoji ? "1px solid var(--gold)" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 4, width: 30, height: 30, fontSize: "0.85rem", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {m.emoji}
            </button>
          ))}
        </div>

        <select
          value={dimension || ""}
          onChange={e => setDimension(e.target.value || null)}
          style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
            borderRadius: 4, color: "var(--text)", fontFamily: "inherit", fontSize: "0.7rem",
            padding: "0.25rem 0.4rem", opacity: 0.7, cursor: "pointer",
          }}
        >
          <option value="">dimension (optional)</option>
          {DIMENSIONS.map(d => <option key={d.id} value={d.label}>{d.emoji} {d.label}</option>)}
        </select>

        <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem" }}>
          <button onClick={onSave} disabled={loading || !text.trim()} style={{
            ...styles.sendBtn, width: "auto", padding: "0.4rem 1rem",
            fontSize: "0.8rem", opacity: loading || !text.trim() ? 0.4 : 1,
          }}>
            {loading ? "..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── JOURNAL CARD (in-chat) ────────────────────────────────────────────────

function JournalPromptCard({ promptText, onRespond }) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = 'auto';
      textRef.current.style.height = Math.min(textRef.current.scrollHeight, 200) + 'px';
    }
  }, [text]);

  if (saved) {
    return (
      <div style={{
        margin: "0.5rem 0", padding: "0.75rem 1rem", borderRadius: 12,
        background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)",
        fontSize: "0.85rem", opacity: 0.7,
      }}>
        <span style={{ fontSize: "0.7rem", opacity: 0.5, letterSpacing: "0.05em" }}>JOURNAL ENTRY SAVED</span>
      </div>
    );
  }

  return (
    <div style={{
      margin: "0.5rem 0", padding: "1rem", borderRadius: 12,
      background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)",
    }}>
      <div style={{ fontSize: "0.7rem", opacity: 0.5, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
        Journal Prompt
      </div>
      <p style={{ fontSize: "0.9rem", marginBottom: "0.6rem", fontStyle: "italic", opacity: 0.85 }}>
        {promptText}
      </p>
      <textarea
        ref={textRef}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write here..."
        style={{
          ...styles.chatInput, width: "100%", resize: "none", minHeight: 60, maxHeight: 200,
          overflow: "hidden", marginBottom: "0.4rem", background: "rgba(255,255,255,0.04)",
        }}
      />
      <button
        onClick={() => { if (text.trim()) { onRespond(text, promptText); setSaved(true); } }}
        disabled={!text.trim()}
        style={{
          ...styles.sendBtn, width: "auto", padding: "0.3rem 0.8rem",
          fontSize: "0.75rem", opacity: !text.trim() ? 0.4 : 1,
        }}
      >
        Save entry
      </button>
    </div>
  );
}

// ── JOURNAL PANEL (sidebar overlay) ───────────────────────────────────────

function JournalPanel({ entries, open, onClose, onExport, onRequestReflection, cloudSyncStatus, syncingService, onSyncToCloud, onConnectCloud, onDisconnectCloud, authToken }) {
  const [expandedId, setExpandedId] = useState(null);
  const [reflectingId, setReflectingId] = useState(null);
  const [syncFeedback, setSyncFeedback] = useState(null);

  if (!open) return null;

  const showFeedback = (msg) => { setSyncFeedback(msg); setTimeout(() => setSyncFeedback(null), 3000); };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60, display: "flex", justifyContent: "flex-end",
    }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div style={{
        position: "relative", width: 380, maxWidth: "90vw", background: "var(--bg, #0e0c0a)",
        borderLeft: "1px solid var(--border)", overflowY: "auto", zIndex: 61,
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          padding: "1rem", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: "0.85rem", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>
            Journal ({entries.length})
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text)", fontSize: "1.2rem", cursor: "pointer" }}>×</button>
        </div>

        {syncFeedback && (
          <div style={{ fontSize: "0.7rem", padding: "0.4rem 1rem", background: "rgba(50,150,50,0.15)", color: "#86efac", textAlign: "center" }}>
            {syncFeedback}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
          {entries.length === 0 ? (
            <div style={{ padding: "2rem 1rem", textAlign: "center", opacity: 0.4, fontSize: "0.85rem" }}>
              No journal entries yet. Use the pencil button in chat to start writing.
            </div>
          ) : entries.map(e => {
            const isExpanded = expandedId === e.id;
            const date = e.createdAt ? new Date(e.createdAt + 'Z').toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            }) : '';
            return (
              <div key={e.id} onClick={() => setExpandedId(isExpanded ? null : e.id)} style={{
                padding: "0.75rem", margin: "0.25rem 0", borderRadius: 8, cursor: "pointer",
                background: isExpanded ? "rgba(201,162,39,0.06)" : "rgba(255,255,255,0.02)",
                border: isExpanded ? "1px solid rgba(201,162,39,0.15)" : "1px solid transparent",
                transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                  {e.mood && <span style={{ fontSize: "0.85rem" }}>{e.mood}</span>}
                  <span style={{ fontSize: "0.65rem", opacity: 0.4 }}>{date}</span>
                  {e.dimension && <span style={{ fontSize: "0.6rem", opacity: 0.35, marginLeft: "auto" }}>{e.dimension}</span>}
                </div>
                <div style={{
                  fontSize: "0.8rem", lineHeight: 1.5, opacity: 0.75,
                  ...(isExpanded ? { whiteSpace: "pre-wrap" } : {
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }),
                }}>
                  {e.content}
                </div>
                {isExpanded && e.prompt && (
                  <div style={{ fontSize: "0.7rem", opacity: 0.4, fontStyle: "italic", marginTop: "0.4rem" }}>
                    Prompt: {e.prompt}
                  </div>
                )}
                {isExpanded && e.aiReflection && (
                  <div style={{
                    fontSize: "0.75rem", marginTop: "0.5rem", padding: "0.5rem",
                    background: "rgba(201,162,39,0.05)", borderRadius: 6, lineHeight: 1.5,
                    border: "1px solid rgba(201,162,39,0.1)",
                  }}>
                    <span style={{ fontSize: "0.6rem", opacity: 0.4, letterSpacing: "0.05em" }}>REFLECTION</span>
                    <div style={{ marginTop: "0.2rem", whiteSpace: "pre-wrap" }}>{e.aiReflection}</div>
                  </div>
                )}
                {isExpanded && !e.aiReflection && (
                  <button
                    onClick={async (ev) => {
                      ev.stopPropagation();
                      setReflectingId(e.id);
                      const result = await onRequestReflection(e.id);
                      setReflectingId(null);
                      if (result?.error === 'subscription_required') {
                        showFeedback("Subscription required for AI reflections");
                      }
                    }}
                    disabled={reflectingId === e.id}
                    style={{
                      marginTop: "0.4rem", background: "none", border: "1px solid rgba(201,162,39,0.2)",
                      color: "var(--gold)", padding: "0.2rem 0.6rem", borderRadius: 4,
                      fontSize: "0.65rem", cursor: "pointer", fontFamily: "inherit",
                      opacity: reflectingId === e.id ? 0.4 : 0.7,
                    }}
                  >
                    {reflectingId === e.id ? "Reflecting..." : "Get AI reflection"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Sync & Export controls */}
        <div style={{ padding: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <div style={{ fontSize: "0.6rem", opacity: 0.3, letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center" }}>
            Sync & Backup
          </div>

          <button onClick={onExport} style={{
            background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
            padding: "0.3rem 0.6rem", borderRadius: 4, fontFamily: "inherit", fontSize: "0.65rem",
            cursor: "pointer", width: "100%", textAlign: "center",
          }}>
            Download journal (.md)
          </button>

          <div style={{ display: "flex", gap: "0.4rem" }}>
            {cloudSyncStatus.google ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <button onClick={async () => {
                  const r = await onSyncToCloud('google');
                  if (r?.success) showFeedback(`Synced ${r.entries} entries to Google Drive`);
                  else showFeedback(r?.error || 'Sync failed');
                }}
                disabled={syncingService === 'google'}
                style={{
                  background: "rgba(66,133,244,0.1)", border: "1px solid rgba(66,133,244,0.3)",
                  color: "#8ab4f8", padding: "0.3rem", borderRadius: 4, fontFamily: "inherit",
                  fontSize: "0.6rem", cursor: "pointer", opacity: syncingService === 'google' ? 0.4 : 1,
                }}>
                  {syncingService === 'google' ? 'Syncing...' : 'Sync Google Drive'}
                </button>
                <button onClick={() => onDisconnectCloud('google')} style={{
                  background: "none", border: "none", color: "rgba(255,255,255,0.2)",
                  fontSize: "0.55rem", cursor: "pointer", fontFamily: "inherit",
                }}>disconnect</button>
              </div>
            ) : (
              <button onClick={() => onConnectCloud('google')} style={{
                flex: 1, background: "none", border: "1px solid rgba(66,133,244,0.3)",
                color: "rgba(66,133,244,0.7)", padding: "0.3rem", borderRadius: 4,
                fontFamily: "inherit", fontSize: "0.6rem", cursor: "pointer",
              }}>
                Connect Google Drive
              </button>
            )}

            {cloudSyncStatus.dropbox ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <button onClick={async () => {
                  const r = await onSyncToCloud('dropbox');
                  if (r?.success) showFeedback(`Synced ${r.entries} entries to Dropbox`);
                  else showFeedback(r?.error || 'Sync failed');
                }}
                disabled={syncingService === 'dropbox'}
                style={{
                  background: "rgba(0,97,255,0.1)", border: "1px solid rgba(0,97,255,0.3)",
                  color: "#6ea8fe", padding: "0.3rem", borderRadius: 4, fontFamily: "inherit",
                  fontSize: "0.6rem", cursor: "pointer", opacity: syncingService === 'dropbox' ? 0.4 : 1,
                }}>
                  {syncingService === 'dropbox' ? 'Syncing...' : 'Sync Dropbox'}
                </button>
                <button onClick={() => onDisconnectCloud('dropbox')} style={{
                  background: "none", border: "none", color: "rgba(255,255,255,0.2)",
                  fontSize: "0.55rem", cursor: "pointer", fontFamily: "inherit",
                }}>disconnect</button>
              </div>
            ) : (
              <button onClick={() => onConnectCloud('dropbox')} style={{
                flex: 1, background: "none", border: "1px solid rgba(0,97,255,0.3)",
                color: "rgba(0,97,255,0.7)", padding: "0.3rem", borderRadius: 4,
                fontFamily: "inherit", fontSize: "0.6rem", cursor: "pointer",
              }}>
                Connect Dropbox
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscriptionManager({ authToken, subscription, onStatusChange }) {
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const isLifetime = subscription?.plan_type === 'onetime';
  const planLabel = isLifetime ? 'Lifetime Access' : '$4.99/mo';
  const statusLabel = subscription?.status === 'active' ? 'Active' : subscription?.status || 'Unknown';

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      });
      if (res.ok) {
        onStatusChange?.(null);
        setConfirmCancel(false);
      }
    } catch (e) { /* ignore */ }
    setCancelling(false);
  };

  return (
    <div style={{ padding: "0.75rem", borderTop: "1px solid var(--border)" }}>
      <div style={{ fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: "0.4rem" }}>
        SUBSCRIPTION
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", marginBottom: "0.3rem" }}>
        {planLabel} — <span style={{ color: statusLabel === 'Active' ? '#86efac' : '#fca5a5' }}>{statusLabel}</span>
      </div>
      {!isLifetime && subscription?.status === 'active' && (
        !confirmCancel ? (
          <button onClick={() => setConfirmCancel(true)} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.2)",
            fontFamily: "inherit", fontSize: "0.65rem", cursor: "pointer", padding: 0,
          }}>
            Cancel subscription
          </button>
        ) : (
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.3rem" }}>
            <button onClick={handleCancel} disabled={cancelling} style={{
              background: "rgba(200,50,50,0.12)", border: "1px solid rgba(200,50,50,0.35)",
              color: "#e05050", padding: "0.2rem 0.5rem", borderRadius: 4,
              fontFamily: "inherit", fontSize: "0.65rem", cursor: "pointer",
            }}>
              {cancelling ? '...' : 'Confirm'}
            </button>
            <button onClick={() => setConfirmCancel(false)} style={{
              background: "none", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.35)", padding: "0.2rem 0.5rem", borderRadius: 4,
              fontFamily: "inherit", fontSize: "0.65rem", cursor: "pointer",
            }}>
              Keep
            </button>
          </div>
        )
      )}
    </div>
  );
}

// ── SETTINGS PANEL ────────────────────────────────────────────────────────

function buildLocalExportMarkdown() {
  // Gather all localStorage data — works without auth
  let data = {};
  try {
    // Try the active session key first
    const raw = localStorage.getItem(activeSessionKey);
    if (raw) data = JSON.parse(raw);
    // Also check anonymous session if different
    if (activeSessionKey !== SESSION_KEY_ANON) {
      const anonRaw = localStorage.getItem(SESSION_KEY_ANON);
      if (anonRaw) data = { ...JSON.parse(anonRaw), ...data };
    }
  } catch {}

  const now = new Date().toISOString();
  let md = `# Healing Spiral — Session Export\n`;
  md += `**Exported:** ${new Date().toLocaleString()}\n\n`;

  // Scores
  if (data.scores) {
    md += `## Assessment Scores\n\n`;
    DIMENSIONS.forEach(d => {
      const score = data.scores[d.id];
      if (score !== undefined) {
        const tier = score <= 2 ? "Foundation" : score <= 4 ? "Developing" : "Growth Edge";
        md += `- ${d.emoji} **${d.label}**: ${score}/7 (${tier})\n`;
      }
    });
    md += `\n`;
  }

  // Assessment method
  if (data.assessmentMethod) {
    md += `**Assessment method:** ${data.assessmentMethod === 'socratic' ? 'Guided Conversation' : 'Self-Assessment'}\n\n`;
  }

  // Score rationale
  if (data.scoreRationale) {
    md += `## Assessment Rationale\n\n`;
    Object.entries(data.scoreRationale).forEach(([dim, rationale]) => {
      const d = DIMENSIONS.find(dd => dd.id === dim);
      if (d && rationale) md += `**${d.label}:** ${rationale}\n\n`;
    });
  }

  // Persona
  if (data.persona) {
    md += `**Coach voice:** ${data.persona.name || data.persona.id}\n\n`;
  }

  // Modalities
  if (data.userModalities?.length) {
    md += `## Selected Modalities\n\n`;
    data.userModalities.forEach(m => {
      md += `- ${MODS[m] || m}\n`;
    });
    if (data.userModalitiesOther) md += `- ${data.userModalitiesOther}\n`;
    md += `\n`;
  }

  // User context
  if (data.userContext) {
    md += `## User Context\n\n${data.userContext}\n\n`;
  }

  // Slider responses
  if (data.sliderResponses && Object.keys(data.sliderResponses).length) {
    md += `## Self-Assessment Responses\n\n`;
    Object.entries(data.sliderResponses).forEach(([dim, val]) => {
      const d = DIMENSIONS.find(dd => dd.id === dim);
      if (d) md += `- ${d.emoji} ${d.label}: ${val}/7\n`;
    });
    md += `\n`;
  }

  // Probing messages
  if (data.probingMessages?.length) {
    md += `## Deepening Conversation\n\n`;
    data.probingMessages.forEach(m => {
      const speaker = m.role === 'user' ? '**You**' : '**Coach**';
      md += `${speaker}: ${m.content}\n\n`;
    });
  }

  // Socratic messages
  if (data.socraticMessages?.length) {
    md += `## Guided Assessment Conversation\n\n`;
    data.socraticMessages.forEach(m => {
      const speaker = m.role === 'user' ? '**You**' : '**Coach**';
      // Strip hidden tokens from display
      const content = (m.content || '').replace(/\[SCORES:\{.*?\}\]/g, '').replace(/\[RATIONALE:\{.*?\}\]/g, '').trim();
      if (content) md += `${speaker}: ${content}\n\n`;
    });
  }

  // Chat messages
  if (data.chatMessages?.length) {
    md += `## Coaching Chat\n\n`;
    data.chatMessages.forEach(m => {
      const speaker = m.role === 'user' ? '**You**' : '**Coach**';
      const content = (m.content || '').replace(/\[JOURNAL_PROMPT:.*?\]/g, '').trim();
      if (content) md += `${speaker}: ${content}\n\n`;
    });
  }

  // Chat summary
  if (data.chatSummary) {
    md += `## Session Summary\n\n${data.chatSummary}\n\n`;
  }

  // Email
  if (data.email) {
    md += `**Email:** ${data.email}\n\n`;
  }

  md += `---\n*Exported from Healing Spiral on ${now}*\n`;
  return md;
}

function downloadLocalExport() {
  const md = buildLocalExportMarkdown();
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `healing-spiral-export-${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function SettingsPanel({ open, onClose, authToken, authSubscription, onSubscriptionChange, onClearData }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmServerDelete, setConfirmServerDelete] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const showFeedback = (msg, type = "info") => {
    setActionFeedback({ msg, type });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setPasswordMsg({ text: "Password must be at least 8 characters", type: "error" });
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg(null);
    try {
      const resp = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ currentPassword: currentPassword || undefined, newPassword }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed');
      setPasswordMsg({ text: "Password updated", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordMsg({ text: err.message, type: "error" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleExport = async () => {
    if (!authToken) { showFeedback("Sign in to export", "error"); return; }
    try {
      const resp = await fetch('/api/sessions/export', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (!resp.ok) throw new Error();
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `healing-spiral-export-${new Date().toISOString().split('T')[0]}.md`;
      a.click();
      URL.revokeObjectURL(url);
      showFeedback("Export downloaded", "success");
    } catch { showFeedback("Export failed", "error"); }
  };

  const handleServerDelete = async () => {
    if (!authToken) return;
    try {
      const resp = await fetch('/api/sessions/all', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error();
      setConfirmServerDelete(false);
      showFeedback(`Deleted ${data.deleted} session(s)`, "success");
    } catch { showFeedback("Delete failed", "error"); }
  };

  if (!open) return null;

  const inputStyle = {
    width: "100%", padding: "0.5rem 0.75rem", boxSizing: "border-box",
    background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)",
    borderRadius: 4, color: "var(--text)", fontSize: "0.85rem", fontFamily: "inherit", outline: "none",
  };
  const sectionLabel = {
    fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)", marginBottom: "0.5rem",
  };
  const btnStyle = {
    background: "none", border: "1px solid rgba(255,255,255,0.15)",
    color: "rgba(255,255,255,0.5)", padding: "0.4rem 0.75rem", borderRadius: 4,
    fontFamily: "inherit", fontSize: "0.75rem", cursor: "pointer", width: "100%", textAlign: "center",
    transition: "all 0.2s",
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100,
      }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 340, maxWidth: "90vw",
        background: "var(--bg)", borderLeft: "1px solid var(--border)", zIndex: 101,
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        <div style={{
          padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: "1rem", fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: "0.05em" }}>Settings</span>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--text)", fontSize: "1.2rem", cursor: "pointer",
          }}>x</button>
        </div>

        {actionFeedback && (
          <div style={{
            fontSize: "0.75rem", padding: "0.4rem 0.75rem", margin: "0.75rem 1.25rem 0", borderRadius: 4, textAlign: "center",
            background: actionFeedback.type === "error" ? "rgba(200,50,50,0.15)" : "rgba(50,150,50,0.15)",
            color: actionFeedback.type === "error" ? "#e05050" : "#86efac",
          }}>{actionFeedback.msg}</div>
        )}

        <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Password */}
          {authToken && (
            <div>
              <div style={sectionLabel}>Change Password</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <input type="password" placeholder="Current password" value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)} style={inputStyle} />
                <input type="password" placeholder="New password (min 8 chars)" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
                <button onClick={handleChangePassword} disabled={passwordLoading} style={{
                  ...btnStyle, opacity: passwordLoading ? 0.5 : 1,
                }}>
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
                {passwordMsg && (
                  <div style={{
                    fontSize: "0.75rem", textAlign: "center",
                    color: passwordMsg.type === "error" ? "#e05050" : "#86efac",
                  }}>{passwordMsg.text}</div>
                )}
              </div>
            </div>
          )}

          {/* Subscription / Billing */}
          {authSubscription && (
            <div>
              <div style={sectionLabel}>Subscription & Billing</div>
              <SubscriptionManager authToken={authToken} subscription={authSubscription} onStatusChange={onSubscriptionChange} />
            </div>
          )}

          {/* Data Management */}
          <div>
            <div style={sectionLabel}>Data Management</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <button onClick={() => { downloadLocalExport(); showFeedback("Export downloaded", "success"); }} style={{
                ...btnStyle, color: "var(--gold)", borderColor: "rgba(201,162,39,0.25)",
              }}>⬇ Download My Data (.md)</button>
              {authToken && <button onClick={handleExport} style={btnStyle}>Export Server Data (.md)</button>}
              {!confirmClear ? (
                <button onClick={() => setConfirmClear(true)} style={{
                  ...btnStyle, color: "rgba(255,255,255,0.3)",
                }}>Clear Local Data</button>
              ) : (
                <div>
                  {!authToken && (
                    <div style={{ fontSize: "0.7rem", color: "var(--gold)", marginBottom: "0.4rem", lineHeight: 1.4, textAlign: "center" }}>
                      💡 Create an account first to keep a backup of your data before clearing.
                    </div>
                  )}
                  <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", marginBottom: "0.4rem", textAlign: "center" }}>
                    A copy of your data will be downloaded automatically.
                  </div>
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    <button onClick={() => { onClearData?.(); setConfirmClear(false); }} style={{
                      ...btnStyle, color: "#e05050", borderColor: "rgba(200,50,50,0.35)", flex: 1,
                    }}>Confirm Clear</button>
                    <button onClick={() => setConfirmClear(false)} style={{ ...btnStyle, flex: 1 }}>Cancel</button>
                  </div>
                </div>
              )}
              {authToken && (
                !confirmServerDelete ? (
                  <button onClick={() => setConfirmServerDelete(true)} style={{
                    ...btnStyle, color: "rgba(200,50,50,0.5)", borderColor: "rgba(200,50,50,0.2)",
                  }}>Delete Server Data</button>
                ) : (
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    <button onClick={handleServerDelete} style={{
                      ...btnStyle, color: "#e05050", borderColor: "rgba(200,50,50,0.35)", flex: 1,
                      background: "rgba(200,50,50,0.08)",
                    }}>Confirm Delete</button>
                    <button onClick={() => setConfirmServerDelete(false)} style={{ ...btnStyle, flex: 1 }}>Cancel</button>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Profile Link */}
          <div>
            <div style={sectionLabel}>Your Profile</div>
            <a href="https://www.newpowerindustry.com/healingspiral/app" target="_blank" rel="noopener noreferrer" style={{
              ...btnStyle, display: "block", textDecoration: "none", color: "var(--gold)", borderColor: "rgba(201,162,39,0.2)",
            }}>
              View Full Profile on Web
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function ClearDataButton({ onClear, authToken }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmServerDelete, setConfirmServerDelete] = useState(false);
  const [summaryText, setSummaryText] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const showFeedback = (msg, type = "info") => {
    setActionFeedback({ msg, type });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleExport = async () => {
    if (!authToken) {
      showFeedback("Sign in to export your data", "error");
      return;
    }
    try {
      const resp = await fetch('/api/sessions/export', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `healing-spiral-export-${new Date().toISOString().split('T')[0]}.md`;
      a.click();
      URL.revokeObjectURL(url);
      showFeedback("Export downloaded", "success");
    } catch {
      showFeedback("Export failed", "error");
    }
  };

  const handleSummarize = async () => {
    if (!authToken) {
      showFeedback("Sign in to get a summary", "error");
      return;
    }
    setSummaryLoading(true);
    setSummaryText(null);
    try {
      const resp = await fetch('/api/sessions/summarize', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed');
      setSummaryText(data.summary);
    } catch {
      showFeedback("Summary failed", "error");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleServerDelete = async () => {
    if (!authToken) return;
    try {
      const resp = await fetch('/api/sessions/all', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error('Delete failed');
      setConfirmServerDelete(false);
      showFeedback(`Deleted ${data.deleted} session(s) from server`, "success");
    } catch {
      showFeedback("Server delete failed", "error");
    }
  };

  const btnStyle = {
    background: "none", border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.4)", padding: "0.3rem 0.6rem", borderRadius: 4,
    fontFamily: "inherit", fontSize: "0.65rem", cursor: "pointer",
    letterSpacing: "0.03em", transition: "all 0.2s", width: "100%", textAlign: "center",
  };
  const dangerBtnStyle = {
    ...btnStyle, color: "#e05050", borderColor: "rgba(200,50,50,0.35)",
    background: "rgba(200,50,50,0.08)",
  };

  return (
    <div style={{ marginTop: "auto", padding: "0.75rem", borderTop: "1px solid var(--border)" }}>
      {actionFeedback && (
        <div style={{
          fontSize: "0.65rem", padding: "0.3rem 0.5rem", marginBottom: "0.5rem", borderRadius: 4, textAlign: "center",
          background: actionFeedback.type === "error" ? "rgba(200,50,50,0.15)" : "rgba(50,150,50,0.15)",
          color: actionFeedback.type === "error" ? "#e05050" : "#86efac",
        }}>{actionFeedback.msg}</div>
      )}

      {!expanded ? (
        <button onClick={() => setExpanded(true)} style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.2)",
          fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "0.7rem",
          cursor: "pointer", letterSpacing: "0.05em", width: "100%", textAlign: "center",
        }}>
          Manage your data
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center", marginBottom: "0.15rem" }}>
            Your Data
          </div>

          <button onClick={handleExport} style={btnStyle}>
            Export context (.md)
          </button>

          <button onClick={handleSummarize} disabled={summaryLoading} style={{
            ...btnStyle, opacity: summaryLoading ? 0.5 : 1,
          }}>
            {summaryLoading ? "Generating..." : "AI journey summary"}
          </button>

          {summaryText && (
            <div style={{
              fontSize: "0.7rem", color: "rgba(255,255,255,0.6)", padding: "0.6rem",
              background: "rgba(255,255,255,0.03)", borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.08)", maxHeight: "12rem",
              overflowY: "auto", lineHeight: 1.5, whiteSpace: "pre-wrap",
            }}>
              {summaryText}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
                <button onClick={() => {
                  const md = `# Healing Spiral — AI Journey Summary\n\n**Generated:** ${new Date().toLocaleString()}\n\n${summaryText}\n\n---\n*Generated by Healing Spiral AI*\n`;
                  const blob = new Blob([md], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `healing-spiral-summary-${new Date().toISOString().split('T')[0]}.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                }} style={{
                  background: "none", border: "none",
                  color: "var(--gold)", fontSize: "0.6rem", cursor: "pointer",
                  fontFamily: "inherit", opacity: 0.7,
                }}>⬇ download</button>
                <button onClick={() => setSummaryText(null)} style={{
                  background: "none", border: "none",
                  color: "rgba(255,255,255,0.25)", fontSize: "0.6rem", cursor: "pointer",
                  fontFamily: "inherit",
                }}>dismiss</button>
              </div>
            </div>
          )}

          {!confirmClear ? (
            <button onClick={() => setConfirmClear(true)} style={dangerBtnStyle}>
              Reset & start fresh
            </button>
          ) : (
            <div style={{ textAlign: "center" }}>
              {!authToken && (
                <p style={{ fontSize: "0.65rem", color: "var(--gold)", margin: "0.25rem 0 0.4rem", lineHeight: 1.4 }}>
                  💡 Create an account first to keep a backup of your data before resetting.
                </p>
              )}
              <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", margin: "0.25rem 0" }}>
                Reset your profile? {authToken ? "Your data will be archived on the server." : "A copy will be downloaded automatically."}
              </p>
              <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                <button onClick={() => { onClear(); setConfirmClear(false); }} style={dangerBtnStyle}>Reset</button>
                <button onClick={() => setConfirmClear(false)} style={btnStyle}>Cancel</button>
              </div>
            </div>
          )}

          {authToken && (
            !confirmServerDelete ? (
              <button onClick={() => setConfirmServerDelete(true)} style={{
                ...dangerBtnStyle, marginTop: "0.25rem",
              }}>
                Delete all data from server
              </button>
            ) : (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "0.65rem", color: "#e05050", margin: "0.25rem 0" }}>
                  Permanently delete ALL sessions from the server? This cannot be undone.
                </p>
                <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                  <button onClick={handleServerDelete} style={dangerBtnStyle}>Delete permanently</button>
                  <button onClick={() => setConfirmServerDelete(false)} style={btnStyle}>Cancel</button>
                </div>
              </div>
            )
          )}

          <button onClick={() => { setExpanded(false); setSummaryText(null); setConfirmClear(false); setConfirmServerDelete(false); }} style={{
            ...btnStyle, border: "none", color: "rgba(255,255,255,0.2)", fontSize: "0.6rem",
            marginTop: "0.15rem",
          }}>
            close
          </button>
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

function renderMarkdown(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
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
        {renderMarkdown(content)}
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
    display: "flex", gap: "0.75rem", alignItems: "flex-end", flexShrink: 0,
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
    scrollbarWidth: "none", msOverflowStyle: "none",
  },
  sidebarHeader: {
    padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border)",
    display: "flex", alignItems: "center", gap: "0.5rem",
  },
  sidebarPersona: {
    padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border)",
    display: "flex", alignItems: "center", gap: "0.5rem",
  },
  sidebarSection: { padding: "0.5rem 0.75rem" },
  sidebarLabel: {
    fontSize: "0.6rem", letterSpacing: "0.12em", opacity: 0.4,
    textTransform: "uppercase", marginBottom: "0.4rem",
  },
  sidebarDimRow: {
    display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem",
  },
  sidebarBarBg: {
    flex: 1, height: 3, background: "rgba(255,255,255,0.08)",
    borderRadius: 2, overflow: "hidden",
  },
  sidebarMod: {
    fontSize: "0.7rem", opacity: 0.7, marginBottom: "0.25rem",
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
