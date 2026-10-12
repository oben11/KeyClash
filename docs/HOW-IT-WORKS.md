# How Keyclash works

This guide explains how the pieces fit together so you can rebuild the project yourself. Read it with the code open; every file has comments at the top that say what it's for.

## 1. The big picture

```
 ┌──────────── Browser (or Electron window) ────────────┐        ┌──────── Node server ────────┐
 │  React app (src/)                                     │        │  server/index.ts            │
 │                                                       │  HTTP  │                             │
 │  loads the page  ───────────────────────────────────────────▶ │  serves the built website   │
 │                                                       │        │  (dist/ folder)             │
 │  useGame.ts  ◀══════ WebSocket (JSON messages) ═══════════════▶ │  runs the game rooms        │
 │     │                                                 │  /ws   │  (in memory)                │
 │     ▼ state                                           │        └─────────────────────────────┘
 │  App → Home | Lobby | Race | Results                  │
 └───────────────────────────────────────────────────────┘
```

Two ideas to hold onto:

1. **The server is the referee.** Your browser only reports what you typed. The server decides progress, the winner, WPM and accuracy. This keeps everyone's results consistent and makes cheating harder.
2. **React shows state.** When a message arrives from the server, `useGame` updates state, and React redraws the right screen. Screens never talk to the network directly.

## 2. The tools and what each one does

| Tool | Role in this project | Where to look |
|---|---|---|
| **TypeScript** | JavaScript with types. Catches mistakes like sending a message the other side doesn't understand. | everywhere; `shared/protocol.ts` |
| **React** | Builds the UI from components (functions that return markup). State changes redraw the UI. | `src/` |
| **Vite** | Dev server + bundler for the website. `npm run dev` gives instant reloads; `npm run build` makes the files in `dist/`. | `vite.config.ts` |
| **Tailwind CSS** | Styling by adding small classes (`text-white p-4 rounded-lg`) right in the markup. Our colors are defined in `src/index.css`. | `src/index.css` |
| **anime.js** | Animations: cursor blink, progress bars, countdown pop, screen entrances. | `src/animate.ts` + uses in components |
| **WebSocket (`ws`)** | A two-way connection between browser and server so both can send messages any time. This is what makes multiplayer live. | `server/index.ts`, `src/useGame.ts` |
| **PWA** (`vite-plugin-pwa`) | Adds a manifest and a service worker so the site can be installed like an app and cached. | `vite.config.ts`, `src/main.tsx` |
| **Electron** | Wraps the website in a desktop window and bundles the server inside, so it runs without a browser. | `electron/main.mjs` |
| **esbuild / tsx** | `tsx` runs TypeScript directly in development. `esbuild` bundles the server into one file for Electron. | `package.json` scripts |

## 3. One game, start to finish

Every message is JSON with a `t` field. All of them are typed in `shared/protocol.ts`.

1. **Create.** Host enters a name and clicks *Create lobby*. The browser opens a WebSocket and sends `{t:'create', name}`. The server makes a room with a random 5-letter code and replies `{t:'lobby', code, players, you, phase:'lobby'}`. The browser switches to the Lobby screen.
2. **Join.** A friend enters the code and sends `{t:'join', name, code}`. The server adds them and sends a fresh `lobby` message to **everyone** in the room, so each Lobby screen updates.
3. **Start.** The host clicks *Start* → `{t:'start'}`. The server (only if the sender is the host and there are 2+ players) picks a random quote, notes `startAt = now + 3s`, and sends `{t:'start', quote, countdownMs:3000}` to everyone.
4. **Countdown.** Each browser sets its own start time (`Date.now() + countdownMs`) and shows the Race screen with the countdown. Typing unlocks at zero. (Using each browser's own clock avoids needing synchronized clocks. Differences are a few milliseconds.)
5. **Racing.** On every keystroke the browser sends `{t:'progress', typed, mistakes}`. The server stores it and broadcasts `{t:'progress', progress:{playerId: charsTyped}}` so everyone's progress bars move.
6. **Finish.** When a player's `typed` equals the quote exactly, the server computes stats for **all** players at that moment and sends `{t:'results', results}`. The winner is first in the list. Everyone's browser shows the Results screen.
7. **Rematch.** The host clicks *Back to lobby* → `{t:'rematch'}` and the server sends `lobby` again.

If someone disconnects, the server removes them, passes host to another player if needed, and (if only one player remains mid-race) ends the race.

## 4. Key ideas, explained

### React state flows one way
`useGame()` (in `App.tsx`) holds everything: current `view`, `players`, `quote`, etc. `App` passes what each screen needs as **props**. Screens call back up through functions (`onCreate`, `onStart`...) that send messages. Data goes down, events go up.

### The invisible input trick
Making a typing game, you might listen to key presses directly, but that fights with backspace, mobile keyboards and international input. Instead, `Race.tsx` renders a real `<input>` that's invisible (`opacity-0`) and stretched over the text. Its `value` is the typed text. The visible `Quote` component is just a drawing of that text:

- no letter typed yet → gray
- typed and equal to the quote's letter → white
- typed but different → red

Backspace works for free: the input's value gets shorter, the letter has no typed value anymore, so it turns gray again. The flashing cursor is drawn before the letter at index `typed.length`.

### WPM and accuracy
- **WPM** = `correct characters ÷ 5 ÷ minutes`. (A "word" is conventionally 5 characters.)
- **Accuracy** = `correct ÷ (correct + mistakes)` where `mistakes` counts every wrong keystroke, even ones you later fixed.
- The server recomputes `correct` from the typed text. It never trusts a number sent by the browser.

### Why `shared/protocol.ts`
Both sides import the same message types. If you rename a field on one side, TypeScript flags the other side immediately. It also doubles as documentation of the whole network protocol on one page.

### anime.js in React
`animate(element, { opacity: [0, 1], duration: 400 })` smoothly changes CSS properties. Because React owns the elements, we start animations *after* React draws them, using an effect. `useAnimate` in `src/animate.ts` wraps that pattern: give it a function, get back a `ref` to attach to the element. It also skips animations if the person's OS asks for reduced motion.

### The PWA part
`vite-plugin-pwa` (in `vite.config.ts`) generates a web manifest (name, icons, colors) and a service worker (a background script that caches files). `registerSW()` in `main.tsx` turns it on. Browsers then offer "Install", and the app opens in its own window. Multiplayer still needs the server.

### Electron
Electron = Chromium + Node. `electron/main.mjs` runs in Node: it starts the same `startServer()` function as `npm start`, then opens browser windows pointing at `http://localhost:<port>`. Since each window is a separate WebSocket connection, each is a separate player. `npm run build:server` first bundles the server TypeScript into `server-dist/server.cjs` so Electron can load it; `electron-builder` (config in `package.json`) packs everything into a `.dmg`.

## 5. File tour

| File | What to learn from it |
|---|---|
| `shared/protocol.ts` | All message shapes. Start here. |
| `server/index.ts` | Rooms in a `Map`, the WebSocket `message` handler, `finishRace`. |
| `src/useGame.ts` | Opening a WebSocket in React; turning messages into state. |
| `src/App.tsx` | Conditional rendering of screens; passing props. |
| `src/screens/*.tsx` | Plain components using state, props and Tailwind. |
| `src/useTyping.ts` | The typing logic as a custom hook. |
| `src/components/Quote.tsx` | Mapping a string to colored `<span>`s. |
| `src/components/RaceTrack.tsx` | Animating a value with anime.js in an effect. |
| `src/components/Countdown.tsx` | Animations triggered by a changing value. |
| `src/animate.ts` | A custom hook wrapping a library. |
| `electron/main.mjs` | How a desktop app starts and creates windows. |

## 6. Rebuild it yourself: suggested order

Each step runs on its own, so you always have something working.

1. **Scaffold.** `npm create vite@latest` (React + TypeScript), add Tailwind v4 with `@tailwindcss/vite`. Make `App.tsx` show "hello" in your colors.
2. **Single-player typing.** Hard-code a quote. Build `Quote` and the invisible `<input>` (`useTyping`). Get gray/white/red and the cursor working. This is the heart of the app.
3. **Add WPM.** A clock with `setInterval`, and the formula above.
4. **Server skeleton.** Create `server/index.ts` with `ws`. Handle `create`/`join`, keep rooms in a `Map`, reply with `lobby`. Test it with two browser tabs and `console.log`.
5. **Shared protocol.** Move the message types into `shared/protocol.ts` and use them on both sides.
6. **Screens + `useGame`.** Build Home → Lobby using the messages from step 4. Switch screens with a `view` state.
7. **Race.** Add `start`, the shared quote, the countdown, `progress` messages, and progress bars.
8. **Finish.** Add `finishRace` on the server and the Results screen.
9. **Animations.** Add anime.js: cursor blink first, then progress bars, countdown, entrances.
10. **PWA.** Add `vite-plugin-pwa` and icons.
11. **Electron.** Add `electron/main.mjs`, bundle the server with esbuild, and package with `electron-builder`.

## 7. Ideas to extend it

- Fetch quotes from an API; add short/medium/long modes.
- Persist best scores (SQLite or a JSON file on the server).
- Let the Electron app join someone else's server (a "Server…" setting that loads a different URL).
- Spectators, ready-up buttons, or a live WPM column for every player.
- Validate incoming messages with a library like `zod` instead of trusting their shape.
