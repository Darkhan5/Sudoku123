import type { AccessibilityColors, AccessibilitySettings, ErrorCellPattern, ErrorCellTexture, NumberStyle, Settings, ThemeName } from "@/types";
import { safeJsonParse } from "@/lib/utils/date";

const SETTINGS_KEY = "sl_settings";
export const DEFAULT_ACCESSIBILITY_COLORS: AccessibilityColors = {
  error: "#b91c1c",
  selected: "#2563eb",
  hint: "#0f766e",
  related: "#64748b"
};

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  errorCell: {
    color: DEFAULT_ACCESSIBILITY_COLORS.error,
    texture: "diagonal",
    pattern: "warning"
  },
  selectedCell: {
    outlineColor: DEFAULT_ACCESSIBILITY_COLORS.selected,
    borderThickness: 4
  },
  relatedCells: {
    dottedTexture: true,
    highlightColor: DEFAULT_ACCESSIBILITY_COLORS.related
  }
};

const DEFAULT_SETTINGS: Settings = {
  theme: "standard",
  language: "ru",
  numberStyle: "classic",
  reducedMotion: false,
  screenShake: true,
  sound: true,
  accessibility: DEFAULT_ACCESSIBILITY,
  accessibilityColors: DEFAULT_ACCESSIBILITY_COLORS
};
const VALID_THEMES: ThemeName[] = ["standard", "diamond-white", "diamond-black", "diamond-felt", "cyber-grid", "library-ink"];
const VALID_NUMBER_STYLES: NumberStyle[] = ["classic", "neon", "pixel", "handwritten"];

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function normalizeAccessibilityColors(value: Partial<AccessibilityColors> | undefined): AccessibilityColors {
  return {
    error: normalizeColor(value?.error, DEFAULT_ACCESSIBILITY_COLORS.error),
    selected: normalizeColor(value?.selected, DEFAULT_ACCESSIBILITY_COLORS.selected),
    hint: normalizeColor(value?.hint, DEFAULT_ACCESSIBILITY_COLORS.hint),
    related: normalizeColor(value?.related, DEFAULT_ACCESSIBILITY_COLORS.related)
  };
}

function normalizeTexture(value: unknown): ErrorCellTexture {
  return value === "crosshatch" || value === "dots" || value === "diagonal" ? value : DEFAULT_ACCESSIBILITY.errorCell.texture;
}

function normalizePattern(value: unknown): ErrorCellPattern {
  return value === "corner" || value === "ring" || value === "warning" ? value : DEFAULT_ACCESSIBILITY.errorCell.pattern;
}

function normalizeBorderThickness(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(6, Math.max(2, Math.round(value))) : DEFAULT_ACCESSIBILITY.selectedCell.borderThickness;
}

function normalizeAccessibility(value: Partial<AccessibilitySettings> | undefined, legacyColors: AccessibilityColors): AccessibilitySettings {
  return {
    errorCell: {
      color: normalizeColor(value?.errorCell?.color, legacyColors.error),
      texture: normalizeTexture(value?.errorCell?.texture),
      pattern: normalizePattern(value?.errorCell?.pattern)
    },
    selectedCell: {
      outlineColor: normalizeColor(value?.selectedCell?.outlineColor, legacyColors.selected),
      borderThickness: normalizeBorderThickness(value?.selectedCell?.borderThickness)
    },
    relatedCells: {
      dottedTexture: value?.relatedCells?.dottedTexture ?? true,
      highlightColor: normalizeColor(value?.relatedCells?.highlightColor, legacyColors.related)
    }
  };
}

function colorsFromAccessibility(accessibility: AccessibilitySettings): AccessibilityColors {
  return {
    error: accessibility.errorCell.color,
    selected: accessibility.selectedCell.outlineColor,
    hint: DEFAULT_ACCESSIBILITY_COLORS.hint,
    related: accessibility.relatedCells.highlightColor
  };
}

function applyAccessibility(accessibility: AccessibilitySettings): void {
  if (typeof document === "undefined") return;
  const colors = colorsFromAccessibility(accessibility);
  document.documentElement.style.setProperty("--a11y-error", colors.error);
  document.documentElement.style.setProperty("--a11y-selected", colors.selected);
  document.documentElement.style.setProperty("--a11y-selected-width", `${accessibility.selectedCell.borderThickness}px`);
  document.documentElement.style.setProperty("--a11y-hint", colors.hint);
  document.documentElement.style.setProperty("--a11y-related", colors.related);
  document.documentElement.dataset.errorTexture = accessibility.errorCell.texture;
  document.documentElement.dataset.errorPattern = accessibility.errorCell.pattern;
  document.documentElement.dataset.relatedTexture = accessibility.relatedCells.dottedTexture ? "dots" : "solid";
}

export function getSettings(): Settings {
  if (!hasStorage()) return DEFAULT_SETTINGS;
  const stored = safeJsonParse<Partial<Settings>>(localStorage.getItem(SETTINGS_KEY), {});
  const theme = stored.theme && VALID_THEMES.includes(stored.theme) ? stored.theme : DEFAULT_SETTINGS.theme;
  const numberStyle =
    stored.numberStyle && VALID_NUMBER_STYLES.includes(stored.numberStyle) ? stored.numberStyle : DEFAULT_SETTINGS.numberStyle;
  const legacyColors = normalizeAccessibilityColors(stored.accessibilityColors);
  const accessibility = normalizeAccessibility(stored.accessibility, legacyColors);
  const accessibilityColors = colorsFromAccessibility(accessibility);
  return { ...DEFAULT_SETTINGS, ...stored, theme, numberStyle, accessibility, accessibilityColors };
}

export function saveSettings(settings: Partial<Settings>): Settings {
  const current = getSettings();
  const currentAccessibility = current.accessibility ?? DEFAULT_ACCESSIBILITY;
  const legacyColors = normalizeAccessibilityColors({
    ...current.accessibilityColors,
    ...settings.accessibilityColors
  });
  const accessibility = normalizeAccessibility(
    {
      ...currentAccessibility,
      ...settings.accessibility,
      errorCell: {
        ...currentAccessibility.errorCell,
        ...settings.accessibility?.errorCell
      },
      selectedCell: {
        ...currentAccessibility.selectedCell,
        ...settings.accessibility?.selectedCell
      },
      relatedCells: {
        ...currentAccessibility.relatedCells,
        ...settings.accessibility?.relatedCells
      }
    },
    legacyColors
  );
  const next = { ...current, ...settings, accessibility, accessibilityColors: colorsFromAccessibility(accessibility) };
  if (hasStorage()) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    document.documentElement.dataset.theme = next.theme;
    document.documentElement.dataset.motion = next.reducedMotion ? "reduced" : "full";
    document.documentElement.dataset.shake = next.screenShake === false ? "off" : "on";
    applyAccessibility(next.accessibility);
    window.dispatchEvent(new Event("sl:settings"));
  }
  return next;
}

export function setTheme(theme: ThemeName): Settings {
  return saveSettings({ theme });
}

export function setNumberStyle(numberStyle: NumberStyle): Settings {
  return saveSettings({ numberStyle });
}

export function setAccessibilitySettings(
  settings: Pick<Settings, "reducedMotion" | "screenShake" | "sound" | "accessibility">
): Settings {
  return saveSettings(settings);
}

export function setOrnamentMode(ornamentMode: boolean): Settings {
  return saveSettings({ ornamentMode });
}

export function markOrnamentIntroSeen(): Settings {
  return saveSettings({ ornamentIntroSeen: true });
}
