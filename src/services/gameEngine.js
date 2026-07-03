const { lanes, settings, rollDice, createInitialSession } = require("../config/game");

function getActivePlayer(state) {
  return state.players.find((player) => player.id === state.activePlayerId) || state.players[0];
}

function getPlayer(state, playerId) {
  return state.players.find((player) => player.id === Number(playerId));
}

function getLane(laneId) {
  return lanes.find((lane) => lane.id === laneId);
}

function createEmptyBets() {
  return lanes.reduce((bets, lane) => {
    bets[lane.id] = [];
    return bets;
  }, {});
}

function formatRupees(value) {
  return `Rs ${value}`;
}

function getPlayerLaneBet(player, laneId) {
  return player.bets[laneId].reduce((sum, bet) => sum + bet.value, 0);
}

function getPlayerRoundBet(player) {
  return lanes.reduce((sum, lane) => sum + getPlayerLaneBet(player, lane.id), 0);
}

function getPlayerRemainingMoney(player) {
  return player.walletBalance;
}

function getPlayerTotalMoney(player) {
  return getPlayerRemainingMoney(player) + player.winnings;
}

function getTablePot(state) {
  return state.players.reduce((sum, player) => sum + getPlayerRoundBet(player), 0);
}

function syncTimer(state) {
  if (!state.betEndsAt || state.phase !== "betting" || !state.bettingOpen) {
    return;
  }

  state.betSecondsLeft = Math.max(0, Math.ceil((state.betEndsAt - Date.now()) / 1000));
}

function touchSession(session) {
  syncTimer(session.state);

  if (
    session.state.phase === "betting"
    && session.state.bettingOpen
    && !session.state.roundResolved
    && session.state.betSecondsLeft === 0
  ) {
    resolveRoll(session, rollDice());
  }

  return session;
}

function selectPlayer(session, playerId) {
  const player = getPlayer(session.state, playerId);

  if (!player) {
    throw new Error("Player not found.");
  }

  session.state.activePlayerId = player.id;
  session.state.selectedCardId = null;
  session.state.selectedLane = null;
  return session;
}

function buyCard(session, playerId, value) {
  const state = session.state;
  const player = getPlayer(state, playerId);
  const walletValue = Number(value);
  const rawValue = String(value).trim();

  if (!player) {
    throw new Error("Player not found.");
  }

  if (state.phase !== "staging" || state.roundResolved || state.rolling) {
    throw new Error("Wallet funds can only be added during staging.");
  }

  if (!/^\d+$/.test(rawValue) || !Number.isInteger(walletValue) || walletValue <= 0) {
    throw new Error("Enter a whole rupee amount.");
  }

  if (player.purchasedTotal + walletValue <= settings.maxPurchasePerPlayer) {
    player.purchasedTotal += walletValue;
    player.walletBalance += walletValue;
  } else {
    throw new Error("Player purchase limit reached.");
  }

  state.activePlayerId = player.id;
  session.ui.roundResult = `${player.name} added ${formatRupees(walletValue)} to wallet.`;
  session.ui.roundDetail = `${player.name} has ${formatRupees(player.walletBalance)} in wallet and can add ${formatRupees(settings.maxPurchasePerPlayer - player.purchasedTotal)} more.`;
  return session;
}

function startBetting(session) {
  const state = session.state;

  if (state.phase !== "staging" || state.rolling || state.roundResolved) {
    throw new Error("Betting can only start from staging.");
  }

  state.phase = "betting";
  state.bettingOpen = true;
  state.betSecondsLeft = settings.betTimeSeconds;
  state.betEndsAt = Date.now() + settings.betTimeSeconds * 1000;
  session.ui.roundResult = "Betting open";
  session.ui.roundDetail = `Players can type bet amounts from their wallet now. Dice roll when the ${settings.betTimeSeconds}-second timer ends.`;
  return session;
}

function placeBet(session, playerId, amount, laneId) {
  const state = session.state;
  const player = getPlayer(state, playerId);
  const lane = getLane(laneId);
  const betValue = Number(amount);
  const rawValue = String(amount).trim();

  syncTimer(state);

  if (!player) {
    throw new Error("Player not found.");
  }

  if (!lane) {
    throw new Error("Lane not found.");
  }

  if (!state.bettingOpen || state.phase !== "betting" || state.roundResolved || state.rolling || state.betSecondsLeft === 0) {
    throw new Error("Betting is not open.");
  }

  if (!/^\d+$/.test(rawValue) || !Number.isInteger(betValue) || betValue <= 0) {
    throw new Error("Enter a whole rupee bet amount.");
  }

  if (player.walletBalance < betValue) {
    throw new Error("Not enough wallet balance.");
  }

  player.walletBalance -= betValue;
  player.bets[lane.id].push({
    value: betValue
  });
  state.activePlayerId = player.id;
  state.selectedCardId = null;
  state.selectedLane = lane.id;
  session.ui.roundResult = `${player.name} placed ${formatRupees(betValue)}.`;
  session.ui.roundDetail = `${formatRupees(getTablePot(state))} is now on the table. Dice roll when the timer ends, or you can roll now.`;
  return session;
}

function removeBet(session, playerId, laneId) {
  const state = session.state;
  const player = getPlayer(state, playerId);
  const lane = getLane(laneId);

  syncTimer(state);

  if (!player) {
    throw new Error("Player not found.");
  }

  if (!lane) {
    throw new Error("Lane not found.");
  }

  if (!state.bettingOpen || state.phase !== "betting" || state.roundResolved || state.rolling || state.betSecondsLeft === 0) {
    throw new Error("Bets can only be removed while betting is open.");
  }

  const removedTotal = getPlayerLaneBet(player, lane.id);

  if (removedTotal <= 0) {
    throw new Error("No bet to remove from this lane.");
  }

  player.walletBalance += removedTotal;
  player.bets[lane.id] = [];
  state.activePlayerId = player.id;
  state.selectedLane = null;
  session.ui.roundResult = `${player.name} removed ${formatRupees(removedTotal)} from ${lane.title}.`;
  session.ui.roundDetail = `${formatRupees(getTablePot(state))} remains on the table.`;
  return session;
}

function rollAndResolve(session) {
  const state = session.state;
  syncTimer(state);

  if (!state.bettingOpen || state.phase !== "betting" || state.roundResolved || state.rolling) {
    throw new Error("Dice can only roll while betting is open.");
  }

  return resolveRoll(session, rollDice());
}

function resolveRoll(session, roll) {
  const state = session.state;
  const winningLane = getLane(roll.winningLaneId);

  if (!winningLane) {
    throw new Error("Winning lane not found.");
  }

  const winners = state.players
    .map((player) => ({
      player,
      bet: getPlayerLaneBet(player, winningLane.id)
    }))
    .filter((entry) => entry.bet > 0);

  winners.forEach(({ player, bet }) => {
    player.winnings += bet * winningLane.payoutMultiplier;
  });

  const winnerText = winners.length
    ? `${winners.length} winner${winners.length === 1 ? "" : "s"} paid ${winningLane.payoutMultiplier}x.`
    : "No player bet on the winning lane.";

  state.rolling = false;
  state.roundResolved = true;
  state.phase = "resolved";
  state.bettingOpen = false;
  state.betSecondsLeft = 0;
  state.betEndsAt = null;
  state.winningLaneId = winningLane.id;
  session.ui.dieOne = String(roll.dice[0]);
  session.ui.dieTwo = String(roll.dice[1]);
  session.ui.roundResult = `${roll.dice[0]} + ${roll.dice[1]} = ${roll.sum}. ${winningLane.title} wins.`;
  session.ui.roundDetail = winners.length
    ? `${winnerText} ${winners.map(({ player, bet }) => `${player.name} +${formatRupees(bet * winningLane.payoutMultiplier)}`).join(", ")}.`
    : winnerText;
  state.history.unshift({
    round: state.round,
    dice: roll.dice,
    sum: roll.sum,
    laneTitle: winningLane.title,
    winnerText
  });
  return session;
}

function nextRound(session) {
  const state = session.state;

  if (!state.roundResolved) {
    throw new Error("Current round must be resolved first.");
  }

  state.round += 1;
  state.selectedCardId = null;
  state.selectedLane = null;
  state.winningLaneId = null;
  state.rolling = false;
  state.roundResolved = false;
  state.phase = "staging";
  state.bettingOpen = false;
  state.betSecondsLeft = settings.betTimeSeconds;
  state.betEndsAt = null;
  state.players.forEach((player) => {
    const availableTotal = getPlayerTotalMoney(player);

    player.walletBalance = availableTotal;
    player.hand = [];
    player.winnings = 0;
    player.bets = createEmptyBets();
  });
  session.ui.dieOne = "?";
  session.ui.dieTwo = "?";
  session.ui.roundResult = "Staging: add wallet funds";
  session.ui.roundDetail = `Each player can add up to ${formatRupees(settings.maxPurchasePerPlayer)} to their wallet. The owner starts the betting timer when ready.`;
  return session;
}

function resetGame(session) {
  const savedPlayers = session.state.players.map((player) => ({
    consentToken: player.consentToken,
    authToken: player.authToken,
    winnings: player.winnings,
    purchasedTotal: player.purchasedTotal,
    walletBalance: player.walletBalance + getPlayerRoundBet(player),
    hand: player.hand
  }));
  const fresh = createInitialSession();

  fresh.state.players.forEach((player, index) => {
    const savedPlayer = savedPlayers[index];

    if (!savedPlayer) {
      return;
    }

    player.winnings = savedPlayer.winnings;
    player.purchasedTotal = savedPlayer.purchasedTotal;
    player.walletBalance = savedPlayer.walletBalance;
    player.hand = savedPlayer.hand;
    player.consentToken = savedPlayer.consentToken || player.consentToken;
    player.authToken = savedPlayer.authToken || player.authToken;
  });

  return fresh;
}

module.exports = {
  touchSession,
  selectPlayer,
  buyCard,
  startBetting,
  placeBet,
  removeBet,
  rollAndResolve,
  nextRound,
  resetGame
};
