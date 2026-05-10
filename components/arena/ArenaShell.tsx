"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { CellPosition, Player, Settings, SudokuPuzzle } from "@/types";
import {
  SABOTAGE_ABILITIES,
  calculateBoardProgress,
  pvpXpReward,
  type PlayerRole,
  type RoomParticipant,
  type RoomState,
  type SabotageId
} from "@/lib/domain/arena";
import { rankLabel, rankForXp } from "@/lib/domain/progression";
import { generateWithSeed } from "@/lib/sudoku/generator";
import { getConflicts, isBoardComplete } from "@/lib/sudoku/validator";
import { getPlayer, initPlayer, recordSolvedGame, updatePlayer } from "@/lib/storage/player";
import { getSettings } from "@/lib/storage/settings";
import { playFeedback } from "@/lib/utils/feedback";
import { Board } from "@/components/sudoku/Board";
import { Controls } from "@/components/sudoku/Controls";
import { Timer } from "@/components/sudoku/Timer";

type MatchState = "lobby" | "waiting" | "ready" | "countdown" | "playing" | "finished";

interface ActiveEffect {
  id: SabotageId;
  until: number;
  fogZones?: number[];
}

const EMPTY_COOLDOWNS: Record<SabotageId, number> = {
  fog: 0,
  "remove-notes": 0,
  "hidden-combination": 0
};

const COMBO_MILESTONES: Record<number, string> = {
  5: "Отлично!",
  10: "Серия!",
  20: "Идеально!",
  50: "Монстр Судоку!"
};

function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => [...row]);
}

function emptyNotes(): Set<number>[][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>()));
}

function firstEmpty(board: number[][], given: boolean[][]): CellPosition | null {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (!given[row][col] && board[row][col] === 0) return { row, col };
    }
  }
  return null;
}

function keyOf(cell: CellPosition): string {
  return `${cell.row}:${cell.col}`;
}

function lobbyCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function normalizeCode(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return code.length >= 4 ? code : null;
}

function randomFogZone(seed: number): number[] {
  return [seed % 9];
}

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function roomKey(code: string): string {
  return `sl_pvp_room_${code}`;
}

function ownerKey(code: string): string {
  return `sl_pvp_owner_${code}`;
}

function readRoom(code: string): RoomState | null {
  if (!hasStorage()) return null;
  try {
    const raw = localStorage.getItem(roomKey(code));
    return raw ? (JSON.parse(raw) as RoomState) : null;
  } catch {
    return null;
  }
}

async function readRoomFromServer(code: string): Promise<RoomState | null> {
  const response = await fetch(`/api/pvp/rooms/${encodeURIComponent(code)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  const payload = (await response.json().catch(() => ({}))) as { room?: RoomState | null; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "PvP room request failed.");
  return payload.room ?? null;
}

function cacheRoom(room: RoomState): RoomState {
  const next = { ...room, updatedAt: Date.now() };
  if (hasStorage()) localStorage.setItem(roomKey(room.code), JSON.stringify(next));
  return next;
}

async function writeRoomToServer(room: RoomState): Promise<RoomState | null> {
  const response = await fetch(`/api/pvp/rooms/${encodeURIComponent(room.code)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(room)
  });
  const payload = (await response.json().catch(() => ({}))) as { room?: RoomState | null; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "PvP room sync failed.");
  return payload.room ?? null;
}

async function saveRoom(room: RoomState): Promise<RoomState> {
  const cached = cacheRoom(room);
  const serverRoom = await writeRoomToServer(cached);
  return cacheRoom(serverRoom ?? cached);
}

function writeRoom(room: RoomState): RoomState {
  const next = cacheRoom(room);
  void writeRoomToServer(next).catch(() => undefined);
  return next;
}

function participantFromPlayer(player: Player): RoomParticipant {
  return {
    name: player.name,
    avatarUrl: player.avatarUrl,
    rank: player.rank
  };
}

function hasTutorial(): boolean {
  return hasStorage() && localStorage.getItem("sl_pvp_tutorial_seen") === "true";
}

function createRoom(code: string, host: Player): RoomState {
  return {
    code,
    seed: `pvp:${code}:0`,
    host: participantFromPlayer(host),
    hostReady: false,
    guestReady: false,
    hostProgress: 0,
    guestProgress: 0,
    hostFinished: false,
    guestFinished: false,
    updatedAt: Date.now()
  };
}

export function ArenaShell() {
  const params = useParams<{ code?: string | string[] }>();
  const routeCode = normalizeCode(params?.code);
  const [code, setCode] = useState(() => routeCode ?? lobbyCode());
  const [role, setRole] = useState<PlayerRole>(() => (routeCode && (!hasStorage() || localStorage.getItem(ownerKey(routeCode)) !== "host") ? "guest" : "host"));
  const [puzzleSeed, setPuzzleSeed] = useState(() => `pvp:${routeCode ?? code}:0`);
  const [puzzle, setPuzzle] = useState<SudokuPuzzle>(() => generateWithSeed(puzzleSeed, "medium"));
  const [board, setBoard] = useState<number[][]>(() => cloneBoard(puzzle.puzzle));
  const [notes, setNotes] = useState<Set<number>[][]>(() => emptyNotes());
  const [selected, setSelected] = useState<CellPosition | null>(() => firstEmpty(puzzle.puzzle, puzzle.given));
  const [notesMode, setNotesMode] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboCells, setComboCells] = useState<Set<string>>(() => new Set());
  const [comboMessage, setComboMessage] = useState("");
  const [cooldowns, setCooldowns] = useState<Record<SabotageId, number>>(EMPTY_COOLDOWNS);
  const [effects, setEffects] = useState<ActiveEffect[]>([]);
  const [matchState, setMatchState] = useState<MatchState>(routeCode ? "waiting" : "lobby");
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState<"player" | "friend" | null>(null);
  const [status, setStatus] = useState(routeCode ? "Открываем приватную комнату по ссылке." : "Создай комнату и отправь ссылку другу.");
  const [settings, setSettings] = useState<Settings>(() => getSettings());
  const [tutorialOpen, setTutorialOpen] = useState(() => !hasTutorial());
  const [rewardGranted, setRewardGranted] = useState(false);
  const [rewardXp, setRewardXp] = useState(0);
  const [room, setRoom] = useState<RoomState | null>(() => (routeCode ? readRoom(routeCode) : null));
  const [lastIncomingEffect, setLastIncomingEffect] = useState("");
  const [player, setPlayer] = useState<Player>(() => getPlayer() ?? initPlayer());

  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? (typeof window === "undefined" ? "" : window.location.origin);
  const inviteLink = `${siteOrigin || "https://sudoku.app"}/pvp/${code}`;
  const playerProgress = calculateBoardProgress({ board, given: puzzle.given });
  const friend = role === "host" ? room?.guest : room?.host;
  const friendConnected = Boolean(friend);
  const selfReady = role === "host" ? room?.hostReady ?? false : room?.guestReady ?? false;
  const friendReady = role === "host" ? room?.guestReady ?? false : room?.hostReady ?? false;
  const friendProgress = role === "host" ? room?.guestProgress ?? 0 : room?.hostProgress ?? 0;
  const friendFinished = role === "host" ? room?.guestFinished ?? false : room?.hostFinished ?? false;
  const playerFog = effects.flatMap((effect) => (effect.id === "fog" ? effect.fogZones ?? [] : []));
  const playerAssistHidden = effects.some((effect) => effect.id === "hidden-combination");

  const errors = useMemo(() => {
    const conflicts = getConflicts(board);
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (!puzzle.given[row][col] && board[row][col] !== 0 && board[row][col] !== puzzle.solution[row][col]) {
          conflicts.push({ row, col });
        }
      }
    }
    return conflicts;
  }, [board, puzzle.given, puzzle.solution]);

  const disabledNumbers = useMemo(() => {
    const counts = Array.from({ length: 10 }, () => 0);
    board.flat().forEach((value) => {
      counts[value] += 1;
    });
    return counts.map((count, value) => (value > 0 && count >= 9 ? value : 0)).filter(Boolean);
  }, [board]);

  const resetMatch = useCallback((nextSeed: string) => {
    const nextPuzzle = generateWithSeed(nextSeed, "medium");
    setPuzzleSeed(nextSeed);
    setPuzzle(nextPuzzle);
    setBoard(cloneBoard(nextPuzzle.puzzle));
    setNotes(emptyNotes());
    setSelected(firstEmpty(nextPuzzle.puzzle, nextPuzzle.given));
    setNotesMode(false);
    setElapsed(0);
    setMistakes(0);
    setCombo(0);
    setComboCells(new Set());
    setComboMessage("");
    setCooldowns(EMPTY_COOLDOWNS);
    setEffects([]);
    setCountdown(3);
    setWinner(null);
    setRewardGranted(false);
    setRewardXp(0);
    setLastIncomingEffect("");
  }, []);

  const syncRoom = useCallback(() => {
    const next = readRoom(code);
    if (next) setRoom(next);
    void readRoomFromServer(code).then((serverRoom) => {
      if (!serverRoom) return;
      if (hasStorage()) localStorage.setItem(roomKey(code), JSON.stringify(serverRoom));
      setRoom(serverRoom);
    }).catch((error) => {
      setStatus(error instanceof Error ? error.message : "PvP временно недоступен.");
    });
  }, [code]);

  useEffect(() => {
    function syncSettings() {
      setSettings(getSettings());
    }

    function syncPlayer() {
      setPlayer(getPlayer() ?? initPlayer());
    }

    window.addEventListener("sl:settings", syncSettings);
    window.addEventListener("sl:player", syncPlayer);
    return () => {
      window.removeEventListener("sl:settings", syncSettings);
      window.removeEventListener("sl:player", syncPlayer);
    };
  }, []);

  useEffect(() => {
    if (!routeCode) return;
    const safeRouteCode = routeCode;
    let cancelled = false;

    async function openRoom() {
      const currentPlayer = getPlayer() ?? initPlayer();
      const ownedByHost = hasStorage() && localStorage.getItem(ownerKey(safeRouteCode)) === "host";
      const nextRole: PlayerRole = ownedByHost ? "host" : "guest";
      try {
        const serverRoom = await readRoomFromServer(safeRouteCode);
        const localRoom = readRoom(safeRouteCode);
        const existing = serverRoom ?? (ownedByHost ? localRoom : null);

        if (!existing && !ownedByHost) {
          if (cancelled) return;
          setCode(safeRouteCode);
          setRole("guest");
          setRoom(null);
          setMatchState("waiting");
          setStatus("Комната не найдена. Попроси друга создать PvP заново и отправить новую ссылку.");
          return;
        }

        const seed = existing?.seed ?? `pvp:${safeRouteCode}:0`;
        const nextRoom = existing
          ? await saveRoom({
              ...existing,
              [nextRole]: participantFromPlayer(currentPlayer)
            })
          : await saveRoom({
              code: safeRouteCode,
              seed,
              guest: nextRole === "guest" ? participantFromPlayer(currentPlayer) : undefined,
              host: nextRole === "host" ? participantFromPlayer(currentPlayer) : undefined,
              hostReady: false,
              guestReady: false,
              hostProgress: 0,
              guestProgress: 0,
              hostFinished: false,
              guestFinished: false,
              updatedAt: Date.now()
            });

        if (cancelled) return;
        setCode(safeRouteCode);
        setRole(nextRole);
        setRoom(nextRoom);
        resetMatch(seed);
        setMatchState(nextRoom.host && nextRoom.guest ? "ready" : "waiting");
        setStatus(
          nextRoom.host && nextRoom.guest
            ? "Друг подключён. Оба игрока могут нажать «Готов»."
            : "Комната открыта по ссылке. Ждём второго игрока."
        );
      } catch (error) {
        if (cancelled) return;
        setStatus(error instanceof Error ? error.message : "Не удалось открыть PvP-комнату.");
      }
    }

    void openRoom();

    return () => {
      cancelled = true;
    };
  }, [resetMatch, routeCode]);

  useEffect(() => {
    window.addEventListener("storage", syncRoom);
    const interval = window.setInterval(syncRoom, 1000);
    return () => {
      window.removeEventListener("storage", syncRoom);
      window.clearInterval(interval);
    };
  }, [syncRoom]);

  useEffect(() => {
    if (!room) return;
    if ((matchState === "waiting" || matchState === "lobby") && friendConnected) {
      setMatchState("ready");
      setStatus("Друг подключён. Проверьте статусы и нажмите «Готов».");
    }
  }, [friendConnected, matchState, room]);

  useEffect(() => {
    if (matchState !== "ready" || !selfReady || !friendReady || !friendConnected) return;
    setMatchState("countdown");
    setCountdown(3);
    setStatus("Оба готовы. Старт через несколько секунд.");
  }, [friendConnected, friendReady, matchState, selfReady]);

  useEffect(() => {
    if (matchState !== "countdown") return;
    if (countdown === 0) {
      setMatchState("playing");
      setStatus("Матч начался. Решай быстрее и используй саботажи с умом.");
      if (room && !room.startedAt) setRoom(writeRoom({ ...room, startedAt: Date.now() }));
      return;
    }
    const timer = window.setTimeout(() => setCountdown((current) => current - 1), 800);
    return () => window.clearTimeout(timer);
  }, [countdown, matchState, room]);

  useEffect(() => {
    if (matchState !== "playing") return;
    const interval = window.setInterval(() => {
      setEffects((current) => current.filter((effect) => effect.until > Date.now()));
      setCooldowns((current) => ({
        fog: Math.max(0, current.fog - 1),
        "remove-notes": Math.max(0, current["remove-notes"] - 1),
        "hidden-combination": Math.max(0, current["hidden-combination"] - 1)
      }));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [matchState]);

  useEffect(() => {
    if (!room || matchState !== "playing") return;
    const nextRoom =
      role === "host"
        ? { ...room, hostProgress: playerProgress }
        : { ...room, guestProgress: playerProgress };
    if (nextRoom.hostProgress !== room.hostProgress || nextRoom.guestProgress !== room.guestProgress) {
      setRoom(writeRoom(nextRoom));
    }
  }, [matchState, playerProgress, role, room]);

  const applyIncomingEffect = useCallback(
    (id: SabotageId) => {
      const ability = SABOTAGE_ABILITIES.find((item) => item.id === id);
      if (!ability) return;

      if (id === "remove-notes") {
        setNotes((current) =>
          current.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              if ((rowIndex + colIndex + elapsed) % 2 !== 0) return cell;
              const next = new Set(cell);
              Array.from(next)
                .slice(0, 2)
                .forEach((value) => next.delete(value));
              return next;
            })
          )
        );
      }

      setEffects((current) => [
        ...current.filter((item) => item.id !== id),
        {
          id,
          until: Date.now() + ability.duration * 1000,
          fogZones: id === "fog" ? randomFogZone(elapsed + ability.cooldown) : undefined
        }
      ]);
      setStatus(`Друг применил: ${ability.name}.`);
    },
    [elapsed]
  );

  useEffect(() => {
    if (!room?.lastEffect || room.lastEffect.from === role || room.lastEffect.nonce === lastIncomingEffect) return;
    setLastIncomingEffect(room.lastEffect.nonce);
    applyIncomingEffect(room.lastEffect.id);
    playFeedback(settings, "sabotage");
  }, [applyIncomingEffect, lastIncomingEffect, role, room?.lastEffect, settings]);

  useEffect(() => {
    if (matchState !== "playing" || !room) return;
    if (isBoardComplete(board, puzzle.solution)) {
      const nextRoom = role === "host" ? { ...room, hostFinished: true, hostProgress: 100 } : { ...room, guestFinished: true, guestProgress: 100 };
      setRoom(writeRoom(nextRoom));
      setWinner("player");
      setMatchState("finished");
      return;
    }
    if (friendFinished) {
      setWinner("friend");
      setMatchState("finished");
      playFeedback(settings, "error");
    }
  }, [board, friendFinished, matchState, puzzle.solution, role, room, settings]);

  useEffect(() => {
    if (matchState !== "finished" || !winner || rewardGranted) return;
    const won = winner === "player";
    const xp = pvpXpReward(won, player.streak || 1);

    if (won) {
      recordSolvedGame({ time: elapsed, mistakes, hintsUsed: 0, difficulty: puzzle.difficulty, arenaWin: true });
    } else {
      const current = getPlayer() ?? player;
      const nextXp = (current.xp ?? 0) + xp;
      updatePlayer({ xp: nextXp, level: Math.floor(nextXp / 300) + 1, rank: rankForXp(nextXp) });
    }
    setRewardXp(xp);
    setRewardGranted(true);
    playFeedback(settings, won ? "victory" : "sabotage");
  }, [elapsed, matchState, mistakes, player, puzzle.difficulty, rewardGranted, settings, winner]);

  async function createLobby() {
    const currentPlayer = getPlayer() ?? initPlayer();
    setStatus("Создаём комнату...");

    try {
      const nextRoom = await saveRoom(createRoom(code, currentPlayer));
      if (hasStorage()) localStorage.setItem(ownerKey(code), "host");
      setPlayer(currentPlayer);
      setRole("host");
      setRoom(nextRoom);
      resetMatch(nextRoom.seed);
      setMatchState("waiting");
      setStatus("Комната создана. Скопируй ссылку и отправь её другу.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось создать PvP-комнату.");
    }
  }

  function copyInvite() {
    void navigator.clipboard?.writeText(inviteLink);
    setStatus("Ссылка скопирована. Отправь её другу вручную.");
  }

  function markTutorialSeen() {
    localStorage.setItem("sl_pvp_tutorial_seen", "true");
    setTutorialOpen(false);
  }

  function markReady() {
    if (!room) return;
    const nextRoom = role === "host" ? { ...room, hostReady: true } : { ...room, guestReady: true };
    setRoom(writeRoom(nextRoom));
    setStatus(friendConnected ? "Ты готов. Ждём готовность друга." : "Ты готов. Ждём друга по ссылке.");
  }

  function fireSabotage(id: SabotageId) {
    const ability = SABOTAGE_ABILITIES.find((item) => item.id === id);
    if (!ability || cooldowns[id] > 0 || matchState !== "playing" || !room || !friendConnected) return;
    setCooldowns((current) => ({ ...current, [id]: ability.cooldown }));
    setRoom(
      writeRoom({
        ...room,
        lastEffect: {
          id,
          from: role,
          nonce: `${role}:${id}:${Date.now()}`,
          createdAt: Date.now()
        }
      })
    );
    setStatus(`Саботаж отправлен другу: ${ability.name}.`);
    playFeedback(settings, "sabotage");
  }

  function placeNumber(value: number) {
    if (!selected || matchState !== "playing" || puzzle.given[selected.row][selected.col]) return;

    if (notesMode) {
      const nextNotes = notes.map((row) => row.map((cell) => new Set(cell)));
      const cell = nextNotes[selected.row][selected.col];
      if (cell.has(value)) cell.delete(value);
      else cell.add(value);
      setNotes(nextNotes);
      playFeedback(settings, "tap");
      return;
    }

    const next = cloneBoard(board);
    const previous = next[selected.row][selected.col];
    if (previous === value) {
      playFeedback(settings, "tap");
      return;
    }

    next[selected.row][selected.col] = value;
    const correct = value === puzzle.solution[selected.row][selected.col];
    const comboKey = keyOf(selected);
    let nextCombo = combo;

    if (correct && !comboCells.has(comboKey)) {
      nextCombo = combo + 1;
      setComboCells((current) => new Set(current).add(comboKey));
      setCombo(nextCombo);
      if (COMBO_MILESTONES[nextCombo]) {
        setComboMessage(COMBO_MILESTONES[nextCombo]);
        window.setTimeout(() => setComboMessage(""), 1200);
      }
    } else if (!correct) {
      nextCombo = 0;
      setCombo(0);
      setComboMessage("");
      setMistakes((current) => current + 1);
    }

    setBoard(next);
    playFeedback(settings, correct ? (nextCombo >= 3 ? "combo" : "success") : "error");
  }

  function eraseSelected() {
    if (!selected || puzzle.given[selected.row][selected.col] || matchState !== "playing") return;
    const next = cloneBoard(board);
    next[selected.row][selected.col] = 0;
    setBoard(next);
    playFeedback(settings, "tap");
  }

  function rematch() {
    if (!room) return;
    const nextSeed = `pvp:${code}:${Date.now()}`;
    const nextRoom = writeRoom({
      ...room,
      seed: nextSeed,
      hostReady: false,
      guestReady: false,
      hostProgress: 0,
      guestProgress: 0,
      hostFinished: false,
      guestFinished: false,
      startedAt: undefined,
      lastEffect: undefined
    });
    setRoom(nextRoom);
    resetMatch(nextSeed);
    setMatchState(friendConnected ? "ready" : "waiting");
    setStatus("Реванш готов. Оба игрока снова должны нажать «Готов».");
  }

  return (
    <main className="page-shell arena-page">
      {comboMessage ? <div className="combo-celebration">{comboMessage}</div> : null}

      <section className="arena-hero">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-cyan-300">PvP-саботаж</p>
          <h1 className="mt-1 text-3xl font-black text-white md:text-5xl">Матч с другом на одной доске</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Создай приватную комнату, отправь ссылку другу, дождись подключения и стартуй только после готовности обоих игроков.
          </p>
        </div>
        <div className="arena-season-panel">
          <span>Приватная комната</span>
          <strong>{code}</strong>
          <small>{status}</small>
        </div>
      </section>

      {matchState === "lobby" ? (
        <section className="arena-scoreboard">
          <div>
            <span>Комната</span>
            <strong>Ещё не создана</strong>
            <small>После создания появится уникальная ссылка. Никто не подключится автоматически.</small>
          </div>
          <button type="button" className="btn-primary" onClick={createLobby}>
            Создать PvP
          </button>
        </section>
      ) : (
        <section className="arena-scoreboard">
          <div className="arena-player-card">
            <span>Вы</span>
            <strong>{player.name}</strong>
            <small>
              {rankLabel(player.rank ?? "bronze-i")} · {selfReady ? "готов" : "не готов"}
            </small>
            <div className="progress-rail">
              <span style={{ width: `${playerProgress}%` }} />
            </div>
            <em>{playerProgress}% готово</em>
          </div>
          <Timer seconds={elapsed} running={matchState === "playing"} onTick={setElapsed} />
          <div className="arena-player-card">
            <span>Друг</span>
            <strong>{friend?.name ?? "Ожидание друга"}</strong>
            <small>
              {friendConnected ? `${rankLabel(friend?.rank ?? "bronze-i")} · ${friendReady ? "готов" : "не готов"}` : "подключение только по ссылке"}
            </small>
            <div className="progress-rail danger">
              <span style={{ width: `${friendProgress}%` }} />
            </div>
            <em>{friendConnected ? `${friendProgress}% готово` : "ждём подключения"}</em>
          </div>
        </section>
      )}

      {matchState === "waiting" || matchState === "ready" ? (
        <section className="info-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-primary">Лобби</p>
              <h2 className="text-xl font-black text-slate-950">{friendConnected ? "Друг подключён" : "Ожидание друга"}</h2>
              <p className="mt-2 break-all text-sm font-semibold text-slate-600">{inviteLink}</p>
            </div>
            <button type="button" className="btn-secondary" onClick={copyInvite}>
              Скопировать ссылку
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="stat-pill">
              <span>Ваш статус</span>
              <strong>{selfReady ? "Готов" : "Не готов"}</strong>
            </div>
            <div className="stat-pill">
              <span>Статус друга</span>
              <strong>{friendConnected ? (friendReady ? "Готов" : "Не готов") : "Не подключён"}</strong>
            </div>
          </div>
          {!friendConnected ? (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
              Случайный соперник и бот отключены. Матч начнётся только когда друг откроет ссылку и нажмёт «Готов».
            </p>
          ) : null}
          <button type="button" className="btn-primary mt-4" onClick={markReady} disabled={selfReady}>
            {selfReady ? "Вы готовы" : "Готов"}
          </button>
        </section>
      ) : null}

      {matchState === "countdown" ? (
        <section className="arena-countdown" aria-live="polite">
          {countdown > 0 ? countdown : "СТАРТ"}
        </section>
      ) : null}

      {matchState === "playing" || matchState === "finished" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,480px)_minmax(280px,360px)_minmax(220px,320px)] xl:items-start">
          <div className="grid gap-3">
            <Board
              board={board}
              given={puzzle.given}
              notes={notes}
              selected={selected}
              errors={errors}
              numberStyle={settings.numberStyle ?? "classic"}
              fogZones={playerFog}
              hideAssist={playerAssistHidden}
              locked={matchState !== "playing"}
              onSelect={(row, col) => setSelected({ row, col })}
            />
            {matchState === "finished" ? (
              <div className={`arena-result ${winner === "player" ? "arena-result-win" : "arena-result-loss"}`}>
                <strong>{winner === "player" ? "Победа" : "Друг завершил раньше"}</strong>
                <span>{winner === "player" ? "Ты решил судоку первым в этой комнате." : "Результат получен из приватной комнаты."}</span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4">
            <Controls
              notesMode={notesMode}
              disabledNumbers={disabledNumbers}
              canUndo={false}
              numberStyle={settings.numberStyle ?? "classic"}
              locked={matchState !== "playing"}
              onNumber={placeNumber}
              onUndo={() => undefined}
              onToggleNotes={() => setNotesMode((current) => !current)}
              onErase={eraseSelected}
              onHint={() => setStatus("В PvP подсказки не дают ответ: проверяй строку, столбец и квадрат.")}
              onToggleOrnament={() => undefined}
              onOpenOrnamentLegend={() => undefined}
            />

            <section className="arena-energy-panel">
              <div>
                <span>Состояние матча</span>
                <strong>{combo > 1 ? `Комбо x${combo}` : "Чистая гонка"}</strong>
              </div>
              <p>{status}</p>
            </section>
          </div>

          <aside className="arena-side">
            <h2>Саботажи</h2>
            <div className="grid gap-2">
              {SABOTAGE_ABILITIES.map((ability) => (
                <button
                  key={ability.id}
                  type="button"
                  className="sabotage-card"
                  disabled={cooldowns[ability.id] > 0 || matchState !== "playing" || !friendConnected}
                  onClick={() => fireSabotage(ability.id)}
                >
                  <span>
                    <strong>{ability.name}</strong>
                    <small>{ability.description}</small>
                  </span>
                  <em>{!friendConnected ? "Ждём друга" : cooldowns[ability.id] ? `${cooldowns[ability.id]}с` : "Готово"}</em>
                </button>
              ))}
            </div>

            <div className="arena-friend-status">
              <p>Друг</p>
              <strong>{friend?.name ?? "Не подключён"}</strong>
              <span>{friendConnected ? `${friendProgress}% прогресс` : "Ссылка ожидает игрока"}</span>
            </div>
          </aside>
        </div>
      ) : null}

      {matchState === "finished" ? (
        <section className="arena-end-screen">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Итог матча</p>
            <h2 className="text-2xl font-black text-slate-950">{winner === "player" ? "Победитель: ты" : "Победитель: друг"}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">+{rewardXp} XP</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-primary" onClick={rematch}>
              Реванш
            </button>
            <Link className="btn-secondary" href="/">
              Выйти
            </Link>
          </div>
        </section>
      ) : null}

      {tutorialOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <p className="text-xs font-bold uppercase text-primary">Первый вход в PvP</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Только приглашение друга</h2>
            <div className="mt-4 grid gap-2">
              <div className="diamond-wallet-row"><strong>✓ Приватная комната создаётся по коду</strong></div>
              <div className="diamond-wallet-row"><strong>✓ Случайный подбор и боты отключены</strong></div>
              <div className="diamond-wallet-row"><strong>✓ Старт только после готовности обоих игроков</strong></div>
              <div className="diamond-wallet-row"><strong>✓ Саботажи отправляются только подключённому другу</strong></div>
            </div>
            <button type="button" className="btn-primary mt-5 w-full" onClick={markTutorialSeen}>
              Понятно
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
