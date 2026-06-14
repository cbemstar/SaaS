type Cadence = "weekly" | "monthly";

type ScheduleTimingInput = {
  cadence: Cadence;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  sendHour: number;
  timezone: string;
  after?: Date;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

const weekdayMap: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

function getZonedParts(date: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-NZ", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const weekdayLabel = parts.find((part) => part.type === "weekday")?.value ?? "Mon";

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    weekday: weekdayMap[weekdayLabel] ?? 1,
  };
}

function matchesSchedule(parts: ZonedParts, input: ScheduleTimingInput) {
  if (parts.hour !== input.sendHour || parts.minute !== 0) {
    return false;
  }

  if (input.cadence === "weekly") {
    return parts.weekday === input.dayOfWeek;
  }

  return parts.day === input.dayOfMonth;
}

export function computeNextRunAt(input: ScheduleTimingInput): Date {
  const after = input.after ?? new Date();
  let cursor = new Date(after.getTime() + 60_000);

  for (let step = 0; step < 366 * 24 * 4; step += 1) {
    const parts = getZonedParts(cursor, input.timezone);
    if (matchesSchedule(parts, input) && cursor > after) {
      return cursor;
    }
    cursor = new Date(cursor.getTime() + 15 * 60_000);
  }

  const fallback = new Date(after);
  fallback.setUTCDate(fallback.getUTCDate() + (input.cadence === "weekly" ? 7 : 28));
  return fallback;
}

export function advanceNextRunAt(current: Date, cadence: Cadence): Date {
  const next = new Date(current);
  if (cadence === "weekly") {
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

export function formatCadenceLabel(
  cadence: Cadence,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  sendHour: number,
) {
  const hourLabel = `${sendHour.toString().padStart(2, "0")}:00`;
  if (cadence === "weekly") {
    const days = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return `Weekly · ${days[dayOfWeek ?? 1]} · ${hourLabel}`;
  }
  return `Monthly · day ${dayOfMonth ?? 1} · ${hourLabel}`;
}
