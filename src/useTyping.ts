// The typing logic. How it works: a real (invisible) <input> receives the
// keystrokes. That means backspace, mobile keyboards, and autocorrect-off all
// "just work". We then draw the quote ourselves, coloring each letter by
// comparing what was typed to the quote.
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

export function useTyping(quote: string, enabled: boolean, onProgress: (typed: string, mistakes: number) => void) {
  const [typed, setTyped] = useState('');
  const mistakes = useRef(0); // every wrong keystroke ever made, even if later fixed
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the hidden input the moment the countdown ends.
  useEffect(() => { if (enabled) inputRef.current?.focus(); }, [enabled]);

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    if (!enabled) return;
    const next = e.target.value.slice(0, quote.length);

    // New characters since last time (normally one). Count the wrong ones.
    for (let i = typed.length; i < next.length; i++) {
      if (next[i] !== quote[i]) mistakes.current++;
    }
    setTyped(next);
    onProgress(next, mistakes.current); // tell the server
  }

  const correct = typed.split('').filter((c, i) => c === quote[i]).length;

  return {
    typed,
    correct,
    /** Spread onto the <input>: <input {...inputProps} /> */
    inputProps: {
      ref: inputRef,
      value: typed,
      onChange,
      onPaste: (e: React.ClipboardEvent) => e.preventDefault(), // no cheating
      onKeyDown: (e: React.KeyboardEvent) => { // keep the caret at the end
        if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') e.preventDefault();
      },
    },
  };
}
