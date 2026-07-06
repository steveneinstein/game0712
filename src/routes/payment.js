const express = require("express");
const { getSession } = require("../store/sessionStore");
const {
  createWalletOrder,
  getPublicPaymentConfig,
  handleWebhook,
  markTransactionCredited,
  verifyWalletPayment
} = require("../services/paymentService");
const { creditWalletAfterPayment } = require("../services/walletService");

function createPaymentRouter({ io } = {}) {
  const router = express.Router();

  router.get("/config", (req, res) => {
    res.json(getPublicPaymentConfig());
  });

  router.post("/create-order", express.json(), requirePlayerPayment, async (req, res) => {
    try {
      const player = getPlayer(req.playerPayment.playerId);
      const order = await createWalletOrder({
        player,
        amount: req.body.amount
      });

      res.json(order);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/verify", express.json(), requirePlayerPayment, async (req, res) => {
    try {
      const transaction = await verifyWalletPayment(req.body);

      if (Number(transaction.playerId) !== Number(req.playerPayment.playerId)) {
        res.status(403).json({ error: "Payment does not belong to this player." });
        return;
      }

      if (transaction.status === "credited") {
        res.json({
          ok: true,
          alreadyCredited: true,
          session: getSession()
        });
        return;
      }

      const { session, player } = await creditWalletAfterPayment(transaction);
      await markTransactionCredited(transaction.transactionId);
      emitWalletUpdated(io, player.id, session);

      res.json({
        ok: true,
        playerId: player.id,
        walletBalance: player.walletBalance,
        purchasedTotal: player.purchasedTotal,
        session
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const result = await handleWebhook(req.body, req.get("x-razorpay-signature"));

      if (result.capturedTransaction) {
        const { session, player } = await creditWalletAfterPayment(result.capturedTransaction);
        await markTransactionCredited(result.capturedTransaction.transactionId);
        emitWalletUpdated(io, player.id, session);
      }

      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

function requirePlayerPayment(req, res, next) {
  const playerId = Number(req.get("x-player-id"));
  const playerToken = req.get("x-player-auth-token");
  const player = getPlayer(playerId);

  if (!playerId || !player || !player.authToken || player.authToken !== playerToken) {
    res.status(403).json({ error: "Player login required." });
    return;
  }

  req.playerPayment = { playerId };
  next();
}

function getPlayer(playerId) {
  return getSession().state.players.find((player) => player.id === Number(playerId));
}

function emitWalletUpdated(io, playerId, session) {
  if (!io) {
    return;
  }

  io.to(`player:${playerId}`).emit("wallet:updated", {
    playerId,
    session
  });
  io.to("admins").emit("wallet:updated", {
    playerId,
    session
  });
}

module.exports = createPaymentRouter;
