const express = require("express");
const { randomUUID } = require("crypto");
const { lanes, settings, getGameConfig, updateGameSettings } = require("../config/game");
const { getSession, updateSession, resetSession } = require("../store/sessionStore");
const {
  touchSession,
  selectPlayer,
  buyCard,
  startBetting,
  placeBet,
  removeBet,
  rollAndResolve,
  nextRound,
  resetGame
} = require("../services/gameEngine");

const router = express.Router();

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.get("/game/config", (req, res) => {
  res.json(getGameConfig());
});

router.post("/game/settings", requireAdmin, (req, res) => {
  try {
    const config = updateGameSettings(req.body.settings, req.body.lanes);
    const session = req.body.restart
      ? resetSession()
      : updateSession((currentSession) => applySettingsToSession(currentSession));

    res.json({
      config,
      session: filterSessionForRequest(session, req)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/game/session", (req, res) => {
  res.json(filterSessionForRequest(updateSession(touchSession), req));
});

router.delete("/game/session", (req, res) => {
  res.json(resetSession());
});

router.post("/auth/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");
  const playerId = getPlayerIdFromUsername(username);

  if (username === getAdminUsername() && password === getAdminPassword()) {
    res.json({
      role: "admin",
      adminToken: getAdminPassword()
    });
    return;
  }

  if (playerId && password.trim() === getPlayerPin(playerId)) {
    issuePlayerLogin(playerId, res);
    return;
  }

  res.status(401).json({ error: "Invalid username or password." });
});

router.post("/auth/admin-login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (username !== getAdminUsername() || password !== getAdminPassword()) {
    res.status(401).json({ error: "Invalid admin credentials." });
    return;
  }

  res.json({ adminToken: getAdminPassword() });
});

router.post("/auth/player-login", (req, res) => {
  const playerId = Number(req.body.playerId);
  const pin = String(req.body.pin || "").trim();

  if (!playerId || !pin) {
    res.status(400).json({ error: "Player seat and PIN required." });
    return;
  }

  if (pin !== getPlayerPin(playerId)) {
    res.status(401).json({ error: "Invalid player credentials." });
    return;
  }

  issuePlayerLogin(playerId, res);
});

router.get("/auth/admin-session", requireAdmin, (req, res) => {
  res.json({
    role: "admin"
  });
});

router.get("/auth/player-session", (req, res) => {
  const playerId = Number(req.get("x-player-id"));

  if (!playerId || !isPlayerRequest(req, playerId)) {
    res.status(401).json({ error: "Player login required." });
    return;
  }

  res.json({
    role: "player",
    playerId
  });
});

function issuePlayerLogin(playerId, res) {
  try {
    const session = updateSession((currentSession) => {
      const player = currentSession.state.players.find((entry) => entry.id === playerId);

      if (!player) {
        throw new Error("Player not found.");
      }

      player.authToken = randomUUID();
      return currentSession;
    });
    const player = session.state.players.find((entry) => entry.id === playerId);

    res.json({
      playerId,
      role: "player",
      playerToken: player.authToken
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function getAdminUsername() {
  return process.env.ADMIN_USERNAME || "admin";
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "admin";
}

function getPlayerPin(playerId) {
  const configuredPins = String(process.env.PLAYER_PINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const configuredPin = configuredPins
    .map((entry) => entry.split(":").map((part) => part.trim()))
    .find(([id]) => Number(id) === Number(playerId));

  if (configuredPin && configuredPin[1]) {
    return configuredPin[1];
  }

  return String(playerId).padStart(4, "0");
}

function getPlayerIdFromUsername(username) {
  const normalized = username.toLowerCase();
  const match = normalized.match(/^player\s*([1-9]|10)$/) || normalized.match(/^p([1-9]|10)$/);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function isAdminRequest(req) {
  return req.get("x-admin-key") === getAdminPassword();
}

function requireAdmin(req, res, next) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Admin login required." });
    return;
  }

  next();
}

function isPlayerRequest(req, playerId) {
  const session = getSession();
  const player = session.state.players.find((entry) => entry.id === Number(playerId));

  return Boolean(player && player.authToken && req.get("x-player-auth-token") === player.authToken);
}

function filterSessionForRequest(session, req) {
  const playerId = Number(req.get("x-player-id"));
  const playerToken = req.get("x-player-auth-token");
  const filtered = JSON.parse(JSON.stringify(session));
  const readablePlayer = session.state.players.find((player) =>
    player.id === playerId && player.authToken && player.authToken === playerToken
  );

  filtered.state.players.forEach((player) => {
    if (!readablePlayer || player.id !== readablePlayer.id) {
      delete player.consentToken;
    }
    delete player.authToken;
  });

  return filtered;
}

function requirePlayerControl(req, res, next) {
  const playerId = Number(req.body.playerId);

  if (!playerId) {
    res.status(400).json({ error: "Player id required." });
    return;
  }

  if (isAdminRequest(req)) {
    const session = getSession();
    const player = session.state.players.find((entry) => entry.id === playerId);

    if (!player || req.get("x-player-consent-token") !== player.consentToken) {
      res.status(403).json({ error: "Player consent token required for admin control." });
      return;
    }

    next();
    return;
  }

  if (Number(req.get("x-player-id")) !== playerId || !isPlayerRequest(req, playerId)) {
    res.status(403).json({ error: "Player login required." });
    return;
  }

  next();
}

function runAction(req, res, action) {
  try {
    res.json(filterSessionForRequest(updateSession(action), req));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

function applySettingsToSession(session) {
  const players = session.state.players;

  while (players.length < settings.maxPlayers) {
    const id = players.length + 1;
    players.push({
      id,
      name: `Player ${id}`,
      consentToken: Math.random().toString(36).slice(2, 6).toUpperCase(),
      authToken: null,
      winnings: 0,
      purchasedTotal: 0,
      walletBalance: 0,
      hand: [],
      bets: lanes.reduce((bets, lane) => {
        bets[lane.id] = [];
        return bets;
      }, {})
    });
  }

  if (players.length > settings.maxPlayers) {
    players.length = settings.maxPlayers;
  }

  if (!players.some((player) => player.id === session.state.activePlayerId)) {
    session.state.activePlayerId = players[0]?.id || 1;
  }

  if (session.state.phase === "staging") {
    session.state.betSecondsLeft = settings.betTimeSeconds;
    session.state.betEndsAt = null;
  }

  session.ui.roundResult = "Settings updated";
  session.ui.roundDetail = "Game settings were saved. Restart the game from settings to fully reset the table.";
  return session;
}

router.post("/game/actions/select-player", (req, res) => {
  runAction(req, res, (session) => selectPlayer(session, req.body.playerId));
});

router.post("/game/actions/buy-card", requirePlayerControl, (req, res) => {
  runAction(req, res, (session) => buyCard(session, req.body.playerId, req.body.value));
});

router.post("/game/actions/start-betting", requireAdmin, (req, res) => {
  runAction(req, res, startBetting);
});

router.post("/game/actions/place-bet", requirePlayerControl, (req, res) => {
  runAction(req, res, (session) => placeBet(session, req.body.playerId, req.body.amount, req.body.laneId));
});

router.post("/game/actions/remove-bet", requirePlayerControl, (req, res) => {
  runAction(req, res, (session) => removeBet(session, req.body.playerId, req.body.laneId));
});

router.post("/game/actions/roll", requireAdmin, (req, res) => {
  runAction(req, res, rollAndResolve);
});

router.post("/game/actions/next-round", requireAdmin, (req, res) => {
  runAction(req, res, nextRound);
});

router.post("/game/actions/reset", requireAdmin, (req, res) => {
  runAction(req, res, resetGame);
});

module.exports = router;
