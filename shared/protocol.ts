/**
 * The "language" the browser and the server speak over the WebSocket.
 *
 * Both sides import these types, so TypeScript will complain if one side
 * sends a message the other doesn't understand. Every message is a JSON
 * object with a `t` ("type") field that says what kind of message it is.
 */

/**
 * Bump this whenever a message changes. Client and server compare it, so if one side is running
 * old code (a stale server, or a cached page) you get a clear error instead of silent weirdness.
 */
export const PROTOCOL_VERSION = 2;

/** Where a room is in its life: waiting for players, racing, or showing results. */
export type Phase = 'lobby' | 'race' | 'results';

export type PlayerInfo = { id: string; name: string; host: boolean };

export type PlayerResult = {
  id: string;
  name: string;
  wpm: number;
  accuracy: number; // percent, e.g. 96.5
  timeMs: number;
  progress: number; // percent of the quote typed correctly (100 = finished)
  won: boolean;
};

/** Browser -> server */
export type ClientMsg =
  | { t: 'create'; v: number; name: string }                      // make a new lobby
  | { t: 'join'; v: number; name: string; code: string }          // join an existing lobby
  | { t: 'start' }                                     // host only: begin the race
  | { t: 'progress'; typed: string; mistakes: number } // sent on every keystroke
  | { t: 'rematch' };                                  // host only: back to the lobby

/** Server -> browser */
export type ServerMsg =
  | { t: 'lobby'; v: number; phase: Phase; code: string; you: string; players: PlayerInfo[] }
  | { t: 'start'; quote: string; countdownMs: number }
  | { t: 'progress'; progress: Record<string, number> } // playerId -> characters typed correctly
  | { t: 'results'; results: PlayerResult[] }
  | { t: 'error'; msg: string };
