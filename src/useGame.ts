// All the networking lives here. This hook opens the WebSocket, listens to
// messages from the server, and turns them into React state. Screens never
// touch the socket: they read state and call the functions returned below.
import { useRef, useState } from 'react';
import { PROTOCOL_VERSION, type ClientMsg, type PlayerInfo, type PlayerResult, type ServerMsg } from '../shared/protocol';

/** Which screen to show. (The server only knows lobby/race/results; "home" is client-only.) */
export type View = 'home' | 'lobby' | 'race' | 'results';

export function useGame() {
  const socket = useRef<WebSocket | null>(null); // a ref: changing it doesn't re-render

  // React state: when any of these change, the screen updates.
  const [view, setView] = useState<View>('home');
  const [myId, setMyId] = useState('');
  const [code, setCode] = useState('');
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [quote, setQuote] = useState('');
  const [startAt, setStartAt] = useState(0); // local timestamp when typing unlocks
  const [progress, setProgress] = useState<Record<string, number>>({}); // playerId -> chars typed correctly
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [error, setError] = useState('');

  const send = (msg: ClientMsg) => socket.current?.send(JSON.stringify(msg));

  /** Open a connection, and send `firstMsg` (create/join) as soon as it's ready. */
  function connect(firstMsg: ClientMsg) {
    setError('');
    socket.current?.close();

    // Same host as the page, path /ws (Vite proxies it to the server in dev).
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${location.host}/ws`);
    socket.current = ws;

    ws.onopen = () => ws.send(JSON.stringify(firstMsg));

    // One message from the server -> update state.
    ws.onmessage = (event) => {
      const msg: ServerMsg = JSON.parse(event.data);
      switch (msg.t) {
        case 'lobby':
          if (msg.v !== PROTOCOL_VERSION) { // the server is running old code
            socket.current = null;
            ws.close();
            setView('home');
            setError('The server is running old code. Stop any other Keyclash server (check port 3001) and restart.');
            break;
          }
          setMyId(msg.you);
          setCode(msg.code);
          setPlayers(msg.players);
          if (msg.phase === 'lobby') setView('lobby'); // don't yank people off the results screen
          break;
        case 'start':
          setQuote(msg.quote);
          setStartAt(Date.now() + msg.countdownMs); // use our own clock for the countdown
          setProgress({});
          setView('race');
          break;
        case 'progress':
          setProgress(msg.progress);
          break;
        case 'results':
          setResults(msg.results);
          setView('results');
          break;
        case 'error':
          setError(msg.msg);
          break;
      }
    };

    ws.onclose = () => {
      if (socket.current === ws) { // ignore closes we caused ourselves
        socket.current = null;
        setView('home');
        setError((old) => old || 'Connection lost.');
      }
    };
  }

  function leave() {
    const ws = socket.current;
    socket.current = null; // clear first so onclose knows this was on purpose
    ws?.close();
    setView('home');
    setPlayers([]);
  }

  return {
    view, myId, code, players, quote, startAt, progress, results, error,
    isHost: players.find((p) => p.id === myId)?.host ?? false,
    createLobby: (name: string) => connect({ t: 'create', v: PROTOCOL_VERSION, name }),
    joinLobby: (name: string, code: string) => connect({ t: 'join', v: PROTOCOL_VERSION, name, code }),
    startRace: () => send({ t: 'start' }),
    sendProgress: (typed: string, mistakes: number) => send({ t: 'progress', typed, mistakes }),
    rematch: () => send({ t: 'rematch' }),
    leave,
  };
}
