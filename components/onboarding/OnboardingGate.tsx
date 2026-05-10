"use client";

import { FormEvent, useState } from "react";
import { CITY_INPUT_AUTOCOMPLETE, validateOnboarding } from "@/lib/domain/onboarding";
import { createOnboardedPlayer, getPlayer, savePlayer } from "@/lib/storage/player";

interface OnboardingGateProps {
  onComplete: () => void;
}

export function OnboardingGate({ onComplete }: OnboardingGateProps) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateOnboarding({ name, age: Number(age), city });
    if (!result.ok) {
      setError(Object.values(result.errors).join(" "));
      return;
    }

    savePlayer(createOnboardedPlayer(result.profile, getPlayer()));
    onComplete();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-4xl content-center gap-8">
        <section className="grid gap-4">
          <p className="text-sm font-bold uppercase tracking-wide text-cyan-300">Судоку</p>
          <h1 className="max-w-2xl text-4xl font-black leading-tight md:text-6xl">Создай профиль игрока</h1>
          <p className="max-w-xl text-base leading-7 text-slate-300">
            Имя, город и возраст нужны для локального профиля и рейтинга.
          </p>
        </section>

        <form className="grid gap-4 rounded-2xl border border-white/10 bg-white p-4 text-slate-950 shadow-2xl md:grid-cols-2 md:p-6" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Имя
            <input className="input-control" value={name} autoFocus onChange={(event) => setName(event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Возраст
            <input className="input-control" type="number" min={13} max={120} value={age} onChange={(event) => setAge(event.target.value)} />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Город
            <input
              className="input-control"
              value={city}
              autoComplete={CITY_INPUT_AUTOCOMPLETE}
              onChange={(event) => setCity(event.target.value)}
            />
          </label>

          <div className="grid gap-3 md:col-span-2">
            {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
            <button type="submit" className="btn-primary w-full">
              Начать игру
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
