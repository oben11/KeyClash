// Final screen: who won, plus everyone's stats.
import { Actions, Button, Hint, Screen } from '../components/ui';
import { animate, stagger, useAnimate } from '../animate';
import type { PlayerResult } from '../../shared/protocol';

type Props = { results: PlayerResult[]; myId: string; isHost: boolean; onRematch: () => void; onLeave: () => void };

export function Results({ results, myId, isHost, onRematch, onLeave }: Props) {
  const winner = results[0]; // the server sends the winner first

  // Table rows slide in one after another.
  const bodyRef = useAnimate<HTMLTableSectionElement>((el) =>
    animate(Array.from(el.children), { opacity: [0, 1], translateX: [-16, 0], delay: stagger(140, { start: 300 }), duration: 450, ease: 'outQuad' }),
  );

  return (
    <Screen>
      <h2 className="text-4xl font-bold">{winner.id === myId ? 'You win' : `${winner.name} wins`}</h2>

      <div className="overflow-x-auto rounded-lg bg-panel">
        <table className="w-full min-w-[420px] text-left">
          <thead className="text-dim">
            <tr>
              {['Player', 'WPM', 'Accuracy', 'Time'].map((h) => <th key={h} className="p-4 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody ref={bodyRef} className="font-mono">
            {results.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className={`p-4 font-sans ${r.won ? 'font-bold text-sun' : ''}`}>
                  {r.name}{r.id === myId && <span className="text-dim"> (you)</span>}
                </td>
                <td className="p-4">{r.wpm}</td>
                <td className="p-4">{r.accuracy}%</td>
                {/* Players who didn't finish show how far they got instead of a time. */}
                <td className="p-4">{r.progress < 100 ? `${r.progress}% done` : `${(r.timeMs / 1000).toFixed(1)}s`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Actions onLeave={onLeave}>
        {isHost ? <Button onClick={onRematch}>Back to lobby</Button> : <Hint>Waiting for the host…</Hint>}
      </Actions>
    </Screen>
  );
}
