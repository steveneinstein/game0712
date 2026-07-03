# Lucky 7 Wallet

A Lucky 7 dice-and-wallet betting game served by a Node.js Express backend.

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
- `POST /api/game/actions/buy-card` - add a typed rupee amount to a player's wallet during staging.
- `POST /api/game/actions/start-betting` - open betting and start the backend timer.
- `POST /api/game/actions/place-bet` - place a typed wallet amount on a lane.
- `POST /api/game/actions/remove-bet` - remove a player's current bet from a lane before the roll.
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

- `/login` - shared login page for admin and player entry.
- `/admin-login` - admin login alias.
- `/player-login` - player seat login alias.
- `/admin` - admin table controls for starting betting, rolling dice, next round, and reset.
- `/player/1` through `/player/10` - individual player pages for adding wallet funds and placing lane bets.

Admin login uses `ADMIN_USERNAME` and `ADMIN_PASSWORD`. For local testing, defaults are `admin` / `admin`.

Player login uses the same username/password form as admin. Player usernames are `player1` through `player10` (short form `p1` through `p10` also works). For local testing, default player passwords are the four-digit player number: `player1` / `0001`, `player2` / `0002`, through `player10` / `0010`. Set `PLAYER_PINS` to override them, using comma-separated `player:pin` pairs such as `1:2468,2:1357`.

Open `/login` and enter credentials in the shared login form. Tokens are stored only in that browser tab session and sent with API requests.

Player pages display a consent token. Admin can view player balances and bets, but must enter a player's consent token before adding wallet funds or placing/removing bets for that player. Live table state refreshes automatically every second.

## Deploy on Render

This project is ready for Render as a Node web service.

Recommended Render settings:

- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`
- Environment variables: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and optionally `PLAYER_PINS`

The included `render.yaml` can also be used as a Render Blueprint.

Before going live, set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and custom `PLAYER_PINS` in Render. Current game state is still stored in server memory, so it can reset when Render restarts or redeploys the service.
