"use client";

import { useRef } from "react";
import { OrnamentSymbol } from "@/components/ornaments/OrnamentSymbol";

interface CellProps {
  row: number;
  col: number;
  value: number;
  notes: Set<number>;
  given: boolean;
  selected: boolean;
  highlighted: boolean;
  sameNumber: boolean;
  error: boolean;
  ornamentMode?: boolean;
  locked?: boolean;
  fogged?: boolean;
  frozen?: boolean;
  onSelect: (row: number, col: number) => void;
  onOrnamentInfo?: (value: number) => void;
}

export function Cell({
  row,
  col,
  value,
  notes,
  given,
  selected,
  highlighted,
  sameNumber,
  error,
  ornamentMode = false,
  locked = false,
  fogged = false,
  frozen = false,
  onSelect,
  onOrnamentInfo
}: CellProps) {
  const longPressTimer = useRef<number | null>(null);

  function clearLongPress() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function startLongPress() {
    if (!ornamentMode || value === 0 || !onOrnamentInfo) return;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => onOrnamentInfo(value), 450);
  }

  const classes = [
    "sudoku-cell cell-fill",
    given ? "cell-given" : "cell-user",
    highlighted ? "cell-highlighted" : "",
    sameNumber ? "cell-same-number" : "",
    selected ? "cell-selected" : "",
    error ? "cell-error" : "",
    ornamentMode ? "cell-ornament" : "",
    fogged ? "cell-fogged" : "",
    frozen ? "cell-frozen" : "",
    col === 2 || col === 5 ? "box-border-right" : "",
    row === 2 || row === 5 ? "box-border-bottom" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      onClick={() => onSelect(row, col)}
      onPointerDown={startLongPress}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onContextMenu={(event) => {
        if (ornamentMode && value && onOrnamentInfo) {
          event.preventDefault();
          onOrnamentInfo(value);
        }
      }}
      disabled={locked || frozen}
      aria-label={`Строка ${row + 1}, столбец ${col + 1}${value ? `, значение ${value}` : ", пусто"}${frozen ? ", временно заморожено" : ""}`}
      aria-selected={selected}
      aria-invalid={error}
      role="gridcell"
    >
      {error ? <span className="cell-warning" aria-hidden>!</span> : null}
      {value ? (
        ornamentMode ? (
          <OrnamentSymbol value={value} />
        ) : (
          <span className="digit">{value}</span>
        )
      ) : notes.size > 0 ? (
        <span className="note-grid" aria-hidden>
          {Array.from({ length: 9 }, (_, index) => {
            const number = index + 1;
            return (
              <span key={number}>
                {notes.has(number) ? ornamentMode ? <OrnamentSymbol value={number} className="note-ornament" /> : number : ""}
              </span>
            );
          })}
        </span>
      ) : null}
    </button>
  );
}
