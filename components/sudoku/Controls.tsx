"use client";

import { OrnamentSymbol } from "@/components/ornaments/OrnamentSymbol";

interface ControlsProps {
  notesMode: boolean;
  disabledNumbers: number[];
  canUndo: boolean;
  locked?: boolean;
  ornamentMode?: boolean;
  canUseOrnament?: boolean;
  onNumber: (value: number) => void;
  onUndo: () => void;
  onToggleNotes: () => void;
  onErase: () => void;
  onHint: () => void;
  onToggleOrnament: () => void;
  onOpenOrnamentLegend: () => void;
}

export function Controls({
  notesMode,
  disabledNumbers,
  canUndo,
  locked = false,
  ornamentMode = false,
  canUseOrnament = false,
  onNumber,
  onUndo,
  onToggleNotes,
  onErase,
  onHint,
  onToggleOrnament,
  onOpenOrnamentLegend
}: ControlsProps) {
  return (
    <section className="controls-panel" aria-label="Управление судоку">
      <div className="number-pad" aria-label="Цифры">
        {Array.from({ length: 9 }, (_, index) => {
          const value = index + 1;
          return (
            <button
              key={value}
              type="button"
              className="number-button"
              disabled={locked || disabledNumbers.includes(value)}
              onClick={() => onNumber(value)}
              aria-label={`Поставить ${value}`}
            >
              {ornamentMode ? <OrnamentSymbol value={value} /> : value}
            </button>
          );
        })}
      </div>

      <div className="action-grid">
        <button type="button" className="action-button" disabled={locked || !canUndo} onClick={onUndo}>
          <span aria-hidden>↩</span>
          <span>Назад</span>
        </button>
        <button
          type="button"
          className={`action-button ${notesMode ? "action-button-active" : ""}`}
          disabled={locked}
          onClick={onToggleNotes}
        >
          <span aria-hidden>З</span>
          <span>Заметки</span>
        </button>
        <button type="button" className="action-button" disabled={locked} onClick={onErase}>
          <span aria-hidden>⌫</span>
          <span>Стереть</span>
        </button>
        <button type="button" className="hint-button" disabled={locked} onClick={onHint}>
          <span aria-hidden>ИИ</span>
          <span>Подсказка</span>
        </button>
        <button
          type="button"
          className={`action-button ${ornamentMode ? "action-button-active" : ""}`}
          disabled={locked}
          onClick={onToggleOrnament}
        >
          <span aria-hidden>{canUseOrnament ? (ornamentMode ? "1" : "Ө") : "◆"}</span>
          <span>{ornamentMode ? "Цифры" : "Өрнек"}</span>
        </button>
        <button type="button" className="action-button" disabled={locked || !ornamentMode} onClick={onOpenOrnamentLegend}>
          <span aria-hidden>?</span>
          <span>Легенда</span>
        </button>
      </div>
    </section>
  );
}
