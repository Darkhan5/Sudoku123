import type { CoachRequest } from "@/types";
import { buildSimpleCoachHint } from "@/lib/domain/coach";

function isBoard(value: unknown): value is number[][] {
  return (
    Array.isArray(value) &&
    value.length === 9 &&
    value.every(
      (row) => Array.isArray(row) && row.length === 9 && row.every((cell) => Number.isInteger(cell) && cell >= 0 && cell <= 9)
    )
  );
}

function isValidRequest(value: Partial<CoachRequest>): value is CoachRequest {
  return (
    isBoard(value.board) &&
    isBoard(value.solution) &&
    Boolean(value.selectedCell) &&
    Number.isInteger(value.selectedCell?.row) &&
    Number.isInteger(value.selectedCell?.col) &&
    value.selectedCell!.row >= 0 &&
    value.selectedCell!.row <= 8 &&
    value.selectedCell!.col >= 0 &&
    value.selectedCell!.col <= 8 &&
    ["easy", "medium", "hard", "expert"].includes(String(value.difficulty)) &&
    Number.isInteger(value.mistakes)
  );
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Partial<CoachRequest>;

    if (!isValidRequest(payload)) {
      return Response.json({ error: "Неверный запрос подсказки." }, { status: 400 });
    }

    return Response.json(
      buildSimpleCoachHint({
        board: payload.board,
        solution: payload.solution,
        selectedCell: payload.selectedCell,
        currentValue: payload.currentValue,
        difficulty: payload.difficulty,
        mistakes: payload.mistakes,
        elapsed: payload.elapsed,
        hintsUsed: payload.hintsUsed,
        plan: payload.plan
      })
    );
  } catch (error) {
    console.error("Ошибка подсказки:", error);
    return Response.json({ error: "Подсказка сейчас недоступна. Попробуй ещё раз." }, { status: 500 });
  }
}
