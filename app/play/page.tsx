"use client";

import { GameShell } from "@/components/sudoku/GameShell";

export default function PlayPage() {
  return (
    <main>
      <GameShell mode="free" initialDifficulty="medium" />
    </main>
  );
}
