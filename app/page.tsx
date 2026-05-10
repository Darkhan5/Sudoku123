"use client";

import { GameShell } from "@/components/sudoku/GameShell";

export default function HomePage() {
  return (
    <main>
      <GameShell mode="daily" initialDifficulty="medium" />
    </main>
  );
}
