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
- `POST /api/roll` - rolls two dice and returns the winning lane.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
