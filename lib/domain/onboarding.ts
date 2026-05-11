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

export const DEFAULT_COUNTRY = "Казахстан";
export const DEFAULT_COUNTRY_CODE = "KZ";
export const DEFAULT_CITY = "Астана";

export const KAZAKHSTAN_CITIES = [
  "Актау",
  "Актобе",
  "Алматы",
  "Астана",
  "Атырау",
  "Жезказган",
  "Караганда",
  "Кокшетау",
  "Костанай",
  "Кызылорда",
  "Павлодар",
  "Петропавловск",
  "Рудный",
  "Семей",
  "Тараз",
  "Темиртау",
  "Туркестан",
  "Уральск",
  "Усть-Каменогорск",
  "Шымкент",
  "Экибастуз"
] as const;

const CITY_ALIASES: Record<string, string> = {
  aktau: "Актау",
  "aktau city": "Актау",
  актобе: "Актобе",
  aktobe: "Актобе",
  алматы: "Алматы",
  almaty: "Алматы",
  астана: "Астана",
  astana: "Астана",
  atyrau: "Атырау",
  атырау: "Атырау",
  zhezkazgan: "Жезказган",
  zhezqazghan: "Жезказган",
  jezqazgan: "Жезказган",
  jezqazğan: "Жезказган",
  жезказган: "Жезказган",
  караганда: "Караганда",
  karaganda: "Караганда",
  karagandy: "Караганда",
  kokshetau: "Кокшетау",
  кокшетау: "Кокшетау",
  kostanay: "Костанай",
  костанай: "Костанай",
  kyzylorda: "Кызылорда",
  кызылорда: "Кызылорда",
  pavlodar: "Павлодар",
  павлодар: "Павлодар",
  petropavl: "Петропавловск",
  petropavlovsk: "Петропавловск",
  петропавловск: "Петропавловск",
  rudnyy: "Рудный",
  rudny: "Рудный",
  рудный: "Рудный",
  semey: "Семей",
  семей: "Семей",
  taraz: "Тараз",
  тараз: "Тараз",
  temirtau: "Темиртау",
  темиртау: "Темиртау",
  turkestan: "Туркестан",
  туркестан: "Туркестан",
  oral: "Уральск",
  uralsk: "Уральск",
  уральск: "Уральск",
  "ust-kamenogorsk": "Усть-Каменогорск",
  "ust kamenogorsk": "Усть-Каменогорск",
  "ust'-kamenogorsk": "Усть-Каменогорск",
  "oskemen": "Усть-Каменогорск",
  "öskemen": "Усть-Каменогорск",
  "усть-каменогорск": "Усть-Каменогорск",
  шымкент: "Шымкент",
  shymkent: "Шымкент",
  ekibastuz: "Экибастуз",
  экибастуз: "Экибастуз"
};

export const COUNTRIES: CountryOption[] = [
  { name: DEFAULT_COUNTRY, code: DEFAULT_COUNTRY_CODE, aliases: ["Kazakhstan", "Всемирный", "Global", "World"] },
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

export function normalizeKazakhstanCityName(cityName: string): string | null {
  const city = cityName.trim();
  if (!city) return null;
  const direct = KAZAKHSTAN_CITIES.find((item) => item === city);
  if (direct) return direct;
  return CITY_ALIASES[city.toLowerCase()] ?? null;
}

export function validateOnboarding(input: OnboardingInput): OnboardingResult {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const rawCountry = typeof input.country === "string" && input.country.trim() ? input.country.trim() : DEFAULT_COUNTRY;
  const country = getCountryCode(rawCountry) ? rawCountry : DEFAULT_COUNTRY;
  const city = typeof input.city === "string" ? normalizeKazakhstanCityName(input.city) : null;
  const ageValue = typeof input.age === "number" ? input.age : Number(input.age);
  const errors: OnboardingErrors = {};

  if (name.length < 2) errors.name = "Имя должно быть не короче 2 символов.";
  if (!Number.isInteger(ageValue) || ageValue < 13 || ageValue > 120) errors.age = "Возраст должен быть от 13 до 120.";

  const countryCode = getCountryCode(country) ?? DEFAULT_COUNTRY_CODE;
  if (!city) errors.city = "Выбери город из списка.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    countryCode,
    profile: {
      name,
      age: ageValue,
      country: normalizeCountryName(country),
      city: city ?? DEFAULT_CITY
    }
  };
}
