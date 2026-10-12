// The root component. It owns the game connection (useGame) and shows
// whichever screen matches the current `view`.
import { useGame } from './useGame';
import { Home } from './screens/Home';
import { Lobby } from './screens/Lobby';
import { Race } from './screens/Race';
import { Results } from './screens/Results';

export default function App() {
  const g = useGame();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-5 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      {g.view === 'home' && <Home error={g.error} onCreate={g.createLobby} onJoin={g.joinLobby} />}

      {g.view === 'lobby' && (
        <Lobby code={g.code} myId={g.myId} players={g.players} isHost={g.isHost} onStart={g.startRace} onLeave={g.leave} />
      )}

      {/* key={startAt}: a new race gets a brand-new Race component, so typing state resets. */}
      {g.view === 'race' && (
        <Race key={g.startAt} quote={g.quote} startAt={g.startAt} players={g.players} myId={g.myId} progress={g.progress} onProgress={g.sendProgress} />
      )}

      {g.view === 'results' && (
        <Results results={g.results} myId={g.myId} isHost={g.isHost} onRematch={g.rematch} onLeave={g.leave} />
      )}
    </main>
  );
}
