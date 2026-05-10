"use client";

import { useEffect, useState } from "react";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { getSettings } from "@/lib/storage/settings";
import { getPlayer, isPlayerOnboarded } from "@/lib/storage/player";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    setOnboarded(isPlayerOnboarded(getPlayer()));
    document.documentElement.dataset.theme = getSettings().theme;
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!onboarded) return <OnboardingGate onComplete={() => setOnboarded(true)} />;

  return <>{children}</>;
}
