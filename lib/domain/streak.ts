export interface StreakCalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  played: boolean;
}

export interface StreakCalendar {
  monthLabel: string;
  days: StreakCalendarDay[];
}

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizePlayedDates(dates: string[]): string[] {
  return Array.from(new Set(dates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))).sort();
}

export function buildStreakCalendar(playedDates: string[], now = new Date()): StreakCalendar {
  const played = new Set(normalizePlayedDates(playedDates));
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const totalCells = Math.ceil((offset + last.getDate()) / 7) * 7;

  const days = Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = isoDate(date);
    return {
      date: key,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      played: played.has(key)
    };
  });

  return {
    monthLabel: new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(first).replace(" г.", ""),
    days
  };
}
