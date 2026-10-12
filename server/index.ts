/**
 * The Keyclash game server.
 *
 * It does two jobs:
 *   1. Serves the built website (the `dist` folder) over plain HTTP.
 *   2. Runs the multiplayer game over WebSockets at the path /ws.
 *
 * The server is the referee: players only tell it what they typed, and the
 * server works out progress, who won, and everyone's stats. All game state
 * lives in memory in the `rooms` map below (restart the server = rooms gone).
 */
import { createServer, type ServerResponse } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { AddressInfo } from 'net';
import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMsg, Phase, PlayerResult, ServerMsg } from '../shared/protocol';

// Swap this for a call to a quotes API if you want fresh content.
const QUOTES = [
  'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
  'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.',
  'Call me Ishmael. Some years ago, never mind how long precisely, I thought I would sail about a little and see the watery part of the world.',
  "Why, sometimes I've believed as many as six impossible things before breakfast.",
  "All the world's a stage, and all the men and women merely players; they have their exits and their entrances.",
  'To thine own self be true, and it must follow, as the night the day, thou canst not then be false to any man.',
  'We are all in the gutter, but some of us are looking at the stars.',
  'An investment in knowledge pays the best interest.',
  'Well done is better than well said.',
  'Go confidently in the direction of your dreams. Live the life you have imagined.',
  'You see, but you do not observe. The distinction is clear.',
  'The reports of my death are greatly exaggerated.',
];

const MAX_PLAYERS = 4;
const COUNTDOWN_MS = 3000;

type Player = {
  id: string;
  name: string;
  ws: WebSocket;
  typed: string;     // everything this player has typed so far
  mistakes: number;  // wrong keystrokes made, even ones fixed later (used for accuracy)
};

type Room = {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  phase: Phase;
  quote: string;
  startAt: number; // timestamp (ms) when typing is allowed
};

const rooms = new Map<string, Room>(); // lobby code -> room

// ---------- small helpers ----------

const send = (ws: WebSocket, msg: ServerMsg) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

const broadcast = (room: Room, msg: ServerMsg) => room.players.forEach((p) => send(p.ws, msg));

/** Tell everyone who is in the room. `you` differs per player, so we loop. */
const sendLobby = (room: Room) =>
  room.players.forEach((p) =>
    send(p.ws, {
      t: 'lobby',
      phase: room.phase,
      code: room.code,
      you: p.id,
      players: [...room.players.values()].map((x) => ({ id: x.id, name: x.name, host: x.id === room.hostId })),
    }),
  );

/** Letters that are in the right place. (The server re-checks; it never trusts the client.) */
const countCorrect = (typed: string, quote: string) => typed.split('').filter((c, i) => c === quote[i]).length;

function createRoom(): Room {
  // No 0/O/1/I so codes are easy to read aloud.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  const room: Room = { code, hostId: '', players: new Map(), phase: 'lobby', quote: '', startAt: 0 };
  rooms.set(code, room);
  return room;
}

/** The race is over: work out everyone's stats and send them out. */
function finishRace(room: Room, winner: Player) {
  room.phase = 'results';
  const timeMs = Date.now() - room.startAt;

  const results: PlayerResult[] = [...room.players.values()]
    .map((p) => {
      const correct = countCorrect(p.typed, room.quote);
      const attempts = correct + p.mistakes;
      return {
        id: p.id,
        name: p.name,
        timeMs,
        won: p.id === winner.id,
        wpm: Math.round(correct / 5 / (timeMs / 60000)), // a "word" is 5 characters
        accuracy: attempts ? Math.round((1000 * correct) / attempts) / 10 : 100,
        progress: Math.round((100 * correct) / room.quote.length),
      };
    })
    .sort((a, b) => Number(b.won) - Number(a.won) || b.progress - a.progress); // winner first

  broadcast(room, { t: 'results', results });
}

// ---------- the server itself ----------

const MIME: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};

/** Starts everything. Falls back to a random free port if `port` is taken. */
export function startServer({ port, distDir }: { port: number; distDir: string }) {
  // ----- HTTP: hand out the website files -----
  const sendFile = async (res: ServerResponse, file: string) => {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  };

  const web = createServer(async (req, res) => {
    const urlPath = (req.url ?? '/').split('?')[0];
    const file = join(distDir, urlPath === '/' ? 'index.html' : urlPath);
    try {
      if (!file.startsWith(distDir)) throw new Error('outside dist'); // block ../ tricks
      await sendFile(res, file);
    } catch {
      // Not a real file -> serve index.html (normal for single-page apps).
      try {
        await sendFile(res, join(distDir, 'index.html'));
      } catch {
        res.writeHead(404);
        res.end('Run "npm run build" first.');
      }
    }
  });

  // ----- WebSocket: the game -----
  const wss = new WebSocketServer({ server: web, path: '/ws' });

  // Runs once for every browser that connects.
  wss.on('connection', (ws) => {
    let room: Room | undefined; // the room this connection belongs to (once it joins one)
    let me: Player | undefined; // and which player it is

    ws.on('message', (raw) => {
      let msg: ClientMsg;
      try { msg = JSON.parse(String(raw)); } catch { return; } // ignore garbage

      // --- creating or joining a lobby ---
      if (msg.t === 'create' || msg.t === 'join') {
        if (room) return; // already in one
        const name = String(msg.name).trim().slice(0, 16) || 'Player';
        const target = msg.t === 'create' ? createRoom() : rooms.get(String(msg.code).toUpperCase());

        if (!target) return send(ws, { t: 'error', msg: 'No lobby with that code.' });
        if (target.phase !== 'lobby') return send(ws, { t: 'error', msg: 'That race has already started.' });
        if (target.players.size >= MAX_PLAYERS) return send(ws, { t: 'error', msg: `Lobby is full (${MAX_PLAYERS} players).` });

        me = { id: randomUUID().slice(0, 8), name, ws, typed: '', mistakes: 0 };
        if (msg.t === 'create') target.hostId = me.id; // the creator is the host
        target.players.set(me.id, me);
        room = target;
        sendLobby(target);
        return;
      }

      // Everything below needs a joined player.
      if (!room || !me) return;
      const r = room;
      const player = me;

      if (msg.t === 'start') {
        if (r.hostId !== player.id || r.phase !== 'lobby' || r.players.size < 2) return;
        r.phase = 'race';
        r.quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        r.startAt = Date.now() + COUNTDOWN_MS;
        r.players.forEach((p) => { p.typed = ''; p.mistakes = 0; });
        broadcast(r, { t: 'start', quote: r.quote, countdownMs: COUNTDOWN_MS });
      } else if (msg.t === 'progress') {
        if (r.phase !== 'race' || Date.now() < r.startAt) return; // too early / race over
        player.typed = String(msg.typed).slice(0, r.quote.length);
        player.mistakes = Math.max(0, Math.floor(Number(msg.mistakes)) || 0);
        const progress = Object.fromEntries([...r.players.values()].map((p) => [p.id, p.typed.length]));
        broadcast(r, { t: 'progress', progress });
        if (player.typed === r.quote) finishRace(r, player); // first to type it all wins
      } else if (msg.t === 'rematch') {
        if (r.hostId !== player.id || r.phase !== 'results') return;
        r.phase = 'lobby';
        sendLobby(r);
      }
    });

    ws.on('close', () => {
      if (!room || !me) return;
      const r = room;
      r.players.delete(me.id);
      if (r.players.size === 0) { rooms.delete(r.code); return; } // empty room: forget it
      if (r.hostId === me.id) r.hostId = [...r.players.keys()][0]; // pass host to someone else
      if (r.phase === 'race' && r.players.size < 2) finishRace(r, [...r.players.values()][0]); // opponent left
      sendLobby(r);
    });
  });

  return new Promise<{ port: number; close: () => void }>((resolve) => {
    const listen = (p: number) => {
      web.once('error', (e: NodeJS.ErrnoException) => { if (e.code === 'EADDRINUSE' && p !== 0) listen(0); });
      web.listen(p, () =>
        resolve({
          port: (web.address() as AddressInfo).port,
          close: () => { wss.close(); web.closeAllConnections(); web.close(); },
        }),
      );
    };
    listen(port);
  });
}
