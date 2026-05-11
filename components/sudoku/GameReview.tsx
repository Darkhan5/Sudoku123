"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { AreaPerformance, GameMoveLog, GameReport, HeatmapCell, KeyMoment, MoveQuality } from "@/types";
import { cellLabel, formatReviewDuration, techniqueLabel } from "@/lib/domain/gameReview";
import { Board } from "./Board";

interface GameReviewSummaryProps {
  report: GameReport;
  onOpenDetails: () => void;
}

interface GameReviewDetailsProps {
  report: GameReport;
}

function emptyNotes(): Set<number>[][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>()));
}

function heatColor(intensity: number): string {
  const hue = Math.max(0, Math.round(128 - intensity * 128));
  const lightness = Math.round(88 - intensity * 34);
  return `hsl(${hue} 72% ${lightness}%)`;
}

function moveTone(move: GameMoveLog): string {
  if (move.action === "hint") return "review-move-hint";
  if (move.action === "check") return "review-move-check";
  if (move.action === "place" && !move.correct) return "review-move-error";
  if (move.msSincePrevious >= 10_000) return "review-move-slow";
  if (move.action === "erase") return "review-move-erase";
  return "review-move-good";
}

function actionLabel(move: GameMoveLog): string {
  if (move.action === "hint") return "Подсказка";
  if (move.action === "check") return "Проверка";
  if (move.action === "erase") return "Стирание";
  return move.correct ? "Верный ход" : "Ошибка";
}

function bestAreaLabel(prefix: string, area: AreaPerformance): string {
  return `${prefix} ${area.index + 1}: ${area.moves ? formatReviewDuration(area.avgMs) : "нет ходов"}${area.errors ? `, ошибок ${area.errors}` : ""}`;
}

function qualityLabel(quality: MoveQuality): string {
  if (quality === "mistake") return "ошибка";
  if (quality === "missed") return "можно быстрее";
  if (quality === "assisted") return "подсказка";
  if (quality === "optimal") return "сильный ход";
  if (quality === "good") return "верно";
  return "нейтрально";
}

function HeatmapGrid({ heatmap }: { heatmap: HeatmapCell[][] }) {
  return (
    <div className="review-heatmap" aria-label="Тепловая карта 9 на 9">
      {heatmap.flatMap((row) =>
        row.map((cell) => (
          <div
            key={`${cell.row}-${cell.col}`}
            className={`review-heatmap-cell ${cell.col === 2 || cell.col === 5 ? "review-heatmap-cell-border-right" : ""} ${
              cell.row === 2 || cell.row === 5 ? "review-heatmap-cell-border-bottom" : ""
            }`}
            style={{ background: heatColor(cell.intensity), color: cell.intensity > 0.72 ? "white" : "#0f172a" }}
            title={`${cellLabel(cell.row, cell.col)}: ${formatReviewDuration(cell.avgMs)}, ошибок ${cell.errors}, пауз ${cell.pauses}`}
          >
            {cell.errors ? "!" : cell.pauses ? "..." : ""}
          </div>
        ))
      )}
    </div>
  );
}

export function GameReviewSummary({ report, onOpenDetails }: GameReviewSummaryProps) {
  const { weaknessProfile, session } = report;
  const mistakeCount = session.moves.filter((move) => move.action === "place" && !move.correct).length;
  const scoreStyle = { "--review-score": `${Math.max(0, Math.min(100, report.score)) * 3.6}deg` } as CSSProperties;

  return (
    <section className="review-summary">
      <div className="review-score-card">
        <div className="review-score-ring" style={scoreStyle}>
          <strong>{report.score}</strong>
          <span>/100</span>
        </div>
        <div>
          <p className="review-kicker">ИИ-анализ</p>
          <h3>Картина партии</h3>
          <span>Где ошибался, где думал дольше и какие техники стоит потренировать.</span>
        </div>
      </div>

      <div className="review-metric-grid">
        <ReviewMetric label="время" value={formatReviewDuration(session.stats.totalTimeMs)} />
        <ReviewMetric label="ошибки" value={mistakeCount} />
        <ReviewMetric label="подсказки" value={session.stats.hintsUsed} />
        <ReviewMetric label="проверки" value={session.stats.checksUsed} />
      </div>

      <div className="review-insight-grid">
        <HeatmapGrid heatmap={weaknessProfile.heatmap} />
        <div className="review-readout">
          <ProfileBar label="Точность" value={weaknessProfile.accuracy} />
          <ProfileBar label="Самостоятельность" value={weaknessProfile.independence} />
          <p>
            Средний ход: <strong>{formatReviewDuration(weaknessProfile.averageMoveMs)}</strong>
          </p>
          <small>Чем ярче клетка на карте, тем больше там пауз, ошибок или долгих решений.</small>
        </div>
      </div>

      <button type="button" className="btn-primary w-full" onClick={onOpenDetails}>
        Открыть пошаговый разбор
      </button>
    </section>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="review-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ProfileBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="review-profile-bar">
      <div>
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div>
        <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function Timeline({ moves, currentIndex, onSelect }: { moves: GameMoveLog[]; currentIndex: number; onSelect: (index: number) => void }) {
  return (
    <div className="review-timeline" aria-label="Таймлайн ходов">
      <div className="review-timeline-track">
        {moves.map((move, index) => (
          <button
            key={move.moveNumber}
            type="button"
            className={`review-move-dot ${moveTone(move)} ${currentIndex === index ? "review-move-dot-active" : ""}`}
            onClick={() => onSelect(index)}
            title={`#${move.moveNumber}: ${actionLabel(move)}, ${cellLabel(Math.max(0, move.row), Math.max(0, move.col))}`}
          >
            {move.moveNumber}
          </button>
        ))}
      </div>
    </div>
  );
}

function KeyMomentList({ moments, onSelect }: { moments: KeyMoment[]; onSelect: (moveNumber: number) => void }) {
  if (moments.length === 0) {
    return <p className="review-empty">Критичных моментов не найдено.</p>;
  }

  return (
    <div className="review-moment-list">
      {moments.map((moment) => (
        <button
          key={moment.id}
          type="button"
          className={`review-moment-card review-moment-${moment.severity}`}
          onClick={() => onSelect(moment.moveNumber)}
        >
          <span>{moment.title}</span>
          <small>{moment.description}</small>
        </button>
      ))}
    </div>
  );
}

export function GameReviewDetails({ report }: GameReviewDetailsProps) {
  const [currentIndex, setCurrentIndex] = useState(Math.max(0, report.session.moves.length - 1));
  const notes = useMemo(() => emptyNotes(), []);
  const currentMove = report.session.moves[currentIndex] ?? null;
  const currentAnalysis = currentMove ? report.moveAnalyses.find((analysis) => analysis.move.moveNumber === currentMove.moveNumber) : null;
  const board = currentMove?.boardAfter ?? report.session.puzzle;
  const selected = currentAnalysis?.suggestedMove
    ? { row: currentAnalysis.suggestedMove.row, col: currentAnalysis.suggestedMove.col }
    : currentMove && currentMove.row >= 0 && currentMove.col >= 0
      ? { row: currentMove.row, col: currentMove.col }
      : null;
  const errors = currentMove?.action === "place" && !currentMove.correct ? [{ row: currentMove.row, col: currentMove.col }] : [];
  const speedScore = Math.max(0, Math.round(100 - (report.weaknessProfile.averageMoveMs / 15_000) * 100));
  const weakBlock = [...report.weaknessProfile.byBlock].sort((a, b) => b.errors - a.errors || b.avgMs - a.avgMs)[0];
  const weakDigit = [...report.weaknessProfile.byDigit].sort((a, b) => b.errors - a.errors || b.avgMs - a.avgMs)[0];
  const currentQuality = currentAnalysis ? qualityLabel(currentAnalysis.quality) : "позиция";

  function selectMove(moveNumber: number) {
    const index = report.session.moves.findIndex((move) => move.moveNumber === moveNumber);
    if (index >= 0) setCurrentIndex(index);
  }

  return (
    <div className="review-details">
      <section className="review-section">
        <div className="review-section-head">
          <p>Воспроизведение партии</p>
          <h3>Ход {currentMove?.moveNumber ?? 0} из {report.session.moves.length}</h3>
          <span>Нажимай на точки таймлайна, чтобы увидеть состояние поля и объяснение ИИ.</span>
        </div>
        <div className="review-playback-grid">
          <div className="review-board-card">
            <Board
              board={board}
              given={report.session.given}
              notes={notes}
              selected={selected}
              errors={errors}
              locked
              onSelect={() => undefined}
            />
          </div>
          <div className="review-current-card">
            <div className="review-current-top">
              <span>{currentQuality}</span>
              <strong>{currentMove ? actionLabel(currentMove) : "Старт"}</strong>
            </div>
            <p>
              {currentMove
                ? `${cellLabel(Math.max(0, currentMove.row), Math.max(0, currentMove.col))}, ${formatReviewDuration(currentMove.msSincePrevious)} после прошлого действия`
                : "Начальная позиция"}
            </p>
            {currentAnalysis ? <div className="review-explanation">{currentAnalysis.explanation}</div> : null}
            <div className="review-mini-grid">
              <span>
                <small>Техника</small>
                <strong>{currentAnalysis ? techniqueLabel(currentAnalysis.technique) : "нет"}</strong>
              </span>
              <span>
                <small>Цифра</small>
                <strong>{currentMove?.digit || "-"}</strong>
              </span>
            </div>
              {currentAnalysis?.suggestedMove ? (
              <div className="review-suggestion">
                <small>Лучший следующий шаг</small>
                <strong>
                  {currentAnalysis.suggestedMove.digit} в {cellLabel(currentAnalysis.suggestedMove.row, currentAnalysis.suggestedMove.col)}
                </strong>
                <span>{techniqueLabel(currentAnalysis.suggestedMove.technique)}</span>
              </div>
              ) : null}
          </div>
        </div>
        <Timeline moves={report.session.moves} currentIndex={currentIndex} onSelect={setCurrentIndex} />
      </section>

      <section className="review-section">
        <div className="review-section-head">
          <p>Ключевые моменты</p>
          <h3>Ошибки и развилки</h3>
          <span>Это места, где партия замедлилась, появилась ошибка или ИИ видел более простой путь.</span>
        </div>
        <KeyMomentList moments={report.keyMoments} onSelect={selectMove} />
      </section>

      <section className="review-section">
        <div className="review-section-head">
          <p>Профиль игрока</p>
          <h3>Что видно по партии</h3>
          <span>Три показателя показывают, насколько уверенно ты решал без лишних проверок.</span>
        </div>
        <div className="review-profile-grid">
          <div className="review-card">
            <ProfileBar label="Точность" value={report.weaknessProfile.accuracy} />
            <ProfileBar label="Скорость" value={speedScore} />
            <ProfileBar label="Самостоятельность" value={report.weaknessProfile.independence} />
          </div>
          <div className="review-card review-weak-card">
            <p>{bestAreaLabel("Слабый блок", weakBlock)}</p>
            <p>{bestAreaLabel("Сложная цифра", weakDigit)}</p>
            <p>Стирания: {report.session.stats.erasures}</p>
          </div>
        </div>
      </section>

      <section className="review-section review-recommendation-section">
        <div className="review-section-head">
          <p>Рекомендации</p>
          <h3>Что делать в следующей партии</h3>
          <span>Короткий план тренировки по твоим ошибкам.</span>
        </div>
        <div className="review-recommendation-list">
          {report.recommendations.map((item, index) => (
            <p key={item} className="review-recommendation">
              <span>{index + 1}</span>
              {item}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
