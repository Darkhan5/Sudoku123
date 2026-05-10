import { promises as fs } from "fs";
import path from "path";
import {
  accuracyFor,
  filterLeaderboard,
  isLeaderboardScope,
  rankLeaderboard,
  scoreFor,
  upsertLeaderboardEntry,
  type LeaderboardRecord
} from "../domain/leaderboard";
import { DEFAULT_COUNTRY, DEFAULT_COUNTRY_CODE, getCountryCode } from "../domain/onboarding";

export interface LeaderboardStore {
  read(): Promise<LeaderboardRecord[]>;
  write(entries: LeaderboardRecord[]): Promise<void>;
}

export interface LeaderboardHandlersConfig {
  store: LeaderboardStore;
  now?: () => Date;
}

interface SubmitPayload {
  playerId?: unknown;
  name?: unknown;
  city?: unknown;
  country?: unknown;
  countryCode?: unknown;
  avatarUrl?: unknown;
  icon?: unknown;
  date?: unknown;
  time?: unknown;
  mistakes?: unknown;
  hintsUsed?: unknown;
}

interface SupabaseLeaderboardRow {
  id: string;
  player_id: string;
  name: string;
  city: string;
  country: string;
  country_code: string;
  avatar_url?: string | null;
  icon: string;
  date: string;
  time: number;
  mistakes?: number | null;
  hints_used?: number | null;
  accuracy?: number | null;
  score: number;
  created_at?: string | null;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "leaderboard.json");
const PERSISTENCE_ERROR =
  "Рейтинг на Vercel требует Supabase. Добавь SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в Vercel Environment Variables.";

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
}

function todayIso(now: Date): string {
  return now.toISOString().split("T")[0];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_URL);
}

function hasSupabaseConfig(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isLeaderboardPersistenceMissingOnVercel(): boolean {
  return isVercelRuntime() && !hasSupabaseConfig();
}

function parseSubmitPayload(payload: SubmitPayload, now: Date): LeaderboardRecord | null {
  const playerId = asString(payload.playerId);
  const name = asString(payload.name);
  const city = asString(payload.city);
  const country = asString(payload.country) || DEFAULT_COUNTRY;
  const explicitCountryCode = asString(payload.countryCode).toUpperCase();
  const countryCode = explicitCountryCode || getCountryCode(country) || DEFAULT_COUNTRY_CODE;
  const avatarUrl = asString(payload.avatarUrl);
  const icon = asString(payload.icon) || "🧠";
  const date = asString(payload.date);
  const time = asInteger(payload.time);
  const mistakes = asInteger(payload.mistakes);
  const hintsUsed = asInteger(payload.hintsUsed);

  if (!playerId || !name || !city || !date || !time || time <= 0 || mistakes === null || mistakes < 0 || hintsUsed === null || hintsUsed < 0) {
    return null;
  }

  const accuracy = accuracyFor(mistakes, hintsUsed);

  return {
    id: `${date}:${playerId}`,
    playerId,
    name,
    city,
    country,
    countryCode,
    avatarUrl,
    icon,
    date,
    time,
    mistakes,
    hintsUsed,
    accuracy,
    score: scoreFor(time, mistakes, hintsUsed),
    createdAt: now.toISOString()
  };
}

export function createFileLeaderboardStore(filePath = DATA_FILE): LeaderboardStore {
  return {
    async read() {
      try {
        const raw = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(raw) as LeaderboardRecord[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    async write(entries) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(entries, null, 2), "utf8");
    }
  };
}

export function createSupabaseLeaderboardStore(params: {
  url: string;
  serviceRoleKey: string;
  table?: string;
}): LeaderboardStore {
  const table = params.table ?? "leaderboard_entries";
  const endpoint = `${params.url.replace(/\/$/, "")}/rest/v1/${table}`;
  const headers = {
    apikey: params.serviceRoleKey,
    Authorization: `Bearer ${params.serviceRoleKey}`,
    "Content-Type": "application/json"
  };
  const toRecord = (row: SupabaseLeaderboardRow): LeaderboardRecord => ({
    id: row.id,
    playerId: row.player_id,
    name: row.name,
    city: row.city,
    country: row.country,
    countryCode: row.country_code,
    avatarUrl: row.avatar_url ?? "",
    icon: row.icon,
    date: row.date,
    time: row.time,
    mistakes: row.mistakes ?? 0,
    hintsUsed: row.hints_used ?? 0,
    accuracy: row.accuracy ?? 100,
    score: row.score,
    createdAt: row.created_at ?? ""
  });
  const toRow = (entry: LeaderboardRecord): SupabaseLeaderboardRow => ({
    id: entry.id,
    player_id: entry.playerId,
    name: entry.name,
    city: entry.city,
    country: entry.country,
    country_code: entry.countryCode,
    avatar_url: entry.avatarUrl ?? "",
    icon: entry.icon ?? "🧠",
    date: entry.date,
    time: entry.time,
    mistakes: entry.mistakes ?? 0,
    hints_used: entry.hintsUsed ?? 0,
    accuracy: entry.accuracy ?? 100,
    score: entry.score,
    created_at: entry.createdAt
  });

  return {
    async read() {
      const response = await fetch(`${endpoint}?select=*&limit=5000`, {
        headers,
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Could not read Supabase leaderboard.");
      return ((await response.json()) as SupabaseLeaderboardRow[]).map(toRecord);
    },
    async write(entries) {
      if (entries.length === 0) return;
      const response = await fetch(`${endpoint}?on_conflict=id`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates"
        },
        body: JSON.stringify(entries.map(toRow))
      });
      if (!response.ok) throw new Error("Could not write Supabase leaderboard.");
    }
  };
}

export function createLeaderboardStoreFromEnv(): LeaderboardStore {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) {
    return createSupabaseLeaderboardStore({ url, serviceRoleKey });
  }
  return createFileLeaderboardStore();
}

export function createLeaderboardHandlers({ store, now = () => new Date() }: LeaderboardHandlersConfig) {
  return {
    async GET(req: Request): Promise<Response> {
      const url = new URL(req.url);
      const tab = url.searchParams.get("tab") ?? "global";
      if (!isLeaderboardScope(tab)) {
        return jsonResponse({ error: "Unsupported leaderboard scope." }, { status: 400 });
      }
      if (isLeaderboardPersistenceMissingOnVercel()) {
        return jsonResponse({ error: PERSISTENCE_ERROR }, { status: 503 });
      }

      const playerId = url.searchParams.get("playerId");
      const city = asString(url.searchParams.get("city"));
      const entries = await store.read();
      const ranked = rankLeaderboard(filterLeaderboard(entries, tab, city));
      const current = playerId ? ranked.find((entry) => entry.playerId === playerId) : null;

      return jsonResponse({
        entries: ranked.slice(0, 100).map((entry) => ({
          ...entry,
          isCurrentUser: entry.playerId === playerId
        })),
        currentRank: current?.rank ?? null,
        total: ranked.length,
        date: url.searchParams.get("date") ?? todayIso(now())
      });
    },

    async POST(req: Request): Promise<Response> {
      try {
        if (isLeaderboardPersistenceMissingOnVercel()) {
          return jsonResponse({ error: PERSISTENCE_ERROR }, { status: 503 });
        }

        const payload = (await req.json()) as SubmitPayload;
        const entry = parseSubmitPayload(payload, now());
        if (!entry) {
          return jsonResponse({ error: "Invalid leaderboard result." }, { status: 400 });
        }

        const entries = await store.read();
        const nextEntries = upsertLeaderboardEntry(entries, entry);
        await store.write(nextEntries);

        const rank = rankLeaderboard(nextEntries).find((rankedEntry) => rankedEntry.playerId === entry.playerId && rankedEntry.date === entry.date);

        return jsonResponse({
          entry: {
            ...entry,
            countryFlag: rank?.countryFlag
          },
          rank: rank?.rank ?? null
        });
      } catch (error) {
        console.error("Leaderboard API error:", error);
        return jsonResponse({ error: "Could not save leaderboard result." }, { status: 500 });
      }
    }
  };
}
