# Lucky 7 Cards

A Lucky 7 dice-and-card game served by a Node.js Express backend.

## Project Structure

- `server.js` - Express application entry point.
- `src/config/game.js` - backend game settings, lane rules, and dice rolling.
- `src/routes/api.js` - JSON API routes.
- `public/` - browser UI, styles, manifest, service worker, and image assets.

## API

- `GET /api/health` - server health check.
- `GET /api/game/config` - game lanes and settings.
- `GET /api/game/session` - current in-memory game session.
- `PUT /api/game/session` - save the current game session.
- `DELETE /api/game/session` - reset the in-memory game session.
- `POST /api/roll` - rolls two dice and returns the winning lane.

Session persistence is held in Express memory, so refreshes keep the table state while the server process is running. Restarting the server starts a fresh session.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
