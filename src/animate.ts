// A tiny wrapper around anime.js so components can animate with one line.
// anime.js: animate(element, { property: [from, to], duration, ease }) moves
// CSS properties smoothly. stagger(ms) delays each item in a list a bit more.
import { useLayoutEffect, useRef, type DependencyList } from 'react';
import { animate } from 'animejs';

export { animate, stagger } from 'animejs';

// People can ask their OS to reduce motion; we respect that by skipping animations.
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Runs an animation on an element after React renders, and again whenever `deps` change.
 *   const ref = useAnimate<HTMLDivElement>((el) => animate(el, { opacity: [0, 1] }));
 *   return <div ref={ref}>...</div>;
 * Returns the ref to attach. Cleans up (reverts) automatically.
 */
export function useAnimate<T extends HTMLElement>(run: (el: T) => ReturnType<typeof animate> | void, deps: DependencyList = []) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const animation = run(el);
    return () => { animation?.revert(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
