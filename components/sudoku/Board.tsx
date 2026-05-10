"use client";

import type { CellPosition } from "@/types";
import { Cell } from "./Cell";

interface BoardProps {
  board: number[][];
  given: boolean[][];
  notes: Set<number>[][];
  selected: CellPosition | null;
  errors: CellPosition[];
  complete?: boolean;
  locked?: boolean;
  ornamentMode?: boolean;
  onSelect: (row: number, col: number) => void;
  onOrnamentInfo?: (value: number) => void;
}

function sameBox(a: CellPosition, b: CellPosition): boolean {
  return Math.floor(a.row / 3) === Math.floor(b.row / 3) && Math.floor(a.col / 3) === Math.floor(b.col / 3);
}

function keyOf(cell: CellPosition): string {
  return `${cell.row}:${cell.col}`;
}

export function Board({
  board,
  given,
  notes,
  selected,
  errors,
  complete = false,
  locked = false,
  ornamentMode = false,
  onSelect,
  onOrnamentInfo
}: BoardProps) {
  const errorSet = new Set(errors.map(keyOf));
  const selectedValue = selected ? board[selected.row][selected.col] : 0;

  return (
    <div className={`sudoku-board ${complete ? "board-complete" : ""}`} role="grid" aria-label="Доска судоку 9 на 9">
      {board.map((row, rowIndex) =>
        row.map((value, colIndex) => {
          const cell = { row: rowIndex, col: colIndex };
          const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
          const highlighted = selected ? selected.row === rowIndex || selected.col === colIndex || sameBox(selected, cell) : false;
          const sameNumber = selectedValue !== 0 && value === selectedValue && !isSelected;

          return (
            <Cell
              key={`${rowIndex}-${colIndex}`}
              row={rowIndex}
              col={colIndex}
              value={value}
              notes={notes[rowIndex][colIndex]}
              given={given[rowIndex][colIndex]}
              selected={isSelected}
              highlighted={highlighted}
              sameNumber={sameNumber}
              error={errorSet.has(keyOf(cell))}
              ornamentMode={ornamentMode}
              locked={locked}
              onSelect={onSelect}
              onOrnamentInfo={onOrnamentInfo}
            />
          );
        })
      )}
    </div>
  );
}
