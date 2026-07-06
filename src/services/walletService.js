const { settings } = require("../config/game");
const { query } = require("../db/mysql");
const { updateSession } = require("../store/sessionStore");

function creditPlayerWallet(session, playerId, amount) {
  const value = Number(amount);
  const player = session.state.players.find((entry) => entry.id === Number(playerId));

  if (!player) {
    throw new Error("Player not found.");
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Wallet amount must be a whole rupee value.");
  }

  if (player.purchasedTotal + value > settings.maxPurchasePerPlayer) {
    throw new Error(`This player can add up to Rs ${settings.maxPurchasePerPlayer - player.purchasedTotal} right now.`);
  }

  player.walletBalance += value;
  player.purchasedTotal += value;
  session.state.activePlayerId = player.id;
  session.ui.roundResult = `${player.name} added Rs ${value} to wallet.`;
  session.ui.roundDetail = `${player.name} has Rs ${player.walletBalance} in wallet and can add Rs ${settings.maxPurchasePerPlayer - player.purchasedTotal} more.`;
  return session;
}

async function creditWalletAfterPayment(transaction) {
  const session = updateSession((currentSession) =>
    creditPlayerWallet(currentSession, transaction.playerId, Number(transaction.amount))
  );
  const player = session.state.players.find((entry) => entry.id === Number(transaction.playerId));

  await query(
    `INSERT INTO players (id, name, wallet_balance, purchased_total)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       wallet_balance = VALUES(wallet_balance),
       purchased_total = VALUES(purchased_total)`,
    [player.id, player.name, player.walletBalance, player.purchasedTotal]
  );

  return { session, player };
}

module.exports = {
  creditPlayerWallet,
  creditWalletAfterPayment
};

