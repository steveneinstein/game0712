let lanes = [
  {
    id: "below",
    title: "Below 7",
    label: "Sum is 2-6",
    symbol: "&lt; 7",
    color: "#e23d3d",
    payoutMultiplier: 2,
    test: (sum) => sum < 7
  },
  {
    id: "exact",
    title: "Exact 7",
    label: "Sum is 7",
    symbol: "= 7",
    color: "#13a85b",
    payoutMultiplier: 3,
    test: (sum) => sum === 7
  },
  {
    id: "above",
    title: "Above 7",
    label: "Sum is 8-12",
    symbol: "&gt; 7",
    color: "#2e78ff",
    payoutMultiplier: 2,
    test: (sum) => sum > 7
  }
];

let gameSettings = {
  betTimeSeconds: 15,
  maxPlayers: 10,
  maxPurchasePerPlayer: 1000,
  cardDenominations: [10, 50, 100, 200, 500]
};

const laneGrid = document.querySelector("#laneGrid");
const playerList = document.querySelector("#playerList");
const buyCardPanel = document.querySelector("#buyCardPanel");
const cardHand = document.querySelector("#cardHand");
const startBettingBtn = document.querySelector("#startBettingBtn");
const rollBtn = document.querySelector("#rollBtn");
const nextRoundBtn = document.querySelector("#nextRoundBtn");
const resetBtn = document.querySelector("#resetBtn");
const dieOne = document.querySelector("#dieOne");
const dieTwo = document.querySelector("#dieTwo");
const dicePair = document.querySelector("#dicePair");
const roundResult = document.querySelector("#roundResult");
const roundDetail = document.querySelector("#roundDetail");
const activePlayersEl = document.querySelector("#activePlayers");
const tablePotEl = document.querySelector("#tablePot");
const roundNumberEl = document.querySelector("#roundNumber");
const betTimerEl = document.querySelector("#betTimer");
const timerLabel = document.querySelector("#timerLabel");
const activePlayerName = document.querySelector("#activePlayerName");
const activePlayerWallet = document.querySelector("#activePlayerWallet");
const playerLimitText = document.querySelector("#playerLimitText");
const historyList = document.querySelector("#historyList");

const state = {
  round: 1,
  activePlayerId: 1,
  selectedCardId: null,
  selectedLane: null,
  winningLaneId: null,
  phase: "staging",
  rolling: false,
  roundResolved: false,
  bettingOpen: false,
  betSecondsLeft: gameSettings.betTimeSeconds,
  betTimerId: null,
  players: createPlayers(),
  history: []
};

render();
loadGameConfig();
registerServiceWorker();

startBettingBtn.addEventListener("click", startBetting);
rollBtn.addEventListener("click", rollDice);
nextRoundBtn.addEventListener("click", startNextRound);
resetBtn.addEventListener("click", resetGame);

function createPlayers() {
  return Array.from({ length: gameSettings.maxPlayers }, (_, index) => ({
    id: index + 1,
    name: `Player ${index + 1}`,
    winnings: 0,
    purchasedTotal: 0,
    walletBalance: 0,
    hand: [],
    bets: createEmptyBets()
  }));
}

function createEmptyBets() {
  return lanes.reduce((bets, lane) => {
    bets[lane.id] = [];
    return bets;
  }, {});
}

function render() {
  const activePlayer = getActivePlayer();

  activePlayersEl.textContent = state.players.length;
  tablePotEl.textContent = formatRupees(getTablePot());
  roundNumberEl.textContent = state.round;
  timerLabel.textContent = state.phase === "staging" ? "Stage" : "Bet time";
  betTimerEl.textContent = state.phase === "staging" ? "Ready" : `${state.betSecondsLeft}s`;
  activePlayerName.textContent = activePlayer.name;
  activePlayerWallet.textContent = `Carried balance: ${formatRupees(activePlayer.walletBalance)}`;
  playerLimitText.textContent = `Max purchase per player: ${formatRupees(gameSettings.maxPurchasePerPlayer)}`;

  renderLanes();
  renderPlayers();
  renderBuyCards();
  renderHand();
  renderHistory();
  updateControls();
}

function renderLanes() {
  laneGrid.innerHTML = "";

  lanes.forEach((lane) => {
    const laneTotal = getLaneTotal(lane.id);
    const lanePlayers = getLanePlayers(lane.id);
    const laneEl = document.createElement("article");
    laneEl.className = "lane";
    laneEl.style.setProperty("--lane-color", lane.color);

    if (state.selectedLane === lane.id) {
      laneEl.classList.add("is-selected");
    }

    if (state.winningLaneId === lane.id) {
      laneEl.classList.add("is-winning-lane");
    }

    laneEl.innerHTML = `
      <div class="lane-corner lane-corner-top-left"></div>
      <div class="lane-corner lane-corner-top-right"></div>
      <div class="lane-corner lane-corner-bottom-left"></div>
      <div class="lane-corner lane-corner-bottom-right"></div>
      <div class="lane-top">
        <div class="lane-flourish" aria-hidden="true"></div>
        <p class="lane-label">${lane.label}</p>
        <h2>${lane.title}</h2>
        <div class="lane-rule" aria-hidden="true"></div>
        <div class="lane-symbol">${lane.symbol}</div>
      </div>
      <div class="lane-art" aria-hidden="true">
        <div class="cash-stack cash-back"></div>
        <div class="cash-stack cash-front"></div>
        <div class="dice-set">
          <div class="mini-die die-a"><span></span><span></span><span></span><span></span><span></span></div>
          <div class="mini-die die-b"><span></span><span></span><span></span><span></span><span></span></div>
        </div>
      </div>
      <div class="lane-drop">
        <div class="lane-score-row">
          <div class="lane-score">
            <span class="card-label">Lane total</span>
            <strong>${formatRupees(laneTotal)}</strong>
          </div>
          <div class="lane-score">
            <span class="card-label">Players</span>
            <strong>${lanePlayers.length}</strong>
          </div>
        </div>
        <div class="bet-stack">
          ${lanePlayers.length ? lanePlayers.map((entry) => `<div class="placed-card"><span>${entry.name}</span><strong>${formatRupees(entry.total)}</strong></div>`).join("") : "<div class=\"placed-card\"><span>No bets yet</span><strong>-</strong></div>"}
        </div>
      </div>
    `;

    laneEl.addEventListener("click", () => placeSelectedCard(lane.id));
    laneGrid.appendChild(laneEl);
  });
}

function renderPlayers() {
  playerList.innerHTML = "";

  state.players.forEach((player) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-seat";

    if (player.id === state.activePlayerId) {
      button.classList.add("is-active");
    }

    button.innerHTML = `
      <span>${player.name}</span>
      <strong>${formatRupees(getPlayerRoundBet(player))}</strong>
      <div class="player-money-row">
        <small><em>Bought</em>${formatRupees(player.purchasedTotal)}</small>
        <small><em>Remaining</em>${formatRupees(getPlayerRemainingMoney(player))}</small>
        <small><em>Won</em>${formatRupees(player.winnings)}</small>
        <small><em>Total</em>${formatRupees(getPlayerTotalMoney(player))}</small>
      </div>
    `;

    button.addEventListener("click", () => {
      state.activePlayerId = player.id;
      state.selectedCardId = null;
      state.selectedLane = null;
      render();
    });

    playerList.appendChild(button);
  });
}

function renderBuyCards() {
  const activePlayer = getActivePlayer();
  buyCardPanel.innerHTML = "";

  getCardDenominations().forEach((value) => {
    const button = document.createElement("button");
    const canUseBalance = activePlayer.walletBalance >= value;
    button.type = "button";
    button.className = "buy-card";
    button.classList.toggle("is-balance-card", canUseBalance);
    button.textContent = `${canUseBalance ? "Use" : "Buy"} ${formatRupees(value)}`;
    button.title = canUseBalance
      ? `Convert ${formatRupees(value)} from carried balance into a digital card.`
      : `Buy a new ${formatRupees(value)} digital card.`;
    button.disabled = state.phase !== "staging"
      || state.roundResolved
      || state.rolling
      || (activePlayer.walletBalance < value && activePlayer.purchasedTotal + value > gameSettings.maxPurchasePerPlayer);

    button.addEventListener("click", () => buyCard(value));
    buyCardPanel.appendChild(button);
  });
}

function renderHand() {
  const activePlayer = getActivePlayer();
  cardHand.innerHTML = "";

  if (activePlayer.hand.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-hand";
    empty.textContent = activePlayer.walletBalance > 0
      ? "No cards in hand. Choose a denomination to convert remaining money into a card."
      : "No cards in hand. Buy a digital card to place a bet.";
    cardHand.appendChild(empty);
    return;
  }

  activePlayer.hand.forEach((card) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card-button";
    button.textContent = formatRupees(card.value);
    button.disabled = !state.bettingOpen || state.phase !== "betting" || state.roundResolved || state.rolling;

    if (state.selectedCardId === card.id) {
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
      state.selectedCardId = state.selectedCardId === card.id ? null : card.id;
      render();
    });

    cardHand.appendChild(button);
  });
}

function renderHistory() {
  historyList.innerHTML = "";

  if (state.history.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.innerHTML = "<strong>No rolls yet</strong>Buy cards and place bets before the timer reaches zero.";
    historyList.appendChild(emptyItem);
    return;
  }

  state.history.slice(0, 6).forEach((entry) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>Round ${entry.round}: ${entry.dice[0]} + ${entry.dice[1]} = ${entry.sum}</strong>
      ${entry.laneTitle}. ${entry.winnerText}
    `;
    historyList.appendChild(item);
  });
}

function updateControls() {
  startBettingBtn.hidden = state.phase !== "staging";
  startBettingBtn.disabled = state.rolling || state.roundResolved;
  rollBtn.disabled = !state.bettingOpen || state.rolling || state.roundResolved;
  nextRoundBtn.hidden = !state.roundResolved;
}

function buyCard(value) {
  const activePlayer = getActivePlayer();

  if (state.phase !== "staging") {
    return;
  }

  if (activePlayer.walletBalance >= value) {
    activePlayer.walletBalance -= value;
  } else if (activePlayer.purchasedTotal + value <= gameSettings.maxPurchasePerPlayer) {
    activePlayer.purchasedTotal += value;
  } else {
    return;
  }

  activePlayer.hand.push({
    id: crypto.randomUUID(),
    value
  });

  roundResult.textContent = `${activePlayer.name} added a ${formatRupees(value)} card.`;
  roundDetail.textContent = `${activePlayer.name} has ${formatRupees(activePlayer.walletBalance)} remaining to convert and can buy ${formatRupees(gameSettings.maxPurchasePerPlayer - activePlayer.purchasedTotal)} more.`;
  render();
}

function startBetting() {
  if (state.phase !== "staging" || state.rolling || state.roundResolved) {
    return;
  }

  state.phase = "betting";
  state.bettingOpen = true;
  state.betSecondsLeft = gameSettings.betTimeSeconds;
  roundResult.textContent = "Betting open";
  roundDetail.textContent = `Players can place bought cards now. Dice roll when the ${gameSettings.betTimeSeconds}-second timer ends.`;
  render();
  startBetTimer();
}

function placeSelectedCard(laneId) {
  const activePlayer = getActivePlayer();
  const card = activePlayer.hand.find((entry) => entry.id === state.selectedCardId);

  if (!card || !state.bettingOpen || state.phase !== "betting" || state.roundResolved || state.rolling) {
    return;
  }

  activePlayer.hand = activePlayer.hand.filter((entry) => entry.id !== card.id);
  activePlayer.bets[laneId].push(card);
  state.selectedLane = laneId;
  state.selectedCardId = null;
  roundResult.textContent = `${activePlayer.name} placed ${formatRupees(card.value)}.`;
  roundDetail.textContent = `${formatRupees(getTablePot())} is now on the table. Dice roll when the timer ends, or you can roll now.`;
  render();
}

async function rollDice() {
  if (!state.bettingOpen || state.phase !== "betting" || state.rolling || state.roundResolved) {
    return;
  }

  stopBetTimer();
  state.bettingOpen = false;
  state.phase = "rolling";
  state.selectedCardId = null;
  state.betSecondsLeft = 0;
  state.rolling = true;
  rollBtn.disabled = true;
  dicePair.classList.add("is-rolling");
  roundResult.textContent = "Rolling...";
  roundDetail.textContent = "The winning lane is decided by the total of both dice.";

  let roll;
  try {
    roll = await fetchRoll();
  } catch (error) {
    state.rolling = false;
    state.phase = "betting";
    state.bettingOpen = true;
    rollBtn.disabled = false;
    roundResult.textContent = "Roll failed";
    roundDetail.textContent = "The backend could not roll the dice. Check the server and try again.";
    render();
    return;
  }

  const ticker = window.setInterval(() => {
    dieOne.textContent = randomDie();
    dieTwo.textContent = randomDie();
  }, 80);

  window.setTimeout(() => {
    window.clearInterval(ticker);
    const { dice, sum, winningLaneId } = roll;
    const winningLane = lanes.find((lane) => lane.id === winningLaneId) || lanes.find((lane) => lane.test(sum));

    dieOne.textContent = dice[0];
    dieTwo.textContent = dice[1];
    dicePair.classList.remove("is-rolling");
    resolveRound(dice, sum, winningLane);
  }, 900);
}

function resolveRound(dice, sum, winningLane) {
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
  state.winningLaneId = winningLane.id;
  roundResult.textContent = `${dice[0]} + ${dice[1]} = ${sum}. ${winningLane.title} wins.`;
  roundDetail.textContent = winners.length
    ? `${winnerText} ${winners.map(({ player, bet }) => `${player.name} +${formatRupees(bet * winningLane.payoutMultiplier)}`).join(", ")}.`
    : winnerText;
  state.history.unshift({
    round: state.round,
    dice,
    sum,
    laneTitle: winningLane.title,
    winnerText
  });

  render();
  markWinningLane(winningLane.id);
}

function markWinningLane(laneId) {
  const index = lanes.findIndex((lane) => lane.id === laneId);
  const laneEl = laneGrid.children[index];

  if (laneEl) {
    laneEl.classList.add("is-winner");
  }
}

function startNextRound() {
  state.round += 1;
  state.selectedCardId = null;
  state.selectedLane = null;
  state.winningLaneId = null;
  state.rolling = false;
  state.roundResolved = false;
  state.phase = "staging";
  state.bettingOpen = false;
  state.betSecondsLeft = gameSettings.betTimeSeconds;
  state.players.forEach((player) => {
    const availableTotal = getPlayerTotalMoney(player);

    player.walletBalance = availableTotal;
    player.hand = [];
    player.winnings = 0;
    player.bets = createEmptyBets();
  });
  dieOne.textContent = "?";
  dieTwo.textContent = "?";
  roundResult.textContent = "Staging: buy cards";
  roundDetail.textContent = `Each player can buy up to ${formatRupees(gameSettings.maxPurchasePerPlayer)}. The owner starts the betting timer when ready.`;
  render();
}

function resetGame() {
  stopBetTimer();
  const savedPlayers = state.players.map((player) => ({
    winnings: player.winnings,
    purchasedTotal: player.purchasedTotal,
    walletBalance: player.walletBalance + getPlayerRoundBet(player),
    hand: player.hand
  }));
  state.round = 1;
  state.activePlayerId = 1;
  state.selectedCardId = null;
  state.selectedLane = null;
  state.winningLaneId = null;
  state.phase = "staging";
  state.rolling = false;
  state.roundResolved = false;
  state.bettingOpen = false;
  state.betSecondsLeft = gameSettings.betTimeSeconds;
  state.players = createPlayers();
  state.players.forEach((player, index) => {
    const savedPlayer = savedPlayers[index];

    if (!savedPlayer) {
      return;
    }

    player.winnings = savedPlayer.winnings;
    player.purchasedTotal = savedPlayer.purchasedTotal;
    player.walletBalance = savedPlayer.walletBalance;
    player.hand = savedPlayer.hand;
  });
  state.history = [];
  dieOne.textContent = "?";
  dieTwo.textContent = "?";
  roundResult.textContent = "Staging: buy cards";
  roundDetail.textContent = `Each player can buy up to ${formatRupees(gameSettings.maxPurchasePerPlayer)}. The owner starts the betting timer when ready.`;
  render();
}

function startBetTimer() {
  stopBetTimer();
  state.betTimerId = window.setInterval(() => {
    if (!state.bettingOpen || state.phase !== "betting" || state.rolling || state.roundResolved) {
      stopBetTimer();
      return;
    }

    state.betSecondsLeft = Math.max(0, state.betSecondsLeft - 1);
    betTimerEl.textContent = `${state.betSecondsLeft}s`;

    if (state.betSecondsLeft === 0) {
      rollDice();
    }
  }, 1000);
}

function stopBetTimer() {
  if (state.betTimerId) {
    window.clearInterval(state.betTimerId);
    state.betTimerId = null;
  }
}

function getActivePlayer() {
  return state.players.find((player) => player.id === state.activePlayerId) || state.players[0];
}

function getTablePot() {
  return state.players.reduce((sum, player) => sum + getPlayerRoundBet(player), 0);
}

function getLaneTotal(laneId) {
  return state.players.reduce((sum, player) => sum + getPlayerLaneBet(player, laneId), 0);
}

function getLanePlayers(laneId) {
  return state.players
    .map((player) => ({
      name: player.name,
      total: getPlayerLaneBet(player, laneId)
    }))
    .filter((entry) => entry.total > 0);
}

function getPlayerRoundBet(player) {
  return lanes.reduce((sum, lane) => sum + getPlayerLaneBet(player, lane.id), 0);
}

function getPlayerLaneBet(player, laneId) {
  return player.bets[laneId].reduce((sum, card) => sum + card.value, 0);
}

function getPlayerRemainingMoney(player) {
  return player.walletBalance + player.hand.reduce((sum, card) => sum + card.value, 0);
}

function getPlayerTotalMoney(player) {
  return getPlayerRemainingMoney(player) + player.winnings;
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}

async function fetchRoll() {
  const response = await fetch("/api/roll", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Roll request failed");
  }

  return response.json();
}

async function loadGameConfig() {
  try {
    const response = await fetch("/api/game/config");

    if (!response.ok) {
      throw new Error("Config request failed");
    }

    const config = await response.json();
    gameSettings = { ...gameSettings, ...config.settings };
    lanes = config.lanes.map((lane) => ({
      ...lane,
      test: (sum) => sum >= lane.minSum && sum <= lane.maxSum
    }));
    render();
  } catch (error) {
    // The local defaults keep the game playable if the API is unavailable.
  }
}

function formatRupees(value) {
  return `Rs ${value}`;
}

function getCardDenominations() {
  return [...new Set(gameSettings.cardDenominations)]
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Offline support is optional; the game should still run without it.
      });
    });
  }
}
