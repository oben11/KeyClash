// First screen: enter a name, then create a lobby or join one with a code.
import { useState } from 'react';
import { Button, Cursor, Hint, Screen, TextField } from '../components/ui';

type Props = { error: string; onCreate: (name: string) => void; onJoin: (name: string, code: string) => void };

export function Home({ error, onCreate, onJoin }: Props) {
  const [name, setName] = useState('');
  // An invite link looks like /?code=ABCDE, so pre-fill the code from the URL if it's there.
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('code')?.toUpperCase().slice(0, 5) ?? '');

  return (
    <Screen>
      <header>
        <h1 className="font-mono text-5xl font-medium sm:text-6xl">
          keyclash
          <Cursor className="ml-1 inline-block h-[0.85em] w-[0.12em] translate-y-[0.08em]" />
        </h1>
        <Hint className="mt-3 text-lg">Race friends through the same quote. First to finish wins.</Hint>
      </header>

      <TextField placeholder="Your name" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} aria-label="Your name" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Button onClick={() => onCreate(name.trim())}>Create lobby</Button>
        <div className="flex gap-2">
          <TextField
            className="font-mono uppercase tracking-widest"
            placeholder="Code"
            value={code}
            maxLength={5}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            aria-label="Lobby code"
          />
          <Button variant="ghost" disabled={code.length < 5} onClick={() => onJoin(name.trim(), code)}>Join</Button>
        </div>
      </div>

      {error && <p role="alert" className="text-miss">{error}</p>}
    </Screen>
  );
}
