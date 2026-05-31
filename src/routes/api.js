const express = require("express");
const { lanes, settings } = require("../config/game");
const { getSession, updateSession, resetSession } = require("../store/sessionStore");
const {
  touchSession,
  selectPlayer,
  buyCard,
  startBetting,
  placeBet,
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
  res.json({ lanes, settings });
});

router.get("/game/session", (req, res) => {
  res.json(filterSessionForRequest(updateSession(touchSession), req));
});

router.delete("/game/session", (req, res) => {
  res.json(resetSession());
});

function requireAdmin(req, res, next) {
  const adminKey = process.env.ADMIN_KEY;

  if (!adminKey) {
    next();
    return;
  }

  if (req.get("x-admin-key") !== adminKey) {
    res.status(401).json({ error: "Admin key required." });
    return;
  }

  next();
}

function isAdminRequest(req) {
  const adminKey = process.env.ADMIN_KEY;

  if (!adminKey) {
    return Boolean(req.get("x-admin-key"));
  }

  return req.get("x-admin-key") === adminKey;
}

function filterSessionForRequest(session, req) {
  const playerId = Number(req.get("x-player-id"));
  const filtered = JSON.parse(JSON.stringify(session));

  filtered.state.players.forEach((player) => {
    if (player.id !== playerId) {
      delete player.consentToken;
    }
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

  if (Number(req.get("x-player-id")) !== playerId) {
    res.status(403).json({ error: "Player login required." });
    return;
  }

  next();
}

function runAction(res, action) {
  try {
    res.json(updateSession(action));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

router.post("/game/actions/select-player", (req, res) => {
  runAction(res, (session) => selectPlayer(session, req.body.playerId));
});

router.post("/game/actions/buy-card", requirePlayerControl, (req, res) => {
  runAction(res, (session) => buyCard(session, req.body.playerId, req.body.value));
});

router.post("/game/actions/start-betting", requireAdmin, (req, res) => {
  runAction(res, startBetting);
});

router.post("/game/actions/place-bet", requirePlayerControl, (req, res) => {
  runAction(res, (session) => placeBet(session, req.body.playerId, req.body.cardId, req.body.laneId));
});

router.post("/game/actions/roll", requireAdmin, (req, res) => {
  runAction(res, rollAndResolve);
});

router.post("/game/actions/next-round", requireAdmin, (req, res) => {
  runAction(res, nextRound);
});

router.post("/game/actions/reset", requireAdmin, (req, res) => {
  runAction(res, resetGame);
});

module.exports = router;
