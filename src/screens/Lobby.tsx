// Waiting room: shows the lobby code, who has joined, and (for the host) a Start button.
import { useState } from 'react';
import { Actions, Button, Hint, Screen } from '../components/ui';
import type { PlayerInfo } from '../../shared/protocol';

type Props = { code: string; myId: string; players: PlayerInfo[]; isHost: boolean; onStart: () => void; onLeave: () => void };

export function Lobby({ code, myId, players, isHost, onStart, onLeave }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyInviteLink() {
    await navigator.clipboard?.writeText(`${location.origin}/?code=${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Screen>
      <header className="space-y-4">
        <div>
          <Hint>Lobby code</Hint>
          <p className="font-mono text-6xl font-medium tracking-[0.2em] text-sun">{code}</p>
        </div>
        <Button variant="ghost" onClick={copyInviteLink}>{copied ? 'Link copied' : 'Copy invite link'}</Button>
      </header>

      <ul className="divide-y divide-white/10 rounded-lg bg-panel">
        {players.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-3">
            <span>{p.name}{p.id === myId && <span className="text-dim"> (you)</span>}</span>
            {p.host && <span className="text-sm text-sun">Host</span>}
          </li>
        ))}
      </ul>

      <Actions onLeave={onLeave}>
        {isHost ? <Button disabled={players.length < 2} onClick={onStart}>Start race</Button> : <Hint>Waiting for the host to start…</Hint>}
        {isHost && players.length < 2 && <Hint>Need at least 2 players.</Hint>}
      </Actions>
    </Screen>
  );
}
