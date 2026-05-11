"use client";

import { useEffect, useState } from "react";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { DailyLoginRewardLayer } from "@/components/ui/DailyLoginRewardLayer";
import { canUseExperiencePack } from "@/lib/storage/sudokuPass";
import { getSettings, setTheme } from "@/lib/storage/settings";
import { getPlayer, isPlayerOnboarded } from "@/lib/storage/player";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    setOnboarded(isPlayerOnboarded(getPlayer()));
    let settings = getSettings();
    if (settings.theme !== "standard" && !canUseExperiencePack(settings.theme)) {
      settings = setTheme("standard");
    }
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.motion = settings.reducedMotion ? "reduced" : "full";
    document.documentElement.dataset.shake = settings.screenShake === false ? "off" : "on";
    document.documentElement.dataset.errorTexture = settings.accessibility?.errorCell.texture ?? "diagonal";
    document.documentElement.dataset.errorPattern = settings.accessibility?.errorCell.pattern ?? "warning";
    document.documentElement.dataset.relatedTexture = settings.accessibility?.relatedCells.dottedTexture === false ? "solid" : "dots";
    document.documentElement.style.setProperty("--a11y-error", settings.accessibility?.errorCell.color ?? "#b91c1c");
    document.documentElement.style.setProperty("--a11y-selected", settings.accessibility?.selectedCell.outlineColor ?? "#2563eb");
    document.documentElement.style.setProperty("--a11y-selected-width", `${settings.accessibility?.selectedCell.borderThickness ?? 4}px`);
    document.documentElement.style.setProperty("--a11y-hint", settings.accessibilityColors?.hint ?? "#0f766e");
    document.documentElement.style.setProperty("--a11y-related", settings.accessibility?.relatedCells.highlightColor ?? "#64748b");
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!onboarded) {
    return (
      <OnboardingGate
        onComplete={() => {
          setOnboarded(true);
        }}
      />
    );
  }

  return (
    <>
      {children}
      <DailyLoginRewardLayer />
    </>
  );
}
