"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AccessibilitySettings, ErrorCellPattern, ErrorCellTexture, NumberStyle, Player, Settings, ThemeName } from "@/types";
import { PlayerCard } from "@/components/profile/PlayerCard";
import { DiamondModal } from "@/components/ui/DiamondModal";
import { DiamondGlyph } from "@/components/ui/DiamondGlyph";
import { NUMBER_PACKS, isNumberPackUnlocked } from "@/lib/domain/cosmetics";
import { getThemeReward } from "@/lib/domain/sudokuPass";
import { canUseTheme, getThemeCatalog } from "@/lib/domain/subscription";
import { KAZAKHSTAN_CITIES } from "@/lib/domain/onboarding";
import { spendDiamonds } from "@/lib/storage/economy";
import { getPlayer, initPlayer, updatePlayer } from "@/lib/storage/player";
import { canUseExperiencePack } from "@/lib/storage/sudokuPass";
import { getSettings, setAccessibilitySettings, setNumberStyle, setTheme } from "@/lib/storage/settings";

const DIAMOND_THEMES = getThemeCatalog();

const ERROR_TEXTURES: Array<{ value: ErrorCellTexture; label: string }> = [
  { value: "diagonal", label: "Диагональ" },
  { value: "crosshatch", label: "Сетка" },
  { value: "dots", label: "Точки" }
];

const ERROR_PATTERNS: Array<{ value: ErrorCellPattern; label: string }> = [
  { value: "warning", label: "Метка !" },
  { value: "corner", label: "Уголки" },
  { value: "ring", label: "Кольцо" }
];

function passThemePath(theme: ThemeName): string {
  return `/pass?theme=${encodeURIComponent(theme)}`;
}

function accessibilitySettings(settings: Settings): AccessibilitySettings {
  return (
    settings.accessibility ?? {
      errorCell: {
        color: settings.accessibilityColors?.error ?? "#b91c1c",
        texture: "diagonal",
        pattern: "warning"
      },
      selectedCell: {
        outlineColor: settings.accessibilityColors?.selected ?? "#2563eb",
        borderThickness: 4
      },
      relatedCells: {
        dottedTexture: true,
        highlightColor: settings.accessibilityColors?.related ?? "#64748b"
      }
    }
  );
}

interface PackDialog {
  type: "confirm" | "insufficient";
  packId: NumberStyle;
  name: string;
  cost: number;
  current: number;
}

interface AccessibilityPatch {
  reducedMotion?: boolean;
  screenShake?: boolean;
  sound?: boolean;
  accessibility?: {
    errorCell?: Partial<AccessibilitySettings["errorCell"]>;
    selectedCell?: Partial<AccessibilitySettings["selectedCell"]>;
    relatedCells?: Partial<AccessibilitySettings["relatedCells"]>;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [settings, setSettingsState] = useState<Settings | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [theme, setThemeState] = useState<ThemeName>("standard");
  const [diamondOpen, setDiamondOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [packDialog, setPackDialog] = useState<PackDialog | null>(null);

  useEffect(() => {
    const next = getPlayer() ?? initPlayer();
    const nextSettings = getSettings();
    setPlayer(next);
    setDraftName(next.name);
    setThemeState(nextSettings.theme);
    setSettingsState(nextSettings);
  }, []);

  const ownedPacks = useMemo<NumberStyle[]>(() => player?.ownedNumberPacks ?? ["classic"], [player]);

  function syncPlayer() {
    setPlayer(getPlayer() ?? initPlayer());
  }

  function saveName() {
    if (!player) return;
    const name = draftName.trim() || "Игрок";
    setPlayer(updatePlayer({ name }));
    setEditingName(false);
  }

  function handleNameKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") saveName();
    if (event.key === "Escape" && player) {
      setDraftName(player.name);
      setEditingName(false);
    }
  }

  function updateProfile(partial: Partial<Player>) {
    setPlayer(updatePlayer(partial));
  }

  function chooseTheme(nextTheme: ThemeName) {
    if (!player) return;
    if (!canUseTheme(player.plan, nextTheme) || !canUseExperiencePack(nextTheme)) {
      const passReward = getThemeReward(nextTheme);
      if (passReward) {
        router.push(passThemePath(nextTheme));
        return;
      }
      setDiamondOpen(true);
      return;
    }
    setThemeState(setTheme(nextTheme).theme);
  }

  function chooseNumberStyle(packId: NumberStyle) {
    if (!player) return;
    const pack = NUMBER_PACKS.find((item) => item.id === packId);
    if (!pack) return;

    if (isNumberPackUnlocked(player.ownedNumberPacks, packId)) {
      const nextSettings = setNumberStyle(packId);
      setSettingsState(nextSettings);
      updateProfile({ numberStyle: packId });
      return;
    }

    if (player.diamonds < pack.requiredDiamonds) {
      setPackDialog({
        type: "insufficient",
        packId,
        name: pack.name,
        cost: pack.requiredDiamonds,
        current: player.diamonds
      });
      return;
    }

    setPackDialog({
      type: "confirm",
      packId,
      name: pack.name,
      cost: pack.requiredDiamonds,
      current: player.diamonds
    });
  }

  function confirmPackUnlock() {
    if (!packDialog || packDialog.type !== "confirm" || !player) return;
    if (!spendDiamonds(packDialog.cost)) {
      setPackDialog({ ...packDialog, type: "insufficient", current: getPlayer()?.diamonds ?? 0 });
      return;
    }
    const current = getPlayer() ?? player;
    const owned = Array.from(new Set([...(current.ownedNumberPacks ?? ["classic"]), packDialog.packId]));
    const updated = updatePlayer({ ownedNumberPacks: owned, numberStyle: packDialog.packId });
    setSettingsState(setNumberStyle(packDialog.packId));
    setPlayer(updated);
    setPackDialog(null);
  }

  function updateAccessibility(partial: AccessibilityPatch) {
    const current = settings ?? getSettings();
    setSettingsState(
      setAccessibilitySettings({
        reducedMotion: partial.reducedMotion ?? current.reducedMotion ?? false,
        screenShake: partial.screenShake ?? current.screenShake ?? true,
        sound: partial.sound ?? current.sound ?? true,
        accessibility: {
          ...accessibilitySettings(current),
          ...(partial.accessibility ?? {}),
          errorCell: {
            ...accessibilitySettings(current).errorCell,
            ...partial.accessibility?.errorCell
          },
          selectedCell: {
            ...accessibilitySettings(current).selectedCell,
            ...partial.accessibility?.selectedCell
          },
          relatedCells: {
            ...accessibilitySettings(current).relatedCells,
            ...partial.accessibility?.relatedCells
          }
        }
      })
    );
  }

  if (!player || !settings) {
    return <main className="page-shell">Загружаем профиль...</main>;
  }

  return (
    <main className="page-shell">
      <PlayerCard player={player} />

      <section className="info-panel">
        <h2 className="text-lg font-bold text-slate-950">Профиль игрока</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Имя
            {editingName ? (
              <input
                className="input-control"
                value={draftName}
                autoFocus
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={handleNameKey}
                onBlur={saveName}
              />
            ) : (
              <button type="button" className="editable-field" onClick={() => setEditingName(true)}>
                {player.name}
              </button>
            )}
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Возраст
            <input
              className="input-control"
              type="number"
              min={13}
              max={120}
              value={player.age ?? ""}
              onChange={(event) => updateProfile({ age: Number(event.target.value) || undefined })}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Город
            <select className="input-control" value={player.city} onChange={(event) => updateProfile({ city: event.target.value })}>
              {KAZAKHSTAN_CITIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="info-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Магазин</p>
            <h2 className="text-lg font-bold text-slate-950">Паки цифр</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-black">
            <span className="diamond-wallet-cost">
              <DiamondGlyph className="diamond-glyph-xs" />
              {player.diamonds}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NUMBER_PACKS.map((pack) => {
            const unlocked = isNumberPackUnlocked(ownedPacks, pack.id);
            const active = settings.numberStyle === pack.id;
            return (
              <button
                key={pack.id}
                type="button"
                className={`cosmetic-choice number-style-${pack.id} ${active ? "cosmetic-choice-active" : ""} ${unlocked ? "" : "cosmetic-choice-locked"}`}
                onClick={() => chooseNumberStyle(pack.id)}
                aria-pressed={active}
              >
                <span className="pack-preview">
                  <strong className="digit">123</strong>
                  {!unlocked ? <span className="pack-lock" aria-hidden>🔒</span> : null}
                </span>
                <strong>{pack.name}</strong>
                <span>{pack.description}</span>
                <small>
                  {unlocked ? "✓ Куплено" : `Открыть за ${pack.requiredDiamonds} 💎`}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="info-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="diamond-section-icon" aria-hidden>
              <DiamondGlyph />
            </span>
            <h2 className="text-lg font-bold text-slate-950">Премиум-подписка</h2>
          </div>
          <button type="button" className="btn-secondary" onClick={() => setDiamondOpen(true)} aria-label="Открыть премиум-подписку">
            <DiamondGlyph className="diamond-glyph-sm" />
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {DIAMOND_THEMES.map((item) => {
            const locked = !canUseTheme(player.plan, item.id) || !canUseExperiencePack(item.id);
            const passReward = getThemeReward(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`theme-option ${theme === item.id ? "theme-option-active" : ""}`}
                onClick={() => chooseTheme(item.id)}
                title={locked && passReward ? `Награда Судоку Пасса: ${passReward.level} уровень премиум-трека` : locked ? "Доступно с премиум-подпиской" : item.description}
              >
                <span className="block">{item.name}</span>
                <span className="block text-[11px] font-semibold text-slate-400">{locked && passReward ? `${passReward.level} уровень в Пассе` : locked ? "Закрыто" : "Открыто"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="info-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Доступность</p>
            <h2 className="text-lg font-bold text-slate-950">Настройки доступности</h2>
          </div>
          <button type="button" className="btn-primary" onClick={() => setAccessibilityOpen(true)}>
            Открыть настройки
          </button>
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          Ошибки, выбранная клетка и связанные клетки отмечаются цветом, рамкой и текстурой, чтобы игра оставалась читаемой даже без цвета.
        </p>
      </section>

      <DiamondModal
        open={diamondOpen}
        onClose={() => setDiamondOpen(false)}
        onUpgrade={() => {
          syncPlayer();
        }}
      />

      {accessibilityOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setAccessibilityOpen(false)}>
          <section className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Настройки доступности">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-primary">Настройки доступности</p>
                <h2 className="text-2xl font-black text-slate-950">Настройки доступности</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setAccessibilityOpen(false)} aria-label="Закрыть настройки">
                x
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <section className="accessibility-card">
                <h3>Ошибочная клетка</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <label>
                    Цвет
                    <input
                      type="color"
                      value={accessibilitySettings(settings).errorCell.color}
                      onChange={(event) =>
                        updateAccessibility({
                          accessibility: {
                            errorCell: { ...accessibilitySettings(settings).errorCell, color: event.target.value }
                          }
                        })
                      }
                    />
                  </label>
                  <label>
                    Текстура
                    <select
                      className="select-control"
                      value={accessibilitySettings(settings).errorCell.texture}
                      onChange={(event) =>
                        updateAccessibility({
                          accessibility: {
                            errorCell: { ...accessibilitySettings(settings).errorCell, texture: event.target.value as ErrorCellTexture }
                          }
                        })
                      }
                    >
                      {ERROR_TEXTURES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Паттерн
                    <select
                      className="select-control"
                      value={accessibilitySettings(settings).errorCell.pattern}
                      onChange={(event) =>
                        updateAccessibility({
                          accessibility: {
                            errorCell: { ...accessibilitySettings(settings).errorCell, pattern: event.target.value as ErrorCellPattern }
                          }
                        })
                      }
                    >
                      {ERROR_PATTERNS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="accessibility-card">
                <h3>Выбранная клетка</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <label>
                    Цвет рамки
                    <input
                      type="color"
                      value={accessibilitySettings(settings).selectedCell.outlineColor}
                      onChange={(event) =>
                        updateAccessibility({
                          accessibility: {
                            selectedCell: { ...accessibilitySettings(settings).selectedCell, outlineColor: event.target.value }
                          }
                        })
                      }
                    />
                  </label>
                  <label>
                    Толщина рамки: {accessibilitySettings(settings).selectedCell.borderThickness}px
                    <input
                      type="range"
                      min={2}
                      max={6}
                      value={accessibilitySettings(settings).selectedCell.borderThickness}
                      onChange={(event) =>
                        updateAccessibility({
                          accessibility: {
                            selectedCell: { ...accessibilitySettings(settings).selectedCell, borderThickness: Number(event.target.value) }
                          }
                        })
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="accessibility-card">
                <h3>Связанные клетки</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <label>
                    Цвет подсветки
                    <input
                      type="color"
                      value={accessibilitySettings(settings).relatedCells.highlightColor}
                      onChange={(event) =>
                        updateAccessibility({
                          accessibility: {
                            relatedCells: { ...accessibilitySettings(settings).relatedCells, highlightColor: event.target.value }
                          }
                        })
                      }
                    />
                  </label>
                  <label className="setting-toggle">
                    <span>Точечная текстура</span>
                    <input
                      type="checkbox"
                      checked={accessibilitySettings(settings).relatedCells.dottedTexture}
                      onChange={(event) =>
                        updateAccessibility({
                          accessibility: {
                            relatedCells: { ...accessibilitySettings(settings).relatedCells, dottedTexture: event.target.checked }
                          }
                        })
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="accessibility-card">
                <h3>Тряска экрана</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="setting-toggle">
                    <span>Лёгкая тряска</span>
                    <input type="checkbox" checked={Boolean(settings.screenShake)} onChange={(event) => updateAccessibility({ screenShake: event.target.checked })} />
                  </label>
                  <label className="setting-toggle">
                    <span>Уменьшить движение</span>
                    <input type="checkbox" checked={Boolean(settings.reducedMotion)} onChange={(event) => updateAccessibility({ reducedMotion: event.target.checked })} />
                  </label>
                  <label className="setting-toggle">
                    <span>Звук</span>
                    <input type="checkbox" checked={Boolean(settings.sound)} onChange={(event) => updateAccessibility({ sound: event.target.checked })} />
                  </label>
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {packDialog ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <section className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl" role="dialog" aria-modal="true">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cyan-50 text-2xl">{packDialog.type === "confirm" ? "🔓" : "!"}</div>
            <h2 className="mt-3 text-xl font-black text-slate-950">
              {packDialog.type === "confirm" ? `Открыть ${packDialog.name}?` : "Недостаточно алмазов"}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Нужно: {packDialog.cost} 💎
              <br />
              У вас: {packDialog.current} 💎
            </p>
            <div className="mt-5 grid gap-2">
              {packDialog.type === "confirm" ? (
                <button type="button" className="btn-primary" onClick={confirmPackUnlock}>
                  Подтвердить
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setPackDialog(null);
                    setDiamondOpen(true);
                  }}
                >
                  Получить алмазы
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={() => setPackDialog(null)}>
                Закрыть
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
