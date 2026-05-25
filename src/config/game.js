const lanes = [
  {
    id: "below",
    title: "Below 7",
    label: "Sum is 2-6",
    symbol: "&lt; 7",
    color: "#e23d3d",
    payoutMultiplier: 2,
    minSum: 2,
    maxSum: 6
  },
  {
    id: "exact",
    title: "Exact 7",
    label: "Sum is 7",
    symbol: "= 7",
    color: "#13a85b",
    payoutMultiplier: 3,
    minSum: 7,
    maxSum: 7
  },
  {
    id: "above",
    title: "Above 7",
    label: "Sum is 8-12",
    symbol: "&gt; 7",
    color: "#2e78ff",
    payoutMultiplier: 2,
    minSum: 8,
    maxSum: 12
  }
];

const settings = {
  betTimeSeconds: 15,
  maxPlayers: 10,
  maxPurchasePerPlayer: 1000,
  cardDenominations: [10, 50, 100, 200, 500]
};

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function findWinningLane(sum) {
  return lanes.find((lane) => sum >= lane.minSum && sum <= lane.maxSum);
}

function rollDice() {
  const dice = [rollDie(), rollDie()];
  const sum = dice[0] + dice[1];
  const winningLane = findWinningLane(sum);

  return {
    dice,
    sum,
    winningLaneId: winningLane.id
  };
}

function createPlayers() {
  return Array.from({ length: settings.maxPlayers }, (_, index) => ({
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

function createInitialSession() {
  return {
    state: {
      round: 1,
      activePlayerId: 1,
      selectedCardId: null,
      selectedLane: null,
      winningLaneId: null,
      phase: "staging",
      rolling: false,
      roundResolved: false,
      bettingOpen: false,
      betSecondsLeft: settings.betTimeSeconds,
      betEndsAt: null,
      players: createPlayers(),
      history: []
    },
    ui: {
      dieOne: "?",
      dieTwo: "?",
      roundResult: "Staging: buy cards",
      roundDetail: "Players can buy digital cards now. The owner starts the betting timer when the table is ready."
    },
    updatedAt: new Date().toISOString()
  };
}

module.exports = {
  lanes,
  settings,
  rollDice,
  createInitialSession
};
