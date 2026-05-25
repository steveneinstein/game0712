const express = require("express");
const { lanes, settings, rollDice } = require("../config/game");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.get("/game/config", (req, res) => {
  res.json({ lanes, settings });
});

router.post("/roll", (req, res) => {
  res.json(rollDice());
});

module.exports = router;
