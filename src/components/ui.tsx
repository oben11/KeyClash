// Small reusable building blocks used by several screens.
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { animate, stagger, useAnimate } from '../animate';

const buttonStyles = {
  primary: 'bg-sun text-ink hover:brightness-110',
  ghost: 'bg-panel text-white hover:bg-white/10',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return (
    <button
      className={`rounded-lg px-5 py-3 font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun disabled:cursor-not-allowed disabled:opacity-40 ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export function TextField({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg bg-panel px-4 py-3 text-white outline-none placeholder:text-dim focus-visible:ring-2 focus-visible:ring-sun ${className}`}
      {...props}
    />
  );
}

export const Hint = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <p className={`text-dim ${className}`}>{children}</p>
);

/** The flashing yellow cursor. Pass classes for size/position. */
export function Cursor({ className = '' }: { className?: string }) {
  // Fade 1 -> 0 and back, forever.
  const ref = useAnimate<HTMLSpanElement>((el) =>
    animate(el, { opacity: [1, 0], duration: 500, ease: 'inOutSine', alternate: true, loop: true }),
  );
  return <span ref={ref} className={`bg-sun ${className}`} />;
}

/** Wraps a screen: its direct children fade/slide in one after another. */
export function Screen({ children }: { children: ReactNode }) {
  const ref = useAnimate<HTMLDivElement>((el) =>
    animate(Array.from(el.children), { opacity: [0, 1], translateY: [14, 0], duration: 420, delay: stagger(70), ease: 'outQuad' }),
  );
  return <div ref={ref} className="flex flex-col gap-8">{children}</div>;
}

/** Bottom row of a screen: your buttons on the left, "Leave" pushed to the right. */
export function Actions({ children, onLeave }: { children: ReactNode; onLeave: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {children}
      <Button variant="ghost" className="ml-auto" onClick={onLeave}>Leave</Button>
    </div>
  );
}
