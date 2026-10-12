# Keyclash

Competitive multiplayer typing races. Create a lobby, share the 5-letter code, and race friends through the same quote. First to finish wins and everyone's stats are shown.

Built with **React + TypeScript + Tailwind + anime.js** (the website), a **Node WebSocket server** (multiplayer), and a **PWA** setup (installable).

> New to this stack? Read **[docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)**. It explains how every piece fits together and suggests an order for rebuilding the project yourself.

## Run it

```bash
npm install
npm run dev        # website on http://localhost:5173, game server on :3001
```

Open the site in two browser tabs to be two players: create a lobby in one, join with the code in the other.

| Command | What it does |
|---|---|
| `npm run dev` | Development: server + Vite with hot reload |
| `npm run build` | Type-check and build the website into `dist/` |
| `npm start` | Run the server, which also serves `dist/` (run `build` first) |

**Port 3001 busy?** The server refuses to start (so you never talk to an old copy by accident). Stop the old one: `lsof -i :3001`, then `kill <PID>`.


## Folder map

```
shared/protocol.ts     Message types used by both browser and server
server/index.ts        Game server: lobbies, quotes, referee, serves the website
src/main.tsx           Browser entry point
src/App.tsx            Chooses which screen to show
src/useGame.ts         WebSocket + all game state (hook)
src/useTyping.ts       Typing logic (hook)
src/animate.ts         anime.js helper
src/screens/           Home, Lobby, Race, Results
src/components/        Button/TextField/Cursor/..., Quote, RaceTrack, Countdown
src/index.css          Tailwind setup + colors/fonts
vite.config.ts         Build tool + PWA config
```
