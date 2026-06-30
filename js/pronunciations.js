// TTS-friendly respellings for words the browser's speechSynthesis voice
// tends to mispronounce on its own (irregular stress, foreign-derived
// spelling, etc). Keyed by lowercase word — only words that need a nudge
// belong here; everything else is spoken from its normal spelling.
// If you spot another mispronounced word, add it here using plain letters
// broken into hyphenated syllables (capitalize the stressed one).
const PRONUNCIATIONS = {
  penitent: "PEN-ih-tent",
  gauche: "GOHSH",
  brusque: "BRUHSK",
  quixotic: "kwik-SOT-ik",
  heinous: "HAY-nus",
  languor: "LANG-ger",
  querulous: "KWER-yuh-lus",
  impasse: "IM-pass",
  effigy: "EF-ih-jee",
  jocose: "joh-KOHSS",
  yeoman: "YOH-mun",
  abeyance: "uh-BAY-unss",
  raconteur: "rak-on-TUR",
  unctuous: "UNK-choo-us",
  malfeasance: "mal-FEE-zunss",
  misanthrope: "MISS-un-throhp",
  lambast: "lam-BAST",
  gravitas: "GRAV-ih-tahss",
  debris: "duh-BREE",
  naive: "nah-EEV",
  obstinate: "OB-stih-nit",
  subtle: "SUH-tul",
};
