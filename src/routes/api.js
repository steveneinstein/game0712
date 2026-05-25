const express = require("express");
const { lanes, settings, rollDice } = require("../config/game");
const { getSession, saveSession, resetSession } = require("../store/sessionStore");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.get("/game/config", (req, res) => {
  res.json({ lanes, settings });
});

router.get("/game/session", (req, res) => {
  res.json(getSession());
});

router.put("/game/session", (req, res) => {
  res.json(saveSession(req.body));
});

router.delete("/game/session", (req, res) => {
  res.json(resetSession());
});

router.post("/roll", (req, res) => {
  res.json(rollDice());
});

module.exports = router;
