"use client";

import { useMemo, useState } from "react";
import type { AreaPerformance, GameMoveLog, GameReport, HeatmapCell, KeyMoment } from "@/types";
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
  if (move.action === "hint") return "bg-sky-500";
  if (move.action === "check") return "bg-indigo-500";
  if (move.action === "place" && !move.correct) return "bg-red-500";
  if (move.msSincePrevious >= 10_000) return "bg-amber-400";
  if (move.action === "erase") return "bg-slate-400";
  return "bg-emerald-500";
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

function HeatmapGrid({ heatmap }: { heatmap: HeatmapCell[][] }) {
  return (
    <div className="grid aspect-square w-full max-w-[240px] grid-cols-9 overflow-hidden rounded-lg border border-slate-200 bg-white" aria-label="Тепловая карта 9 на 9">
      {heatmap.flatMap((row) =>
        row.map((cell) => (
          <div
            key={`${cell.row}-${cell.col}`}
            className={`grid place-items-center border-b border-r border-white/70 text-[10px] font-black ${
              cell.col === 2 || cell.col === 5 ? "border-r-slate-400" : ""
            } ${cell.row === 2 || cell.row === 5 ? "border-b-slate-400" : ""}`}
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
  return (
    <section className="grid gap-4 text-left">
      <div className="text-center">
        <p className="text-xs font-black uppercase text-primary">Game Review</p>
        <div className="mt-1 text-5xl font-black text-slate-950">{report.score}</div>
        <p className="text-sm font-bold text-slate-500">итоговый счёт из 100</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <strong className="block text-lg text-slate-950">{formatReviewDuration(session.stats.totalTimeMs)}</strong>
          <span className="text-xs font-bold text-slate-500">время</span>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <strong className="block text-lg text-slate-950">{session.moves.filter((move) => move.action === "place" && !move.correct).length}</strong>
          <span className="text-xs font-bold text-slate-500">ошибки</span>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <strong className="block text-lg text-slate-950">{session.stats.hintsUsed}</strong>
          <span className="text-xs font-bold text-slate-500">подсказки</span>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <strong className="block text-lg text-slate-950">{session.stats.checksUsed}</strong>
          <span className="text-xs font-bold text-slate-500">проверки</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <HeatmapGrid heatmap={weaknessProfile.heatmap} />
        <div className="grid gap-2 text-sm font-semibold text-slate-700">
          <p>Точность: <strong>{weaknessProfile.accuracy}%</strong></p>
          <p>Средний ход: <strong>{formatReviewDuration(weaknessProfile.averageMoveMs)}</strong></p>
          <p>Самостоятельность: <strong>{weaknessProfile.independence}%</strong></p>
        </div>
      </div>

      <button type="button" className="btn-primary w-full" onClick={onOpenDetails}>
        Подробный разбор
      </button>
    </section>
  );
}

function ProfileBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs font-black text-slate-600">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function Timeline({ moves, currentIndex, onSelect }: { moves: GameMoveLog[]; currentIndex: number; onSelect: (index: number) => void }) {
  return (
    <div className="flex min-h-12 items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2">
      {moves.map((move, index) => (
        <button
          key={move.moveNumber}
          type="button"
          className={`h-7 min-w-7 rounded-full text-[10px] font-black text-white shadow-sm ${moveTone(move)} ${
            currentIndex === index ? "ring-2 ring-slate-950 ring-offset-2" : ""
          }`}
          onClick={() => onSelect(index)}
          title={`#${move.moveNumber}: ${actionLabel(move)}, ${cellLabel(Math.max(0, move.row), Math.max(0, move.col))}`}
        >
          {move.moveNumber}
        </button>
      ))}
    </div>
  );
}

function KeyMomentList({ moments, onSelect }: { moments: KeyMoment[]; onSelect: (moveNumber: number) => void }) {
  if (moments.length === 0) {
    return <p className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-600">Критичных моментов не найдено.</p>;
  }

  return (
    <div className="grid gap-2">
      {moments.map((moment) => (
        <button
          key={moment.id}
          type="button"
          className="rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-violet-200 hover:bg-violet-50"
          onClick={() => onSelect(moment.moveNumber)}
        >
          <span className="block text-sm font-black text-slate-950">{moment.title}</span>
          <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">{moment.description}</span>
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

  function selectMove(moveNumber: number) {
    const index = report.session.moves.findIndex((move) => move.moveNumber === moveNumber);
    if (index >= 0) setCurrentIndex(index);
  }

  return (
    <div className="grid gap-5 text-left">
      <section className="grid gap-3">
        <div>
          <p className="text-xs font-black uppercase text-primary">Воспроизведение партии</p>
          <h3 className="text-xl font-black text-slate-950">Ход {currentMove?.moveNumber ?? 0} из {report.session.moves.length}</h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
          <Board
            board={board}
            given={report.session.given}
            notes={notes}
            selected={selected}
            errors={errors}
            locked
            onSelect={() => undefined}
          />
          <div className="grid gap-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-sm font-black text-slate-950">{currentMove ? actionLabel(currentMove) : "Старт"}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {currentMove ? `${cellLabel(Math.max(0, currentMove.row), Math.max(0, currentMove.col))}, ${formatReviewDuration(currentMove.msSincePrevious)} после прошлого действия` : "Начальная позиция"}
              </p>
              {currentAnalysis ? <p className="mt-2 text-sm leading-6 text-slate-700">{currentAnalysis.explanation}</p> : null}
              {currentAnalysis?.suggestedMove ? (
                <p className="mt-2 rounded-lg bg-white p-3 text-sm font-bold text-slate-700">
                  Совет: {techniqueLabel(currentAnalysis.suggestedMove.technique)}{" -> "}{currentAnalysis.suggestedMove.digit} в {cellLabel(currentAnalysis.suggestedMove.row, currentAnalysis.suggestedMove.col)}
                </p>
              ) : null}
            </div>
            <Timeline moves={report.session.moves} currentIndex={currentIndex} onSelect={setCurrentIndex} />
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <div>
          <p className="text-xs font-black uppercase text-primary">Ключевые моменты</p>
          <h3 className="text-xl font-black text-slate-950">Самые важные развилки</h3>
        </div>
        <KeyMomentList moments={report.keyMoments} onSelect={selectMove} />
      </section>

      <section className="grid gap-3">
        <div>
          <p className="text-xs font-black uppercase text-primary">Профиль игрока</p>
          <h3 className="text-xl font-black text-slate-950">Скорость, точность, самостоятельность</h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3">
            <ProfileBar label="Точность" value={report.weaknessProfile.accuracy} />
            <ProfileBar label="Скорость" value={speedScore} />
            <ProfileBar label="Самостоятельность" value={report.weaknessProfile.independence} />
          </div>
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">
            <p>{bestAreaLabel("Слабый блок", weakBlock)}</p>
            <p>{bestAreaLabel("Сложная цифра", weakDigit)}</p>
            <p>Стирания: {report.session.stats.erasures}</p>
          </div>
        </div>
        <div className="grid gap-2">
          {report.recommendations.map((item) => (
            <p key={item} className="rounded-lg bg-cyan-50 p-3 text-sm font-bold leading-6 text-slate-800">
              {item}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
