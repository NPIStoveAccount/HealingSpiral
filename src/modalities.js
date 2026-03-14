// ── Shared Modality Catalog ─────────────────────────────────────────────
// Single source of truth for modality names and categories.
// Imported by both HealingSpiralCoach.jsx and HealingSpiralApp.jsx.

export const MODS = {
  step12:"12-Step Programs",ifs:"IFS",gestalt:"Gestalt",se:"Somatic Experiencing",
  sm:"Sensorimotor Psychotherapy",biocore:"Bioenergetics / Core Energetics",
  rc:"RC (Re-evaluation Counseling)",tre:"TRE",men:"Men/Women Group Therapy",
  talk:"Talk Therapy",cbt:"CBT",dbt:"DBT",act:"ACT",
  jung:"Jungian Analysis",psychodyn:"Psychoanalysis / Psychodynamic",
  istdp:"ISTDP",emdr:"EMDR / Brainspotting",hakomi:"Hakomi",
  emres:"EmRes",nlp:"NLP",hypno:"Hypnotherapy",
  art:"Art Therapy",music:"Music / Voice Work",drama:"Drama Therapy",
  nfb:"Neurofeedback",circ:"Circling / Relatefulness",
  nvc:"NVC",eft:"EFT (Couples)",grpther:"Group Therapy (Process)",
  fam:"Family Constellations",cuddle:"Cuddle Therapy",forum:"Forum / LGAT",
  exkink:"Existential Kink",maha:"Mahamudra",vip:"Vipassana",zen:"Zen",
  dzog:"Dzogchen",adv:"Advaita Vedanta",real:"Realization Process",
  cenpr:"Centering Prayer",sufi:"Sufism / Whirling",kirtan:"Kirtan / Chanting",
  yoga:"Yoga / Yoga Nidra",kundy:"Kundalini Yoga",hrid:"Hridaya Yoga",
  taichi:"Tai Chi / Qigong",martial:"Martial Arts (Internal)",
  ci:"Contact Improvisation",rhythms:"5Rhythms / Ecstatic Dance",
  feld:"Feldenkrais / Alexander",rolf:"Rolfing / Structural Integration",
  cranio:"Craniosacral Therapy",massage:"Massage / Bodywork",
  acu:"Acupuncture / TCM",plant:"Plant Medicine",holo:"Holotropic Breathwork",
  wimhof:"Wim Hof Method",nature:"Deep Nature Connection",
  vision:"Vision Quest",sweat:"Sweat Lodge",hoop:"Ho'oponopono",
  float:"Float Tanks",vns:"Vagus Nerve Stimulation",ket:"Ketamine Therapy",
};

export const MOD_CATEGORIES = {
  "Somatic & Body-Based": ["se","sm","biocore","tre","feld","rolf","cranio","massage","acu","ci","rhythms","wimhof","vns","float"],
  "Talk & Cognitive": ["talk","cbt","dbt","act","istdp","nlp","psychodyn"],
  "Parts & Depth Psychology": ["ifs","gestalt","jung","hakomi","emdr","emres","hypno","nfb"],
  "Relational & Group": ["rc","men","circ","nvc","eft","grpther","cuddle","fam","forum","step12"],
  "Expressive & Creative": ["art","music","drama","exkink"],
  "Contemplative & Spiritual": ["maha","vip","zen","dzog","adv","real","cenpr","sufi","kirtan","hrid","hoop"],
  "Movement & Embodiment": ["yoga","kundy","taichi","martial"],
  "Altered States & Plant Medicine": ["plant","holo","ket"],
  "Nature & Wilderness": ["nature","vision","sweat"],
};

export const MOD_KEYS = Object.keys(MODS).sort((a, b) => MODS[a].localeCompare(MODS[b]));
