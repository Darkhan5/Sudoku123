import type { Settings, ThemeName } from "@/types";
import { safeJsonParse } from "@/lib/utils/date";

const SETTINGS_KEY = "sl_settings";
const DEFAULT_SETTINGS: Settings = { theme: "standard", language: "ru" };
const VALID_THEMES: ThemeName[] = ["standard", "diamond-white", "diamond-black", "diamond-felt"];

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getSettings(): Settings {
  if (!hasStorage()) return DEFAULT_SETTINGS;
  const stored = safeJsonParse<Partial<Settings>>(localStorage.getItem(SETTINGS_KEY), {});
  const theme = stored.theme && VALID_THEMES.includes(stored.theme) ? stored.theme : DEFAULT_SETTINGS.theme;
  return { ...DEFAULT_SETTINGS, ...stored, theme };
}

export function saveSettings(settings: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...settings };
  if (hasStorage()) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    document.documentElement.dataset.theme = next.theme;
    window.dispatchEvent(new Event("sl:settings"));
  }
  return next;
}

export function setTheme(theme: ThemeName): Settings {
  return saveSettings({ theme });
}

export function setOrnamentMode(ornamentMode: boolean): Settings {
  return saveSettings({ ornamentMode });
}

export function markOrnamentIntroSeen(): Settings {
  return saveSettings({ ornamentIntroSeen: true });
}
