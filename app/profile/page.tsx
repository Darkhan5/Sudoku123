"use client";

import { KeyboardEvent, useEffect, useState } from "react";
import type { Player, ThemeName } from "@/types";
import { PlayerCard } from "@/components/profile/PlayerCard";
import { DiamondModal } from "@/components/ui/DiamondModal";
import { canUseTheme, getThemeCatalog } from "@/lib/domain/subscription";
import { CITY_INPUT_AUTOCOMPLETE, COUNTRIES, getCountryCode } from "@/lib/domain/onboarding";
import { getPlayer, initPlayer, updatePlayer } from "@/lib/storage/player";
import { getSettings, setTheme } from "@/lib/storage/settings";

const DIAMOND_THEMES = getThemeCatalog();

export default function ProfilePage() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [theme, setThemeState] = useState<ThemeName>("standard");
  const [diamondOpen, setDiamondOpen] = useState(false);

  useEffect(() => {
    const next = getPlayer() ?? initPlayer();
    setPlayer(next);
    setDraftName(next.name);
    setThemeState(getSettings().theme);
  }, []);

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
    if (!canUseTheme(player.plan, nextTheme)) {
      setDiamondOpen(true);
      return;
    }
    setThemeState(setTheme(nextTheme).theme);
  }

  if (!player) {
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
            Страна
            <select
              className="select-control w-full"
              value={player.country}
              onChange={(event) => updateProfile({ country: event.target.value, countryCode: getCountryCode(event.target.value) ?? "KZ" })}
            >
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.name}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Город
            <input
              className="input-control"
              value={player.city}
              autoComplete={CITY_INPUT_AUTOCOMPLETE}
              onChange={(event) => updateProfile({ city: event.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="info-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Diamond</p>
            <h2 className="text-lg font-bold text-slate-950">Премиум-подписка</h2>
          </div>
          <button type="button" className="btn-secondary" onClick={() => setDiamondOpen(true)}>
            Diamond
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {DIAMOND_THEMES.map((item) => {
            const locked = !canUseTheme(player.plan, item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`theme-option ${theme === item.id ? "theme-option-active" : ""}`}
                onClick={() => chooseTheme(item.id)}
                title={locked ? "Доступно с Diamond" : item.description}
              >
                <span className="block">{item.name}</span>
                <span className="block text-[11px] font-semibold text-slate-400">{locked ? "Diamond" : "Открыто"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <DiamondModal
        open={diamondOpen}
        onClose={() => setDiamondOpen(false)}
        onUpgrade={() => {
          const next = getPlayer() ?? initPlayer();
          setPlayer(next);
        }}
      />
    </main>
  );
}
