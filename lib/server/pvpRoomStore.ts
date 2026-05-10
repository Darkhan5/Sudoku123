import { promises as fs } from "fs";
import path from "path";
import type { RoomState } from "../domain/arena";

export interface PvpRoomStore {
  read(code: string): Promise<RoomState | null>;
  write(room: RoomState): Promise<RoomState>;
}

interface SupabaseRoomRecord {
  code: string;
  room: RoomState;
  updated_at?: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "pvp-rooms.json");
export const PVP_PERSISTENCE_ERROR =
  "PvP на Vercel требует Supabase. Добавь SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в Vercel Environment Variables.";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{4,8}$/.test(normalizeCode(code));
}

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_URL);
}

function hasSupabaseConfig(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isPvpPersistenceMissingOnVercel(): boolean {
  return isVercelRuntime() && !hasSupabaseConfig();
}

export function createFilePvpRoomStore(filePath = DATA_FILE): PvpRoomStore {
  async function readAll(): Promise<Record<string, RoomState>> {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, RoomState>;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {
    async read(code) {
      const rooms = await readAll();
      return rooms[normalizeCode(code)] ?? null;
    },
    async write(room) {
      const code = normalizeCode(room.code);
      const rooms = await readAll();
      const next = { ...room, code, updatedAt: Date.now() };
      rooms[code] = next;
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(rooms, null, 2), "utf8");
      return next;
    }
  };
}

export function createSupabasePvpRoomStore(params: {
  url: string;
  serviceRoleKey: string;
  table?: string;
}): PvpRoomStore {
  const table = params.table ?? "pvp_rooms";
  const endpoint = `${params.url.replace(/\/$/, "")}/rest/v1/${table}`;
  const headers = {
    apikey: params.serviceRoleKey,
    Authorization: `Bearer ${params.serviceRoleKey}`,
    "Content-Type": "application/json"
  };

  return {
    async read(code) {
      const safeCode = normalizeCode(code);
      const response = await fetch(`${endpoint}?code=eq.${encodeURIComponent(safeCode)}&select=code,room,updated_at&limit=1`, {
        headers,
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Could not read PvP room.");
      const records = (await response.json()) as SupabaseRoomRecord[];
      return records[0]?.room ?? null;
    },
    async write(room) {
      const safeCode = normalizeCode(room.code);
      const next = { ...room, code: safeCode, updatedAt: Date.now() };
      const response = await fetch(`${endpoint}?on_conflict=code`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          code: safeCode,
          room: next,
          updated_at: new Date(next.updatedAt).toISOString()
        })
      });
      if (!response.ok) throw new Error("Could not write PvP room.");
      return next;
    }
  };
}

export function createPvpRoomStoreFromEnv(): PvpRoomStore {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) return createSupabasePvpRoomStore({ url, serviceRoleKey });
  return createFilePvpRoomStore();
}
