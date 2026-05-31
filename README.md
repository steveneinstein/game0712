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
- `DELETE /api/game/session` - reset the in-memory game session.
- `POST /api/game/actions/select-player` - set the active player.
- `POST /api/game/actions/buy-card` - buy or convert a rupee card.
- `POST /api/game/actions/start-betting` - open betting and start the backend timer.
- `POST /api/game/actions/place-bet` - place a selected card on a lane.
- `POST /api/game/actions/roll` - roll dice and resolve payouts.
- `POST /api/game/actions/next-round` - prepare the next round.
- `POST /api/game/actions/reset` - reset the table.

Session persistence is held in Express memory, so refreshes keep the table state while the server process is running. Restarting the server starts a fresh session. The backend owns game actions and payouts; the browser renders server state and sends player actions.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Pages

- `/admin-login` - admin login page.
- `/player-login` - player seat login page.
- `/admin` - admin table controls for starting betting, rolling dice, next round, and reset.
- `/player/1` through `/player/10` - individual player pages for buying cards and placing bets.

Admin-only action routes can be protected by setting `ADMIN_KEY` in the server environment. If `ADMIN_KEY` is not set, admin actions are open for local testing.

When `ADMIN_KEY` is set, open `/admin` and enter the same key in the Admin key field before using Start betting, Roll now, Next round, or Reset game. The key is stored only in that browser tab session and is sent as the `x-admin-key` request header.

Player pages display a consent token. Admin can view player balances and bets, but must enter a player's consent token before buying cards or placing bets for that player. Live table state refreshes automatically every second.

## Deploy on Render

This project is ready for Render as a Node web service.

Recommended Render settings:

- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`
- Environment variable: `ADMIN_KEY`

The included `render.yaml` can also be used as a Render Blueprint.

Before going live, set `ADMIN_KEY` in Render so admin-only actions are protected. Current game state is still stored in server memory, so it can reset when Render restarts or redeploys the service.
