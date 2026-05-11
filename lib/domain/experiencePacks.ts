import type { ThemeName } from "../../types";

export interface ExperiencePack {
  id: ThemeName;
  name: string;
  description: string;
  access: "free" | "sudoku-pass";
  layers: {
    board: string;
    digits: string;
    fillAnimation: string;
    sound: string;
    backdrop: string;
    accent: string;
    victory: string;
  };
}

export const EXPERIENCE_PACKS: Record<ThemeName, ExperiencePack> = {
  standard: {
    id: "standard",
    name: "Стандарт",
    description: "Чистое соревновательное поле без лишних эффектов.",
    access: "free",
    layers: {
      board: "classic-white",
      digits: "classic",
      fillAnimation: "digit-pop",
      sound: "soft-sine",
      backdrop: "quiet-light",
      accent: "violet",
      victory: "complete-pulse"
    }
  },
  "diamond-white": {
    id: "diamond-white",
    name: "Белое поле",
    description: "Светлое премиум-поле с четким контрастом.",
    access: "sudoku-pass",
    layers: {
      board: "white-premium",
      digits: "classic",
      fillAnimation: "digit-pop",
      sound: "soft-sine",
      backdrop: "quiet-light",
      accent: "cyan",
      victory: "complete-pulse"
    }
  },
  "diamond-black": {
    id: "diamond-black",
    name: "Черное поле",
    description: "Темное контрастное поле для спокойной концентрации.",
    access: "sudoku-pass",
    layers: {
      board: "black-premium",
      digits: "neon",
      fillAnimation: "digit-pop",
      sound: "soft-sine",
      backdrop: "dark",
      accent: "cyan",
      victory: "complete-pulse"
    }
  },
  "diamond-felt": {
    id: "diamond-felt",
    name: "Фетровое поле",
    description: "Теплое поле с мягкими премиум-тонами.",
    access: "sudoku-pass",
    layers: {
      board: "felt",
      digits: "handwritten",
      fillAnimation: "digit-pop",
      sound: "soft-sine",
      backdrop: "warm",
      accent: "teal",
      victory: "complete-pulse"
    }
  },
  "cyber-grid": {
    id: "cyber-grid",
    name: "Кибер-сетка",
    description: "Темная sci-fi атмосфера со сканированием клеток и электрическим акцентом.",
    access: "sudoku-pass",
    layers: {
      board: "dark-grid",
      digits: "digital-scan",
      fillAnimation: "electric-flicker",
      sound: "quiet-electric",
      backdrop: "moving-grid-particles",
      accent: "blue-neon",
      victory: "neon-pulse"
    }
  },
  "library-ink": {
    id: "library-ink",
    name: "Библиотечные чернила",
    description: "Теплая библиотечная атмосфера с бумажной текстурой и чернильной анимацией.",
    access: "sudoku-pass",
    layers: {
      board: "paper-ink",
      digits: "pen-written",
      fillAnimation: "ink-spread",
      sound: "page-asmr",
      backdrop: "blurred-shelves-dust",
      accent: "warm-gold",
      victory: "ink-ripple"
    }
  }
};

export function getExperiencePack(theme: ThemeName): ExperiencePack {
  return EXPERIENCE_PACKS[theme] ?? EXPERIENCE_PACKS.standard;
}

export function getExperiencePackCatalog(): ExperiencePack[] {
  return Object.values(EXPERIENCE_PACKS);
}

export function getPremiumExperiencePacks(): ExperiencePack[] {
  return getExperiencePackCatalog().filter((pack) => pack.access === "sudoku-pass");
}
