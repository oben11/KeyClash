// Big centered "3, 2, 1, Go" over the whole screen before the race starts.
import { animate, useAnimate } from '../animate';

export function Countdown({ msLeft }: { msLeft: number }) {
  const label = msLeft > 0 ? String(Math.ceil(msLeft / 1000)) : 'Go';
  const isGo = label === 'Go';

  // Each time the label changes, the number pops in (big -> normal size, transparent -> solid).
  const numberRef = useAnimate<HTMLSpanElement>(
    (el) => animate(el, { scale: [1.7, 1], opacity: [0, 1], duration: 650, ease: 'outExpo' }),
    [label],
  );

  // When it says "Go", fade the whole overlay away. (Only runs when isGo becomes true.)
  const overlayRef = useAnimate<HTMLDivElement>(
    (el) => (isGo ? animate(el, { opacity: 0, delay: 350, duration: 400, ease: 'inQuad' }) : undefined),
    [isGo],
  );

  return (
    <div
      ref={overlayRef}
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center bg-ink/70 backdrop-blur-sm"
    >
      <span ref={numberRef} className="inline-block font-mono text-9xl font-medium text-sun">{label}</span>
    </div>
  );
}
