"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DiamondGlyph } from "@/components/ui/DiamondGlyph";
import { DiamondModal } from "@/components/ui/DiamondModal";
import { SUDOKU_PASS_XP_PER_LEVEL, daysUntilSeasonEnds, type PassReward } from "@/lib/domain/sudokuPass";
import {
  claimPassReward,
  claimUnlockedPassRewards,
  getSudokuPassView,
  rewardLevels,
  taskDefinitions,
  type SudokuPassView
} from "@/lib/storage/sudokuPass";

type Track = "free" | "premium";

export default function SudokuPassPage() {
  const [view, setView] = useState<SudokuPassView | null>(null);
  const [diamondOpen, setDiamondOpen] = useState(false);
  const [claimNotice, setClaimNotice] = useState("");
  const [highlightRewardId, setHighlightRewardId] = useState<string | null>(null);
  const targetRewardHandled = useRef(false);

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

  useEffect(() => {
    if (!view || targetRewardHandled.current) return;

    const targetTheme = new URLSearchParams(window.location.search).get("theme");
    if (!targetTheme) return;

    const reward = levels
      .flatMap((level) => [...level.free, ...level.premium])
      .find((item) => item.kind === "theme" && item.theme === targetTheme);

    if (!reward) return;

    targetRewardHandled.current = true;
    setHighlightRewardId(reward.id);
    setClaimNotice(`Тема находится в премиум-треке на ${reward.level} уровне.`);

    const timer = window.setTimeout(() => {
      document.getElementById(`pass-reward-${reward.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [levels, view]);

  if (!view) {
    return <main className="page-shell">Загружаем Судоку Пасс...</main>;
  }

  const claimedIds = new Set(view.state.claimedRewardIds);
  const daysLeft = daysUntilSeasonEnds(view.season);
  const premium = view.state.premiumActive;
  const allRewards = levels.flatMap((level) => [...level.free, ...level.premium]);
  const freeRewards = levels.flatMap((level) => level.free);
  const premiumRewards = levels.flatMap((level) => level.premium);
  const freeDiamondTotal = sumDiamonds(freeRewards);
  const premiumDiamondTotal = sumDiamonds(premiumRewards);
  const claimableRewards = allRewards.filter((reward) => isRewardClaimable(reward, view.state.xp, premium, claimedIds));
  const nextReward = allRewards.find((reward) => !claimedIds.has(reward.id) && view.state.xp < levelXp(reward.level));
  const highlightedReward = highlightRewardId ? allRewards.find((reward) => reward.id === highlightRewardId) : null;
  const levelPercent = view.progress.nextLevelXp === null ? 100 : Math.round((view.progress.xpIntoLevel / SUDOKU_PASS_XP_PER_LEVEL) * 100);

  function claimReward(rewardId: string) {
    const reward = claimPassReward(rewardId);
    setClaimNotice(reward ? `Забрано: ${reward.title}` : "Эта награда пока недоступна.");
    refresh();
  }

  function claimRewards() {
    const rewards = claimUnlockedPassRewards();
    setClaimNotice(rewards.length ? `Забрано наград: ${rewards.length}` : "Сейчас нет доступных наград.");
    refresh();
  }

  return (
    <main className="page-shell pass-page">
      <section className="pass-hero">
        <div className="pass-hero-copy">
          <p className="pass-kicker">{view.season.name}</p>
          <h1>Судоку Пасс</h1>
          <p>30 дней, 30 уровней и подарки каждый день: бесплатная дорожка плюс мощный премиум-трек.</p>
          <div className="pass-hero-stats" aria-label="Статус сезона">
            <span>
              <strong>{daysLeft}</strong>
              {pluralizeDays(daysLeft)} до конца
            </span>
            <span>
              <strong>{view.progress.completionPercent}%</strong>
              прогресс сезона
            </span>
            <span>
              <strong>{claimableRewards.length}</strong>
              можно забрать
            </span>
            <span>
              <strong>{freeDiamondTotal + premiumDiamondTotal}</strong>
              алмазов в сезоне
            </span>
          </div>
        </div>

        <aside className="pass-xp-card" aria-label="Прогресс уровня">
          <span>{premium ? "Премиум активен" : "Бесплатный трек"}</span>
          <strong>{view.progress.level} уровень</strong>
          <p>{view.progress.xp.toLocaleString("ru-RU")} опыта</p>
          <div className="progress-rail">
            <span style={{ width: `${levelPercent}%` }} />
          </div>
          <small>
            {view.progress.nextLevelXp === null
              ? "Пасс полностью пройден"
              : `До следующего уровня: ${view.progress.xpToNextLevel.toLocaleString("ru-RU")} опыта`}
          </small>
        </aside>
      </section>

      <section className="pass-actions" aria-label="Действия пасса">
        <button type="button" className="btn-primary" onClick={claimRewards} disabled={claimableRewards.length === 0}>
          Забрать все
        </button>
        {!premium ? (
          <button type="button" className="btn-secondary" onClick={() => setDiamondOpen(true)}>
            Открыть премиум
          </button>
        ) : (
          <span className="pass-premium-pill">Премиум трек открыт</span>
        )}
        {nextReward ? <span className="pass-next-pill">Ближайшая награда: {nextReward.title}</span> : null}
        {claimNotice ? <span className="pass-claim-notice">{claimNotice}</span> : null}
      </section>

      {highlightedReward ? (
        <section className="pass-target-panel" aria-live="polite">
          <div>
            <p>Ты выбрал закрытую тему</p>
            <h2>{highlightedReward.title}</h2>
            <span>
              Она открывается на {highlightedReward.level} уровне премиум-трека. Забирай опыт за задания, поднимай уровень и
              возвращайся сюда за наградой.
            </span>
          </div>
          {!premium ? (
            <button type="button" className="btn-primary" onClick={() => setDiamondOpen(true)}>
              Открыть Пасс
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="pass-track-overview" aria-label="Бесплатная и платная версии Судоку Пасса">
        <article className="pass-overview-card">
          <div>
            <p>Бесплатная версия</p>
            <h2>30 подарков за игру</h2>
          </div>
          <ul>
            <li>{freeRewards.length} наград без оплаты</li>
            <li>{freeDiamondTotal} алмазов за сезон</li>
            <li>Стили цифр, бусты опыта и титул</li>
          </ul>
        </article>

        <article className="pass-overview-card pass-overview-card-premium">
          <div>
            <p>Платная версия</p>
            <h2>Премиум, который хочется открыть</h2>
          </div>
          <ul>
            <li>{premiumRewards.length} премиум-наград поверх бесплатных</li>
            <li>{premiumDiamondTotal} алмазов в премиум-треке</li>
            <li>Кибер-сетка сразу, Библиотечные чернила на 7 уровне</li>
            <li>Безлимитные ИИ-подсказки, эффекты арены и редкие титулы</li>
          </ul>
          {!premium ? (
            <button type="button" className="btn-primary" onClick={() => setDiamondOpen(true)}>
              Купить Судоку Пасс
            </button>
          ) : (
            <span className="pass-premium-pill">Уже открыт</span>
          )}
        </article>
      </section>

      <section className="pass-section-heading">
        <div>
          <p>Награды</p>
          <h2>Трек сезона</h2>
        </div>
        <span>{allRewards.length} наград</span>
      </section>

      <section className="pass-reward-list" aria-label="Награды Судоку Пасса">
        {levels.map((level) => {
          const unlocked = view.state.xp >= level.xpRequired;
          return (
            <article key={level.level} className={`pass-level-row ${unlocked ? "pass-level-row-unlocked" : ""}`}>
              <div className="pass-level-marker">
                <span>{level.level}</span>
                <small>{level.xpRequired.toLocaleString("ru-RU")} опыта</small>
              </div>
              <div className="pass-level-rewards">
                <PassTrackRewards
                  track="free"
                  rewards={level.free}
                  level={level.level}
                  levelUnlocked={unlocked}
                  premiumActive={premium}
                  claimedIds={claimedIds}
                  highlightRewardId={highlightRewardId}
                  onClaim={claimReward}
                />
                <PassTrackRewards
                  track="premium"
                  rewards={level.premium}
                  level={level.level}
                  levelUnlocked={unlocked}
                  premiumActive={premium}
                  claimedIds={claimedIds}
                  highlightRewardId={highlightRewardId}
                  onClaim={claimReward}
                />
              </div>
            </article>
          );
        })}
      </section>

      <section className="pass-section-heading">
        <div>
          <p>Задания</p>
          <h2>Опыт для пасса</h2>
        </div>
      </section>

      <section className="pass-task-grid" aria-label="Задания Судоку Пасса">
        {tasks.map((task) => {
          const taskState = view.state.tasks[task.id];
          const current = Math.min(task.goal, taskState?.progress ?? 0);
          const percent = Math.min(100, Math.round((current / task.goal) * 100));
          const complete = Boolean(taskState?.completed);
          return (
            <article key={task.id} className={`pass-task ${complete ? "pass-task-complete" : ""}`}>
              <div className="pass-task-topline">
                <span>{task.cadence === "daily" ? "Ежедневно" : "За сезон"}</span>
                <em>+{task.xp} опыта</em>
              </div>
              <strong>{task.title}</strong>
              <p>{task.description}</p>
              <div className="progress-rail">
                <span style={{ width: `${percent}%` }} />
              </div>
              <small>
                {current} / {task.goal}
                {complete ? " выполнено" : ""}
              </small>
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

function PassTrackRewards({
  track,
  rewards,
  level,
  levelUnlocked,
  premiumActive,
  claimedIds,
  highlightRewardId,
  onClaim
}: {
  track: Track;
  rewards: PassReward[];
  level: number;
  levelUnlocked: boolean;
  premiumActive: boolean;
  claimedIds: Set<string>;
  highlightRewardId: string | null;
  onClaim: (rewardId: string) => void;
}) {
  const trackLocked = track === "premium" && !premiumActive;
  const allClaimed = rewards.length > 0 && rewards.every((reward) => claimedIds.has(reward.id));
  const hasClaimable = rewards.some((reward) => levelUnlocked && !trackLocked && !claimedIds.has(reward.id));
  const status = getTrackStatus({ rewards, level, levelUnlocked, trackLocked, allClaimed, hasClaimable });

  return (
    <div
      className={`pass-track-card pass-track-card-${track} ${hasClaimable ? "pass-track-card-claimable" : ""} ${
        allClaimed ? "pass-track-card-complete" : ""
      } ${trackLocked ? "pass-track-card-locked" : ""}`}
    >
      <div className="pass-track-card-head">
        <span>{track === "free" ? "Бесплатная версия" : "Платная версия"}</span>
        <em>{status}</em>
      </div>

      {rewards.length ? (
        <div className="pass-track-reward-stack">
          {rewards.map((reward) => {
            const claimed = claimedIds.has(reward.id);
            const claimable = levelUnlocked && !trackLocked && !claimed;
            return (
              <div
                key={reward.id}
                id={`pass-reward-${reward.id}`}
                className={`pass-reward-item ${claimed ? "pass-reward-item-claimed" : ""} ${highlightRewardId === reward.id ? "pass-reward-item-highlight" : ""}`}
              >
                <span className={`pass-reward-icon pass-reward-icon-${reward.kind}`} aria-hidden>
                  {rewardIcon(reward)}
                </span>
                <div>
                  <strong>{reward.title}</strong>
                  <small>{rewardDescription(reward)}</small>
                </div>
                {claimable ? (
                  <button type="button" className="pass-claim-button" onClick={() => onClaim(reward.id)}>
                    Забрать
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="pass-empty-reward">
          <strong>Контрольная точка</strong>
          <small>Следующая награда ближе.</small>
        </div>
      )}
      {trackLocked ? <small className="pass-track-lock-note">Купи Пасс сейчас, и эти призы станут доступны по мере уровней.</small> : null}
    </div>
  );
}

function levelXp(level: number): number {
  return (level - 1) * SUDOKU_PASS_XP_PER_LEVEL;
}

function isRewardClaimable(reward: PassReward, xp: number, premium: boolean, claimedIds: Set<string>): boolean {
  if (claimedIds.has(reward.id)) return false;
  if (reward.track === "premium" && !premium) return false;
  return xp >= levelXp(reward.level);
}

function getTrackStatus({
  rewards,
  level,
  levelUnlocked,
  trackLocked,
  allClaimed,
  hasClaimable
}: {
  rewards: PassReward[];
  level: number;
  levelUnlocked: boolean;
  trackLocked: boolean;
  allClaimed: boolean;
  hasClaimable: boolean;
}) {
  if (!rewards.length) return "Без приза";
  if (!levelUnlocked) return `Нужен ${level} уровень`;
  if (trackLocked) return "Нужен Пасс";
  if (allClaimed) return "Получено";
  if (hasClaimable) return "Доступно";
  return "Открыто";
}

function rewardIcon(reward: PassReward): ReactNode {
  if (reward.kind === "diamonds") return <DiamondGlyph className="diamond-glyph-xs" />;
  if (reward.kind === "theme") return "Тема";
  if (reward.kind === "number_style") return "123";
  if (reward.kind === "title") return "Титул";
  if (reward.kind === "pvp_effect") return "Арена";
  if (reward.kind === "kazakh_ornament") return "Өрнек";
  if (reward.kind === "xp_boost") return "Опыт";
  if (reward.kind === "board_style") return "Поле";
  if (reward.kind === "animated_cosmetic") return "FX";
  return "*";
}

function rewardDescription(reward: PassReward): string {
  if (reward.kind === "diamonds") return `+${reward.diamonds ?? 0} алмазов в кошелек.`;
  if (reward.kind === "theme") return "Новая атмосфера поля и интерфейса.";
  if (reward.kind === "number_style") return "Новый стиль цифр для поля.";
  if (reward.kind === "xp_boost") return `${reward.boostHours ?? 2} часа ускоренного прогресса.`;
  if (reward.kind === "title") return "Титул для профиля игрока.";
  if (reward.kind === "pvp_effect") return "Особый визуальный эффект для арены.";
  if (reward.kind === "kazakh_ornament") return "Казахский орнамент для премиум-режима.";
  if (reward.kind === "board_style") return "Дополнительный стиль игрового поля.";
  if (reward.kind === "animated_cosmetic") return "Анимация для действий на поле.";
  return "Сезонная награда.";
}

function sumDiamonds(rewards: PassReward[]): number {
  return rewards.reduce((total, reward) => total + (reward.diamonds ?? 0), 0);
}

function pluralizeDays(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}
