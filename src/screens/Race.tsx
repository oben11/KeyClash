// The race screen. Pieces:
//   RaceTrack  - everyone's progress bars
//   Quote      - the text you're typing, colored letter by letter
//   <input>    - invisible; it catches the keystrokes (see useTyping.ts)
//   Countdown  - the "3, 2, 1, Go" overlay
import { useEffect, useState } from 'react';
import { useTyping } from '../useTyping';
import { Screen } from '../components/ui';
import { Quote } from '../components/Quote';
import { RaceTrack } from '../components/RaceTrack';
import { Countdown } from '../components/Countdown';
import type { PlayerInfo } from '../../shared/protocol';

type Props = {
  quote: string;
  startAt: number;
  players: PlayerInfo[];
  myId: string;
  progress: Record<string, number>;
  onProgress: (typed: string, mistakes: number) => void;
};

export function Race({ quote, startAt, players, myId, progress, onProgress }: Props) {
  // A clock that updates 10x per second, so the countdown and WPM refresh.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const msLeft = startAt - now;
  const started = msLeft <= 0;
  const { typed, correct, inputProps } = useTyping(quote, started, onProgress);

  // Words per minute: a "word" is 5 characters.
  const minutes = (now - startAt) / 60000;
  const wpm = started && minutes > 0.01 ? Math.round(correct / 5 / minutes) : 0;

  return (
    <>
      <Screen>
        <RaceTrack players={players} myId={myId} myTyped={typed.length} progress={progress} total={quote.length} />

        {/* Clicking the text re-focuses the hidden input (handy if you click away). */}
        <div className="relative cursor-text" onClick={() => inputProps.ref.current?.focus()}>
          <Quote quote={quote} typed={typed} showCursor={started} />
          <input
            {...inputProps}
            className="absolute inset-0 h-full w-full opacity-0"
            autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false}
            aria-label="Type the quote here"
          />
        </div>

        <p className="font-mono text-dim">{wpm} wpm</p>
      </Screen>

      {/* Keep it mounted a moment after "Go" so its fade-out can play. */}
      {msLeft > -800 && <Countdown msLeft={msLeft} />}
    </>
  );
}
