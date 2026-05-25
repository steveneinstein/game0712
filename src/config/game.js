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

module.exports = {
  lanes,
  settings,
  rollDice
};
