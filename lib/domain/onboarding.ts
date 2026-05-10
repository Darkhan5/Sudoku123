export interface CountryOption {
  name: string;
  code: string;
  aliases?: string[];
}

export interface OnboardingProfile {
  name: string;
  age: number;
  country: string;
  city: string;
}

export interface OnboardingInput {
  name?: unknown;
  age?: unknown;
  country?: unknown;
  city?: unknown;
}

export type OnboardingErrors = Partial<Record<keyof OnboardingProfile, string>>;

export type OnboardingResult =
  | { ok: true; profile: OnboardingProfile; countryCode: string }
  | { ok: false; errors: OnboardingErrors };

export const CITY_INPUT_AUTOCOMPLETE = "off";
export const DEFAULT_COUNTRY = "Всемирный";
export const DEFAULT_COUNTRY_CODE = "UN";

export const COUNTRIES: CountryOption[] = [
  { name: DEFAULT_COUNTRY, code: DEFAULT_COUNTRY_CODE, aliases: ["Global", "World"] },
  { name: "Казахстан", code: "KZ", aliases: ["Kazakhstan"] },
  { name: "США", code: "US", aliases: ["United States"] },
  { name: "Канада", code: "CA", aliases: ["Canada"] },
  { name: "Великобритания", code: "GB", aliases: ["United Kingdom"] },
  { name: "Германия", code: "DE", aliases: ["Germany"] },
  { name: "Франция", code: "FR", aliases: ["France"] },
  { name: "Турция", code: "TR", aliases: ["Turkey"] },
  { name: "ОАЭ", code: "AE", aliases: ["United Arab Emirates"] },
  { name: "Индия", code: "IN", aliases: ["India"] },
  { name: "Япония", code: "JP", aliases: ["Japan"] },
  { name: "Южная Корея", code: "KR", aliases: ["South Korea"] },
  { name: "Австралия", code: "AU", aliases: ["Australia"] },
  { name: "Бразилия", code: "BR", aliases: ["Brazil"] }
];

export function needsOnboarding(profile: Partial<OnboardingProfile> | null | undefined): boolean {
  if (!profile) return true;
  return !validateOnboarding(profile).ok;
}

export function getCountryCode(countryName: string): string | null {
  return (
    COUNTRIES.find((country) => country.name === countryName || country.aliases?.includes(countryName))?.code ?? null
  );
}

export function normalizeCountryName(countryName: string): string {
  return COUNTRIES.find((country) => country.name === countryName || country.aliases?.includes(countryName))?.name ?? countryName;
}

export function validateOnboarding(input: OnboardingInput): OnboardingResult {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const rawCountry = typeof input.country === "string" && input.country.trim() ? input.country.trim() : DEFAULT_COUNTRY;
  const country = getCountryCode(rawCountry) ? rawCountry : DEFAULT_COUNTRY;
  const city = typeof input.city === "string" ? input.city.trim() : "";
  const ageValue = typeof input.age === "number" ? input.age : Number(input.age);
  const errors: OnboardingErrors = {};

  if (name.length < 2) errors.name = "Имя должно быть не короче 2 символов.";
  if (!Number.isInteger(ageValue) || ageValue < 13 || ageValue > 120) errors.age = "Возраст должен быть от 13 до 120.";

  const countryCode = getCountryCode(country) ?? DEFAULT_COUNTRY_CODE;
  if (!city) errors.city = "Город обязателен.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    countryCode,
    profile: {
      name,
      age: ageValue,
      country: normalizeCountryName(country),
      city
    }
  };
}
