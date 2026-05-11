"use client";

import { useEffect, useMemo, useState } from "react";
import { DiamondGlyph } from "@/components/ui/DiamondGlyph";
import { DiamondModal } from "@/components/ui/DiamondModal";
import { daysUntilSeasonEnds } from "@/lib/domain/sudokuPass";
import {
  claimUnlockedPassRewards,
  getSudokuPassView,
  rewardLevels,
  taskDefinitions,
  type SudokuPassView
} from "@/lib/storage/sudokuPass";

export default function SudokuPassPage() {
  const [view, setView] = useState<SudokuPassView | null>(null);
  const [diamondOpen, setDiamondOpen] = useState(false);
  const [claimNotice, setClaimNotice] = useState("");

  function refresh() {
    setView(getSudokuPassView());
  }

  useEffect(() => {
    refresh();
    window.addEventListener("sl:sudoku-pass", refresh);
    window.addEventListener("sl:player", refresh);
    return () => {
      window.removeEventListener("sl:sudoku-pass", refresh);
      window.removeEventListener("sl:player", refresh);
    };
  }, []);

  const levels = useMemo(() => rewardLevels(), []);
  const tasks = useMemo(() => taskDefinitions(), []);

  if (!view) {
    return <main className="page-shell">Loading Sudoku Pass...</main>;
  }

  const daysLeft = daysUntilSeasonEnds(view.season);
  const premium = view.state.premiumActive;

  function claimRewards() {
    const rewards = claimUnlockedPassRewards();
    setClaimNotice(rewards.length ? `Claimed ${rewards.length} rewards.` : "No unlocked rewards to claim yet.");
    refresh();
  }

  return (
    <main className="page-shell pass-page">
      <section className="pass-hero">
        <div>
          <p className="text-xs font-black uppercase text-cyan-300">{view.season.name}</p>
          <h1>Sudoku Pass</h1>
          <p>{daysLeft} days left in this 30-day season</p>
        </div>
        <div className="pass-xp-card">
          <span>Level {view.progress.level}</span>
          <strong>{view.progress.xp.toLocaleString("ru-RU")} XP</strong>
          <div className="progress-rail">
            <span style={{ width: `${view.progress.nextLevelXp === null ? 100 : (view.progress.xpIntoLevel / 125) * 100}%` }} />
          </div>
          <small>{view.progress.nextLevelXp === null ? "Pass complete" : `${view.progress.xpToNextLevel} XP to next level`}</small>
        </div>
      </section>

      <section className="pass-actions">
        <button type="button" className="btn-primary" onClick={claimRewards}>
          Claim available rewards
        </button>
        {!premium ? (
          <button type="button" className="btn-secondary" onClick={() => setDiamondOpen(true)}>
            Buy Sudoku Pass
          </button>
        ) : (
          <span className="pass-premium-pill">Premium active</span>
        )}
        {claimNotice ? <span className="text-sm font-bold text-slate-600">{claimNotice}</span> : null}
      </section>

      <section className="pass-track" aria-label="Sudoku Pass rewards">
        <div className="pass-track-lane pass-track-premium">
          {levels.map((level) => {
            const unlocked = view.state.premiumActive && view.state.xp >= level.xpRequired;
            const reward = level.premium[0];
            return (
              <div key={`premium-${level.level}`} className={`pass-node ${unlocked ? "pass-node-unlocked" : ""}`}>
                <span className="pass-node-icon pass-node-gold">{reward ? rewardIcon(reward.kind) : "P"}</span>
                <small>{reward?.title ?? "Premium"}</small>
              </div>
            );
          })}
        </div>

        <div className="pass-track-levels">
          {levels.map((level) => (
            <span key={level.level} className={view.state.xp >= level.xpRequired ? "pass-level-unlocked" : ""}>
              {level.level}
            </span>
          ))}
        </div>

        <div className="pass-track-lane">
          {levels.map((level) => {
            const unlocked = view.state.xp >= level.xpRequired;
            const reward = level.free[0];
            return (
              <div key={`free-${level.level}`} className={`pass-node ${unlocked ? "pass-node-unlocked" : ""}`}>
                <span className="pass-node-icon">{reward ? rewardIcon(reward.kind) : "F"}</span>
                <small>{reward?.title ?? "Free"}</small>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pass-task-grid">
        {tasks.map((task) => {
          const taskState = view.state.tasks[task.id];
          const percent = Math.min(100, Math.round(((taskState?.progress ?? 0) / task.goal) * 100));
          return (
            <article key={task.id} className="pass-task">
              <div>
                <span>{task.cadence}</span>
                <strong>{task.title}</strong>
                <small>
                  {Math.min(task.goal, taskState?.progress ?? 0)} / {task.goal}
                </small>
              </div>
              <em>+{task.xp} XP</em>
              <div className="progress-rail">
                <span style={{ width: `${percent}%` }} />
              </div>
            </article>
          );
        })}
      </section>

      <DiamondModal
        open={diamondOpen}
        onClose={() => setDiamondOpen(false)}
        onUpgrade={() => {
          setDiamondOpen(false);
          refresh();
        }}
      />
    </main>
  );
}

function rewardIcon(kind: string) {
  if (kind === "diamonds") return <DiamondGlyph className="diamond-glyph-xs" />;
  if (kind === "theme") return "FX";
  if (kind === "number_style") return "123";
  if (kind === "title") return "T";
  if (kind === "pvp_effect") return "PvP";
  if (kind === "kazakh_ornament") return "O";
  if (kind === "xp_boost") return "XP";
  return "*";
}
