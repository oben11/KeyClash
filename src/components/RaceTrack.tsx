// The progress bars at the top of the race: one row per player.
import { useEffect, useRef } from 'react';
import { animate, prefersReducedMotion } from '../animate';
import type { PlayerInfo } from '../../shared/protocol';

/** A bar whose width glides to the new percentage whenever `pct` changes. */
function ProgressBar({ pct, isMe }: { pct: number; isMe: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = ref.current!;
    if (prefersReducedMotion()) { bar.style.width = `${pct}%`; return; }
    const animation = animate(bar, { width: `${pct}%`, duration: 200, ease: 'outQuad' });
    return () => { animation.pause(); };
  }, [pct]);

  return (
    <div className="h-2 flex-1 rounded-full bg-panel">
      {/* style width is only the starting point; anime.js takes over after mount */}
      <div ref={ref} style={{ width: '0%' }} className={`h-2 rounded-full ${isMe ? 'bg-sun' : 'bg-white'}`} />
    </div>
  );
}

type Props = { players: PlayerInfo[]; myId: string; myTyped: number; progress: Record<string, number>; total: number };

export function RaceTrack({ players, myId, myTyped, progress, total }: Props) {
  return (
    <div className="space-y-3" aria-label="Race progress">
      {players.map((p) => {
        const isMe = p.id === myId;
        // Use our own typing for our bar (instant); the server's numbers for everyone else.
        const typed = isMe ? myTyped : progress[p.id] ?? 0;
        const pct = Math.round((typed / total) * 100);
        return (
          <div key={p.id} className="flex items-center gap-3">
            <span className="w-24 truncate text-sm text-dim">{isMe ? 'You' : p.name}</span>
            <ProgressBar pct={pct} isMe={isMe} />
            <span className="w-10 text-right font-mono text-sm text-dim">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
