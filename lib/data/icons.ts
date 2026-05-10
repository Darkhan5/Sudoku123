import type { CollectibleIcon, Rarity } from "@/types";

export const ICONS: CollectibleIcon[] = [
  { id: "falcon", emoji: "🦅", name: "Степной Сокол", rarity: "common" },
  { id: "snow_leopard", emoji: "🐆", name: "Снежный Барс", rarity: "rare" },
  { id: "yurt", emoji: "🏕️", name: "Юрта", rarity: "common" },
  { id: "brain", emoji: "🧠", name: "Аналитик", rarity: "common" },
  { id: "lightning", emoji: "⚡", name: "Молния", rarity: "common" },
  { id: "crown", emoji: "👑", name: "Корона", rarity: "epic" },
  { id: "diamond", emoji: "💎", name: "Алмаз", rarity: "rare" },
  { id: "fire", emoji: "🔥", name: "Огонь", rarity: "common" },
  { id: "star", emoji: "⭐", name: "Звезда", rarity: "common" },
  { id: "rocket", emoji: "🚀", name: "Ракета", rarity: "rare" },
  { id: "chess", emoji: "♟️", name: "Гроссмейстер", rarity: "rare" },
  { id: "infinity", emoji: "♾️", name: "Бесконечность", rarity: "epic" },
  { id: "oracle", emoji: "🔮", name: "Предсказатель", rarity: "epic" },
  { id: "trophy", emoji: "🏆", name: "Чемпион", rarity: "epic" }
];

export function getIconById(id: string): CollectibleIcon {
  return ICONS.find((icon) => icon.id === id) ?? ICONS[3];
}

export function rollIcon(ownedIds: string[], rng = Math.random): CollectibleIcon | null {
  if (rng() > 0.33) return null;

  const unowned = ICONS.filter((icon) => !ownedIds.includes(icon.id));
  if (unowned.length === 0) return null;

  const rarityRoll = rng();
  const rarity: Rarity = rarityRoll < 0.6 ? "common" : rarityRoll < 0.9 ? "rare" : "epic";
  const pool = unowned.filter((icon) => icon.rarity === rarity);
  const fallbackPool = pool.length > 0 ? pool : unowned;

  return fallbackPool[Math.floor(rng() * fallbackPool.length)];
}
