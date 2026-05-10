import { NextResponse } from "next/server";
import type { RoomState } from "@/lib/domain/arena";
import {
  PVP_PERSISTENCE_ERROR,
  createPvpRoomStoreFromEnv,
  isPvpPersistenceMissingOnVercel,
  isValidRoomCode
} from "@/lib/server/pvpRoomStore";

export const dynamic = "force-dynamic";

const store = createPvpRoomStoreFromEnv();

function codeFromParams(params: { code?: string }): string {
  return (params.code ?? "").trim().toUpperCase();
}

function isRoomState(value: Partial<RoomState>, code: string): value is RoomState {
  return (
    value.code === code &&
    typeof value.seed === "string" &&
    typeof value.hostReady === "boolean" &&
    typeof value.guestReady === "boolean" &&
    Number.isFinite(value.hostProgress) &&
    Number.isFinite(value.guestProgress) &&
    typeof value.hostFinished === "boolean" &&
    typeof value.guestFinished === "boolean"
  );
}

export async function GET(_request: Request, { params }: { params: { code?: string } }) {
  const code = codeFromParams(params);
  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: "Invalid PvP room code." }, { status: 400 });
  }
  if (isPvpPersistenceMissingOnVercel()) {
    return NextResponse.json({ error: PVP_PERSISTENCE_ERROR }, { status: 503 });
  }

  const room = await store.read(code);
  if (!room) return NextResponse.json({ room: null }, { status: 404 });
  return NextResponse.json({ room });
}

export async function POST(request: Request, { params }: { params: { code?: string } }) {
  const code = codeFromParams(params);
  if (!isValidRoomCode(code)) {
    return NextResponse.json({ error: "Invalid PvP room code." }, { status: 400 });
  }
  if (isPvpPersistenceMissingOnVercel()) {
    return NextResponse.json({ error: PVP_PERSISTENCE_ERROR }, { status: 503 });
  }

  const payload = (await request.json().catch(() => null)) as Partial<RoomState> | null;
  if (!payload || !isRoomState(payload, code)) {
    return NextResponse.json({ error: "Invalid PvP room payload." }, { status: 400 });
  }

  const room = await store.write(payload);
  return NextResponse.json({ room });
}
