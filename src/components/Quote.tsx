// Draws the quote one letter at a time, colored by how you've typed it:
//   not typed yet -> gray, correct -> white, wrong -> red.
// The flashing cursor sits just before the next letter to type.
import { Cursor } from './ui';

export function Quote({ quote, typed, showCursor }: { quote: string; typed: string; showCursor: boolean }) {
  return (
    <p className="select-none whitespace-pre-wrap break-words font-mono text-2xl leading-relaxed sm:text-3xl">
      {quote.split('').map((char, i) => {
        const t = typed[i]; // what the player typed in this position (undefined if not yet)
        const color =
          t === undefined ? 'text-dim'
          : t === char ? 'text-white'
          : char === ' ' ? 'bg-miss/40 text-miss' // wrong on a space: highlight so it's visible
          : 'text-miss';

        return (
          <span key={i} className="relative">
            {showCursor && i === typed.length && (
              <Cursor className="absolute left-0 top-[0.12em] h-[1.1em] w-[3px] -translate-x-1/2" />
            )}
            <span className={color}>{char}</span>
          </span>
        );
      })}
    </p>
  );
}
