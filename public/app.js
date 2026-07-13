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
  maxPurchasePerPlayer: 1000
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
const pageEyebrow = document.querySelector("#pageEyebrow");
const pageTitle = document.querySelector("#pageTitle");
const pageIntro = document.querySelector("#pageIntro");
const gameHeader = document.querySelector("#gameHeader");
const playerPanelTitle = document.querySelector("#playerPanelTitle");
const adminLink = document.querySelector("#adminLink");
const playerLoginLink = document.querySelector("#playerLoginLink");
const playerLinks = document.querySelector("#playerLinks");
const roleNav = document.querySelector(".role-nav");
const controlsPanel = document.querySelector(".controls");
const adminKeyField = document.querySelector("#adminKeyField");
const adminKeyInput = document.querySelector("#adminKeyInput");
const playerConsentField = document.querySelector("#playerConsentField");
const playerConsentInput = document.querySelector("#playerConsentInput");
const consentTokenText = document.querySelector("#consentTokenText");
const loginPanel = document.querySelector("#loginPanel");
const loginLabel = document.querySelector("#loginLabel");
const loginTitle = document.querySelector("#loginTitle");
const loginDetail = document.querySelector("#loginDetail");
const loginForm = document.querySelector("#loginForm");
const loginUsernameInput = document.querySelector("#loginUsernameInput");
const loginPasswordInput = document.querySelector("#loginPasswordInput");
const profileBar = document.querySelector("#profileBar");
const profileAddMoneyInput = document.querySelector("#profileAddMoneyInput");
const profileAddMoneyBtn = document.querySelector("#profileAddMoneyBtn");
const profileAddWalletBalance = document.querySelector("#profileAddWalletBalance");
const profileAddMoneyInfo = document.querySelector("#profileAddMoneyInfo");
const profileBadge = document.querySelector("#profileBadge");
const profileName = document.querySelector("#profileName");
const playerHomeLink = document.querySelector("#playerHomeLink");
const playerProfileLink = document.querySelector("#playerProfileLink");
const logoutBtn = document.querySelector("#logoutBtn");
const settingsPanel = document.querySelector("#settingsPanel");
const settingsForm = document.querySelector("#settingsForm");
const settingsStatus = document.querySelector("#settingsStatus");
const settingMaxPlayers = document.querySelector("#settingMaxPlayers");
const settingWalletLimit = document.querySelector("#settingWalletLimit");
const settingBetTimer = document.querySelector("#settingBetTimer");
const settingBelowPayout = document.querySelector("#settingBelowPayout");
const settingExactPayout = document.querySelector("#settingExactPayout");
const settingAbovePayout = document.querySelector("#settingAbovePayout");
const playerProfilePanel = document.querySelector("#playerProfilePanel");
const playerHomeStats = document.querySelector("#playerHomeStats");
const homeOnTableTotal = document.querySelector("#homeOnTableTotal");
const homeActiveBetCount = document.querySelector("#homeActiveBetCount");
const homeWonTotal = document.querySelector("#homeWonTotal");
const homeWinCount = document.querySelector("#homeWinCount");
const profileBoughtTotal = document.querySelector("#profileBoughtTotal");
const profileBetCount = document.querySelector("#profileBetCount");
const profileOnTableTotal = document.querySelector("#profileOnTableTotal");
const profileActiveBetCount = document.querySelector("#profileActiveBetCount");
const profileWonTotal = document.querySelector("#profileWonTotal");
const profileWinCount = document.querySelector("#profileWinCount");
const profileWithdrawBalance = document.querySelector("#profileWithdrawBalance");
const transactionList = document.querySelector("#transactionList");

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
  betEndsAt: null,
  betTimerId: null,
  players: createPlayers(),
  history: []
};

const viewContext = getViewContext();
let sessionHydrated = false;
let liveSyncId = null;
let walletSocket = null;
let paymentConfig = {
  enabled: false,
  keyId: "",
  currency: "INR"
};
const inputDrafts = {
  walletAdds: {},
  laneBets: {}
};

initGame();
registerServiceWorker();

startBettingBtn.addEventListener("click", startBetting);
rollBtn.addEventListener("click", rollDice);
nextRoundBtn.addEventListener("click", startNextRound);
resetBtn.addEventListener("click", resetGame);
profileAddMoneyBtn.addEventListener("click", handleProfileAddMoney);
adminKeyInput.addEventListener("input", saveAdminKey);
playerConsentInput.addEventListener("input", savePlayerConsentToken);
loginForm.addEventListener("submit", handleLogin);
playerLoginLink.addEventListener("click", confirmPlayerLoginNavigation);
logoutBtn.addEventListener("click", logout);
settingsForm.addEventListener("submit", handleSettingsSubmit);

profileTrigger.addEventListener("click", (event) => {
  event.stopPropagation();
  profileBar.classList.toggle("is-expanded");
});

document.addEventListener("click", (event) => {
  if (!profileBar.contains(event.target)) {
    profileBar.classList.remove("is-expanded");
  }
});

function getViewContext() {
  if (window.location.pathname === "/" || window.location.pathname === "/login") {
    return {
      role: "login",
      playerId: null
    };
  }

  if (window.location.pathname === "/admin-login") {
    return {
      role: "admin-login",
      playerId: null
    };
  }

  if (window.location.pathname === "/player-login") {
    return {
      role: "player-login",
      playerId: null
    };
  }

  const playerMatch = window.location.pathname.match(/^\/player\/(\d+)(\/profile)?$/);
  const playerId = playerMatch ? Number(playerMatch[1]) : null;

  if (playerId && playerId >= 1 && playerId <= gameSettings.maxPlayers) {
    return {
      role: "player",
      playerId,
      page: playerMatch[2] ? "profile" : "home"
    };
  }

  if (window.location.pathname === "/settings") {
    return {
      role: "admin",
      page: "settings",
      playerId: null
    };
  }

  return {
    role: "admin",
    playerId: null
  };
}

function configurePageChrome() {
  const isAdmin = viewContext.role === "admin";
  const isPlayer = viewContext.role === "player";
  const isPlayerProfile = isPlayer && viewContext.page === "profile";
  const isSettings = isAdmin && viewContext.page === "settings";
  const isLogin = viewContext.role === "login" || viewContext.role.endsWith("-login");

  gameHeader.classList.toggle("is-player-shell", isPlayer);
  gameHeader.classList.toggle("is-player-profile", isPlayerProfile);
  pageEyebrow.textContent = isLogin ? "Secure entry" : isAdmin ? "Admin table" : "Player table";
  pageTitle.textContent = viewContext.role === "login"
    ? "Lucky 7 Login"
    : viewContext.role === "admin-login"
    ? "Admin Login"
    : viewContext.role === "player-login"
      ? "Player Login"
      : isAdmin ? "Lucky 7 Admin" : isPlayerProfile ? `Player ${viewContext.playerId} Profile` : `Player ${viewContext.playerId}`;
  pageIntro.textContent = isSettings
    ? "Configure table settings, payout multipliers, and game rules."
    : isAdmin
      ? "Control the round, monitor all players, roll dice, and move the table forward."
      : isPlayerProfile
        ? "Review wallet activity, withdrawals, and recent transactions."
        : isPlayer
        ? "Add money to your wallet, then type a bet amount on Below 7, Exact 7, or Above 7."
        : "Enter with your admin key or player seat before joining the live table.";
  playerPanelTitle.textContent = isAdmin
    ? "Monitor players and manage table flow"
    : "Add wallet funds, then type lane bets when betting opens";
  loginPanel.hidden = !isLogin;
  roleNav.hidden = isLogin || isPlayer;
  profileBar.hidden = isLogin;
  profileBadge.textContent = isPlayer ? `P${viewContext.playerId}` : isAdmin ? "A" : "P";
  profileName.textContent = isAdmin ? "Admin" : isPlayer ? `Player ${viewContext.playerId}` : "Guest";
  playerHomeLink.hidden = isLogin;
  playerProfileLink.hidden = !isPlayer;
  settingsLink.hidden = !isAdmin;
  playerHomeLink.href = isAdmin ? "/admin" : isPlayer ? `/player/${viewContext.playerId}` : "#";
  playerProfileLink.href = isPlayer ? `/player/${viewContext.playerId}/profile` : "#";
  playerHomeLink.classList.toggle("is-active", isAdmin ? !isSettings : isPlayer && viewContext.page === "home");
  playerProfileLink.classList.toggle("is-active", isPlayerProfile);
  const isGameContentHidden = isLogin || isPlayerProfile || isSettings;
  document.querySelector(".table-top").hidden = isGameContentHidden;
  laneGrid.hidden = isGameContentHidden;
  document.querySelector(".player-panel").hidden = isGameContentHidden;
  playerHomeStats.hidden = !isPlayer || isPlayerProfile;
  playerProfilePanel.hidden = !isPlayerProfile;
  document.querySelector(".history-panel").hidden = isGameContentHidden;
  settingsPanel.hidden = !isSettings;
  loginLabel.textContent = "Login";
  loginTitle.textContent = "Enter the table";
  loginDetail.textContent = "Use admin credentials or a player username such as player1.";
  controlsPanel?.classList.remove("is-admin-only");
  adminKeyField.hidden = !isAdmin;
  adminKeyInput.value = getAdminKey();
  playerConsentField.hidden = !isAdmin;
  playerConsentInput.value = getPlayerConsentToken(state.activePlayerId);
  adminLink.classList.toggle("is-active", isAdmin && !isSettings);
  playerLoginLink.classList.toggle("is-active", viewContext.role === "player-login");
  renderPlayerLinks();
  renderSettingsForm();
}

function renderPlayerLinks() {
  playerLinks.innerHTML = "";

  Array.from({ length: gameSettings.maxPlayers }, (_, index) => index + 1).forEach((playerId) => {
    const link = document.createElement("a");
    link.href = viewContext.role === "admin" ? "#" : `/player/${playerId}`;
    link.textContent = `P${playerId}`;
    link.className = viewContext.playerId === playerId ? "is-active" : "";
    if (viewContext.role === "admin") {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        selectPlayer(playerId);
      });
    }
    playerLinks.appendChild(link);
  });
}

function renderSettingsForm() {
  if (viewContext.role !== "admin") {
    return;
  }

  settingMaxPlayers.value = gameSettings.maxPlayers;
  settingWalletLimit.value = gameSettings.maxPurchasePerPlayer;
  settingBetTimer.value = gameSettings.betTimeSeconds;
  settingBelowPayout.value = getLaneSetting("below").payoutMultiplier;
  settingExactPayout.value = getLaneSetting("exact").payoutMultiplier;
  settingAbovePayout.value = getLaneSetting("above").payoutMultiplier;
}

async function handleSettingsSubmit(event) {
  event.preventDefault();

  if (viewContext.role !== "admin") {
    return;
  }

  const restart = event.submitter?.value === "restart";

  try {
    const response = await fetch("/api/game/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": getAdminKey()
      },
      body: JSON.stringify({
        restart,
        settings: {
          maxPlayers: Number(settingMaxPlayers.value),
          maxPurchasePerPlayer: Number(settingWalletLimit.value),
          betTimeSeconds: Number(settingBetTimer.value)
        },
        lanes: [
          { id: "below", payoutMultiplier: Number(settingBelowPayout.value) },
          { id: "exact", payoutMultiplier: Number(settingExactPayout.value) },
          { id: "above", payoutMultiplier: Number(settingAbovePayout.value) }
        ]
      })
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || "Settings update failed.");
    }

    gameSettings = { ...gameSettings, ...body.config.settings };
    lanes = body.config.lanes.map((lane) => ({
      ...lane,
      test: (sum) => sum >= lane.minSum && sum <= lane.maxSum
    }));

    if (body.session) {
      applyGameSession(body.session);
    }

    renderPlayerLinks();
    renderSettingsForm();
    render();
    reconcileBetTimer();
    settingsStatus.textContent = restart
      ? "Settings saved and game restarted."
      : "Settings saved for the current table.";
  } catch (error) {
    settingsStatus.textContent = error.message;
  }
}

function getLaneSetting(laneId) {
  return lanes.find((lane) => lane.id === laneId) || { payoutMultiplier: 1 };
}

function getAdminKey() {
  return window.sessionStorage.getItem("lucky7AdminKey") || "";
}

function saveAdminKey() {
  window.sessionStorage.setItem("lucky7AdminKey", adminKeyInput.value.trim());
}

function getLoggedInPlayerId() {
  return Number(window.sessionStorage.getItem("lucky7PlayerId"));
}

function getPlayerAuthToken() {
  return window.sessionStorage.getItem("lucky7PlayerToken") || "";
}

function getPlayerConsentToken(playerId) {
  return window.sessionStorage.getItem(`lucky7ConsentToken:${playerId}`) || "";
}

function clearLoginSession() {
  window.sessionStorage.removeItem("lucky7AdminKey");
  window.sessionStorage.removeItem("lucky7PlayerId");
  window.sessionStorage.removeItem("lucky7PlayerToken");
}

function logout() {
  const profileLabel = viewContext.role === "admin" ? "admin" : `player ${viewContext.playerId}`;

  if (!window.confirm(`Log out of ${profileLabel}?`)) {
    return;
  }

  clearLoginSession();
  window.location.replace("/login");
}

function confirmPlayerLoginNavigation(event) {
  if (viewContext.role !== "admin" && viewContext.role !== "player") {
    return;
  }

  if (!window.confirm("Leave this profile and open player login?")) {
    event.preventDefault();
  }
}

function canControlActivePlayer() {
  if (viewContext.role === "player") {
    return true;
  }

  if (viewContext.role === "admin") {
    return Boolean(getPlayerConsentToken(getActivePlayer().id));
  }

  return false;
}

function savePlayerConsentToken() {
  window.sessionStorage.setItem(`lucky7ConsentToken:${state.activePlayerId}`, playerConsentInput.value.trim().toUpperCase());
  render();
}

async function handleLogin(event) {
  event.preventDefault();
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: loginUsernameInput.value.trim(),
        password: loginPasswordInput.value
      })
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || "Login failed.");
    }

    if (body.role === "admin") {
      window.sessionStorage.setItem("lucky7AdminKey", body.adminToken);
      window.sessionStorage.removeItem("lucky7PlayerId");
      window.sessionStorage.removeItem("lucky7PlayerToken");
      window.location.href = "/admin";
      return;
    }

    if (body.role === "player") {
      window.sessionStorage.removeItem("lucky7AdminKey");
      window.sessionStorage.setItem("lucky7PlayerId", String(body.playerId));
      window.sessionStorage.setItem("lucky7PlayerToken", body.playerToken);
      window.location.href = `/player/${body.playerId}`;
      return;
    }

    throw new Error("Login failed.");
  } catch (error) {
    loginDetail.textContent = error.message;
  }
}

async function initGame() {
  if (viewContext.role === "admin" && !await verifyAdminSession()) {
    clearLoginSession();
    window.location.replace("/login");
    return;
  }

  if (viewContext.role === "player" && !await verifyPlayerSession()) {
    clearLoginSession();
    window.location.replace("/login");
    return;
  }

  configurePageChrome();

  if (viewContext.role === "login" || viewContext.role.endsWith("-login")) {
    return;
  }

  render();
  await loadGameConfig();
  renderSettingsForm();
  await loadPaymentConfig();
  await loadGameSession();
  render();
  connectWalletSocket();
  startLiveSync();
  reconcileBetTimer();
}

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
  const focusedDraftInput = getFocusedDraftInput();
  const activePlayer = getActivePlayer();

  activePlayersEl.textContent = state.players.length;
  tablePotEl.textContent = formatRupees(getTablePot());
  roundNumberEl.textContent = state.round;
  timerLabel.textContent = state.phase === "staging" ? "Stage" : "Bet time";
  updateBetTimerDisplay();
  activePlayerName.textContent = activePlayer.name;
  activePlayerWallet.textContent = `Wallet: ${formatRupees(activePlayer.walletBalance)} | Add left: ${formatRupees(getPlayerBuyLimitLeft(activePlayer))}`;
  consentTokenText.hidden = viewContext.role !== "player";
  consentTokenText.textContent = `Consent token for admin help: ${activePlayer.consentToken || "----"}`;
  playerConsentField.querySelector("span").textContent = `Consent token for ${activePlayer.name}`;
  playerLimitText.textContent = `Max wallet add per player: ${formatRupees(gameSettings.maxPurchasePerPlayer)}`;

  renderLanes();
  renderPlayers();
  renderBuyCards();
  renderHand();
  renderPlayerDashboard();
  renderPlayerProfile();
  renderHistory();
  updateControls();
  restoreFocusedDraftInput(focusedDraftInput);
}

async function verifyAdminSession() {
  const adminKey = getAdminKey();

  if (!adminKey) {
    return false;
  }

  try {
    const response = await fetch("/api/auth/admin-session", {
      cache: "no-store",
      headers: {
        "x-admin-key": adminKey
      }
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

async function verifyPlayerSession() {
  if (getLoggedInPlayerId() !== viewContext.playerId || !getPlayerAuthToken()) {
    return false;
  }

  try {
    const response = await fetch("/api/auth/player-session", {
      cache: "no-store",
      headers: getSessionHeaders()
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

function renderLanes() {
  laneGrid.innerHTML = "";

  lanes.forEach((lane) => {
    const laneTotal = getLaneTotal(lane.id);
    const lanePlayers = getLanePlayers(lane.id);
    const activePlayer = getActivePlayer();
    const activePlayerLaneBet = getPlayerLaneBet(activePlayer, lane.id);
    const canBet = Boolean(
      state.bettingOpen
      && state.phase === "betting"
      && !state.roundResolved
      && !state.rolling
      && canControlActivePlayer()
      && activePlayer.walletBalance > 0
    );
    const canRemoveBet = Boolean(canBet && activePlayerLaneBet > 0);
    const laneBetDraftKey = getLaneBetDraftKey(activePlayer.id, lane.id);
    const laneBetDraftValue = inputDrafts.laneBets[laneBetDraftKey] || "";
    const laneEl = document.createElement("article");
    laneEl.className = "lane";
    laneEl.style.setProperty("--lane-color", lane.color);

    if (state.selectedLane === lane.id) {
      laneEl.classList.add("is-selected");
    }

    if (state.winningLaneId === lane.id) {
      laneEl.classList.add("is-winning-lane");
    }

    if (state.roundResolved && state.winningLaneId && state.winningLaneId !== lane.id) {
      laneEl.classList.add("is-dimmed-lane");
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
        <form class="lane-bet-form">
          <label>
            <span>Your bet${activePlayerLaneBet > 0 ? `: ${formatRupees(activePlayerLaneBet)}` : ""}</span>
            <input type="text" inputmode="numeric" pattern="[0-9]*" min="1" max="${activePlayer.walletBalance}" step="1" value="${escapeAttribute(laneBetDraftValue)}" data-draft-kind="laneBet" data-draft-key="${escapeAttribute(laneBetDraftKey)}" placeholder="${activePlayer.walletBalance > 0 ? `1-${activePlayer.walletBalance}` : "Wallet 0"}" ${canBet ? "" : "disabled"}>
          </label>
          <button type="submit" class="lane-action" ${canBet ? "" : "disabled"}>Place</button>
          <button type="button" class="lane-remove" ${canRemoveBet ? "" : "disabled"}>Remove</button>
        </form>
      </div>
    `;

    const betForm = laneEl.querySelector(".lane-bet-form");
    const betInput = betForm.querySelector("input");
    betInput.addEventListener("input", () => {
      betInput.value = betInput.value.replace(/\D/g, "");
      inputDrafts.laneBets[laneBetDraftKey] = betInput.value;
    });
    betForm.addEventListener("submit", (event) => {
      event.preventDefault();
      placeLaneBet(lane.id, betInput.value);
    });
    laneEl.querySelector(".lane-remove").addEventListener("click", () => {
      removeLaneBet(lane.id);
    });
    laneGrid.appendChild(laneEl);
  });
}

function renderPlayers() {
  playerList.innerHTML = "";

  state.players.forEach((player) => {
    if (viewContext.role === "player" && player.id !== viewContext.playerId) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-seat";

    if (player.id === getActivePlayer().id) {
      button.classList.add("is-active");
    }

    button.innerHTML = `
      <span>${player.name}</span>
      <strong>${formatRupees(getPlayerRoundBet(player))}</strong>
      <div class="player-money-row">
        <small><em>Bought</em>${formatRupees(player.purchasedTotal)}</small>
        <small><em>Wallet</em>${formatRupees(player.walletBalance)}</small>
        <small><em>On table</em>${formatRupees(getPlayerRoundBet(player))}</small>
        <small><em>Won</em>${formatRupees(player.winnings)}</small>
        <small><em>Total</em>${formatRupees(getPlayerTotalMoney(player))}</small>
      </div>
    `;

    if (viewContext.role === "admin") {
      button.addEventListener("click", () => selectPlayer(player.id));
    } else {
      button.disabled = true;
    }

    playerList.appendChild(button);
  });
}

function renderBuyCards() {
  const activePlayer = getActivePlayer();
  const canBuyNow = state.phase === "staging"
    && !state.roundResolved
    && !state.rolling
    && canControlActivePlayer();
  buyCardPanel.innerHTML = "";

  const customWrap = document.createElement("form");
  const maxCustomAmount = getMaxBuyAmount(activePlayer);
  const walletDraftKey = getWalletDraftKey(activePlayer.id);
  const walletDraftValue = inputDrafts.walletAdds[walletDraftKey] || "";
  customWrap.className = "custom-buy";
  customWrap.innerHTML = `
    <label>
      <span>Add to wallet</span>
      <input type="text" inputmode="numeric" pattern="[0-9]*" min="1" max="${maxCustomAmount}" step="1" value="${escapeAttribute(walletDraftValue)}" data-draft-kind="walletAdd" data-draft-key="${escapeAttribute(walletDraftKey)}" placeholder="${maxCustomAmount > 0 ? `1-${maxCustomAmount}` : "Max 0"}">
    </label>
    <button type="submit" class="buy-card">Add</button>
  `;

  const input = customWrap.querySelector("input");
  const customBuyButton = customWrap.querySelector("button");
  input.disabled = !canBuyNow || maxCustomAmount <= 0;
  customBuyButton.disabled = !canBuyNow || maxCustomAmount <= 0;
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "");
    inputDrafts.walletAdds[walletDraftKey] = input.value;
  });
  customWrap.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(input.value);

    if (!Number.isInteger(amount) || amount <= 0) {
      roundResult.textContent = "Enter whole rupees";
      roundDetail.textContent = "Use a whole rupee amount with no decimals.";
      return;
    }

    if (amount > maxCustomAmount) {
      roundResult.textContent = "Amount too high";
      roundDetail.textContent = `This player can add up to ${formatRupees(maxCustomAmount)} right now.`;
      return;
    }

    addWalletFunds(amount);
  });
  buyCardPanel.appendChild(customWrap);
}

function renderHand() {
  const activePlayer = getActivePlayer();
  cardHand.innerHTML = "";
  const walletSummary = document.createElement("p");
  walletSummary.className = "empty-hand";
  walletSummary.textContent = state.phase === "betting"
    ? `${formatRupees(activePlayer.walletBalance)} available. Type an amount directly on a lane to place a bet.`
    : `${formatRupees(activePlayer.walletBalance)} in wallet. Add funds before betting starts.`;
  cardHand.appendChild(walletSummary);
}

function renderHistory() {
  historyList.innerHTML = "";

  if (state.history.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.innerHTML = "<strong>No rolls yet</strong>Add wallet funds and place lane bets before the timer reaches zero.";
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

function renderPlayerDashboard() {
  if (viewContext.role !== "player" && viewContext.role !== "admin") {
    return;
  }

  const player = getActivePlayer();
  const stats = getPlayerStats(player);

  homeOnTableTotal.textContent = formatRupees(stats.onTable);
  homeActiveBetCount.textContent = stats.activeBetCount;
  homeWonTotal.textContent = formatRupees(player.winnings);
  homeWinCount.textContent = player.winnings > 0 ? 1 : 0;
}

function renderPlayerProfile() {
  if (viewContext.role !== "player") {
    return;
  }

  const player = getActivePlayer();
  const stats = getPlayerStats(player);

  profileBoughtTotal.textContent = formatRupees(player.purchasedTotal);
  profileBetCount.textContent = stats.betCount;
  profileOnTableTotal.textContent = formatRupees(stats.onTable);
  profileActiveBetCount.textContent = stats.activeBetCount;
  profileWonTotal.textContent = formatRupees(player.winnings);
  profileWinCount.textContent = player.winnings > 0 ? 1 : 0;
  profileWithdrawBalance.textContent = formatRupees(getPlayerTotalMoney(player));
  profileAddWalletBalance.textContent = formatRupees(player.walletBalance);
  const maxAdd = getMaxBuyAmount(player);
  profileAddMoneyInput.placeholder = maxAdd > 0 ? `Max ${formatRupees(maxAdd)}` : "Max 0";
  profileAddMoneyInput.disabled = state.phase !== "staging" || maxAdd <= 0;
  profileAddMoneyBtn.disabled = state.phase !== "staging" || maxAdd <= 0;
  profileAddMoneyInfo.textContent = maxAdd > 0
    ? `Add up to ${formatRupees(maxAdd)} more to your wallet`
    : "Wallet purchase limit reached";
  transactionList.innerHTML = getPlayerTransactions(player, stats)
    .map((entry) => `
      <div class="transaction-row">
        <span>${entry.type}</span>
        <span><b class="status-pill ${entry.statusClass}">${entry.status}</b></span>
        <span class="${entry.amountClass}">${entry.amount}</span>
        <span>${entry.date}</span>
        <span>${entry.reference}</span>
      </div>
    `)
    .join("");
}

function getPlayerStats(player) {
  const betEntries = lanes.flatMap((lane) => player.bets[lane.id] || []);
  const onTable = getPlayerRoundBet(player);

  return {
    activeBetCount: betEntries.length,
    betCount: betEntries.length,
    onTable
  };
}

function getPlayerTransactions(player, stats) {
  const transactions = [];

  if (player.purchasedTotal > 0) {
    transactions.push({
      type: "Added Funds",
      status: "Success",
      statusClass: "is-success",
      amount: formatRupees(player.purchasedTotal),
      amountClass: "is-credit",
      date: "Current session",
      reference: `TXN-P${player.id}-ADD`
    });
  }

  if (stats.onTable > 0) {
    transactions.push({
      type: "Bet Placed",
      status: "Active",
      statusClass: "is-pending",
      amount: `- ${formatRupees(stats.onTable)}`,
      amountClass: "is-debit",
      date: "Current round",
      reference: `BET-R${state.round}-P${player.id}`
    });
  }

  if (player.winnings > 0) {
    transactions.push({
      type: "Winnings",
      status: "Success",
      statusClass: "is-success",
      amount: formatRupees(player.winnings),
      amountClass: "is-credit",
      date: "Current round",
      reference: `WIN-R${state.round}-P${player.id}`
    });
  }

  if (transactions.length === 0) {
    transactions.push({
      type: "No transactions",
      status: "Ready",
      statusClass: "is-pending",
      amount: formatRupees(0),
      amountClass: "",
      date: "Current session",
      reference: "-"
    });
  }

  return transactions;
}

function updateControls() {
  if (viewContext.role !== "admin") {
    startBettingBtn.hidden = true;
    rollBtn.hidden = true;
    nextRoundBtn.hidden = true;
    resetBtn.hidden = true;
    return;
  }

  startBettingBtn.hidden = state.phase !== "staging";
  startBettingBtn.disabled = state.rolling || state.roundResolved;
  rollBtn.disabled = !state.bettingOpen || state.rolling || state.roundResolved;
  nextRoundBtn.hidden = !state.roundResolved;
}

async function selectPlayer(playerId) {
  await runGameAction("/api/game/actions/select-player", { playerId });
}

async function buyCard(value) {
  if (state.phase !== "staging") {
    return;
  }

  const success = await runGameAction("/api/game/actions/buy-card", {
    playerId: getActivePlayer().id,
    value
  });

  if (success) {
    delete inputDrafts.walletAdds[getWalletDraftKey(getActivePlayer().id)];
    render();
  }
}

async function handleProfileAddMoney() {
  const value = Number(profileAddMoneyInput.value);
  const player = getActivePlayer();
  const maxAmount = getMaxBuyAmount(player);

  if (!Number.isInteger(value) || value <= 0) {
    profileAddMoneyInfo.textContent = "Enter a whole rupee amount.";
    return;
  }
  if (value > maxAmount) {
    profileAddMoneyInfo.textContent = `Max add: ${formatRupees(maxAmount)}.`;
    return;
  }
  if (state.phase !== "staging") {
    profileAddMoneyInfo.textContent = "Wallet funds can only be added during staging.";
    return;
  }

  await buyCard(value);
  profileAddMoneyInput.value = "";
  profileAddMoneyInfo.textContent = `${formatRupees(value)} added to wallet.`;
}

async function addWalletFunds(value) {
  if (state.phase !== "staging") {
    return;
  }

  if (!paymentConfig.enabled || !paymentConfig.keyId) {
    await buyCard(value);
    roundResult.textContent = "Wallet updated";
    roundDetail.textContent = `${formatRupees(value)} was added locally. Configure Razorpay keys to collect real payments.`;
    return;
  }

  if (viewContext.role !== "player") {
    roundResult.textContent = "Player payment required";
    roundDetail.textContent = "Open the player page to add wallet funds through Razorpay.";
    return;
  }

  try {
    const order = await createPaymentOrder(value);
    const payment = await openRazorpayCheckout(order);
    const result = await verifyPayment(payment);

    if (result.session) {
      applyGameSession(result.session);
      delete inputDrafts.walletAdds[getWalletDraftKey(getActivePlayer().id)];
      render();
      reconcileBetTimer();
    }

    roundResult.textContent = "Payment successful";
    roundDetail.textContent = `${formatRupees(value)} was added to your wallet.`;
  } catch (error) {
    roundResult.textContent = "Payment failed";
    roundDetail.textContent = error.message;
  }
}

async function startBetting() {
  if (viewContext.role !== "admin") {
    return;
  }

  if (state.phase !== "staging" || state.rolling || state.roundResolved) {
    return;
  }

  await runGameAction("/api/game/actions/start-betting");
  reconcileBetTimer();
}

async function placeLaneBet(laneId, value) {
  const activePlayer = getActivePlayer();
  const amount = Number(value);

  if (!state.bettingOpen || state.phase !== "betting" || state.roundResolved || state.rolling) {
    return;
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    roundResult.textContent = "Enter whole rupees";
    roundDetail.textContent = "Use a whole rupee amount with no decimals.";
    return;
  }

  if (amount > activePlayer.walletBalance) {
    roundResult.textContent = "Not enough wallet";
    roundDetail.textContent = `${activePlayer.name} has ${formatRupees(activePlayer.walletBalance)} available.`;
    return;
  }

  const success = await runGameAction("/api/game/actions/place-bet", {
    playerId: activePlayer.id,
    amount,
    laneId
  });

  if (success) {
    delete inputDrafts.laneBets[getLaneBetDraftKey(activePlayer.id, laneId)];
    render();
  }
}

async function removeLaneBet(laneId) {
  const activePlayer = getActivePlayer();

  if (!state.bettingOpen || state.phase !== "betting" || state.roundResolved || state.rolling) {
    return;
  }

  const success = await runGameAction("/api/game/actions/remove-bet", {
    playerId: activePlayer.id,
    laneId
  });

  if (success) {
    delete inputDrafts.laneBets[getLaneBetDraftKey(activePlayer.id, laneId)];
    render();
  }
}

async function rollDice() {
  if (viewContext.role !== "admin") {
    return;
  }

  if (!state.bettingOpen || state.phase !== "betting" || state.rolling || state.roundResolved) {
    return;
  }

  const previousBetSecondsLeft = state.betSecondsLeft;
  stopBetTimer();
  state.bettingOpen = false;
  state.phase = "rolling";
  state.selectedCardId = null;
  state.betSecondsLeft = 0;
  state.betEndsAt = null;
  state.rolling = true;
  rollBtn.disabled = true;
  dicePair.classList.add("is-rolling");
  roundResult.textContent = "Rolling...";
  roundDetail.textContent = "The winning lane is decided by the total of both dice.";

  let session;
  try {
    session = await postGameAction("/api/game/actions/roll");
  } catch (error) {
    state.rolling = false;
    state.phase = "betting";
    state.bettingOpen = true;
    state.betSecondsLeft = previousBetSecondsLeft;
    state.betEndsAt = Date.now() + Math.max(previousBetSecondsLeft, 1) * 1000;
    rollBtn.disabled = false;
    roundResult.textContent = "Roll failed";
    roundDetail.textContent = "The backend could not roll the dice. Check the server and try again.";
    render();
    return;
  }

  const ticker = window.setInterval(() => {
    setDieFace(dieOne, randomDie());
    setDieFace(dieTwo, randomDie());
  }, 80);

  window.setTimeout(() => {
    window.clearInterval(ticker);

    dicePair.classList.remove("is-rolling");
    applyGameSession(session);
    render();
    animateDiceSettle();
    markWinningLane(state.winningLaneId);
  }, 900);
}

function markWinningLane(laneId) {
  const index = lanes.findIndex((lane) => lane.id === laneId);
  const laneEl = laneGrid.children[index];

  if (laneEl) {
    laneEl.classList.add("is-winner");
  }
}

async function startNextRound() {
  if (viewContext.role !== "admin") {
    return;
  }

  await runGameAction("/api/game/actions/next-round");
}

async function resetGame() {
  if (viewContext.role !== "admin") {
    return;
  }

  stopBetTimer();
  await runGameAction("/api/game/actions/reset");
}

function startBetTimer() {
  stopBetTimer();
  syncBetTimerFromDeadline();
  updateBetTimerDisplay();

  state.betTimerId = window.setInterval(() => {
    if (!shouldRunBetTimer()) {
      stopBetTimer();
      updateBetTimerDisplay();
      return;
    }

    syncBetTimerFromDeadline();
    updateBetTimerDisplay();

    if (state.betSecondsLeft === 0) {
      stopBetTimer();

      if (viewContext.role === "admin") {
        rollDice();
      } else {
        loadGameSession().then(() => {
          render();
          reconcileBetTimer();
        });
      }
    }
  }, 1000);
}

function reconcileBetTimer() {
  syncBetTimerFromDeadline();
  updateBetTimerDisplay();

  if (!shouldRunBetTimer()) {
    stopBetTimer();
    return;
  }

  if (state.betSecondsLeft === 0) {
    stopBetTimer();

    if (viewContext.role === "admin") {
      rollDice();
    } else {
      loadGameSession().then(() => {
        render();
        reconcileBetTimer();
      });
    }
    return;
  }

  if (!state.betTimerId) {
    startBetTimer();
  }
}

function shouldRunBetTimer() {
  return Boolean(state.bettingOpen && state.phase === "betting" && !state.rolling && !state.roundResolved);
}

function updateBetTimerDisplay() {
  betTimerEl.textContent = state.phase === "staging" ? "Ready" : `${getDisplayedBetSeconds()}s`;
}

function syncBetTimerFromDeadline() {
  if (!state.betEndsAt) {
    return state.betSecondsLeft;
  }

  state.betSecondsLeft = Math.max(0, Math.ceil((state.betEndsAt - Date.now()) / 1000));
  return state.betSecondsLeft;
}

function getDisplayedBetSeconds() {
  if (state.bettingOpen && state.phase === "betting") {
    return syncBetTimerFromDeadline();
  }

  return state.betSecondsLeft;
}

function stopBetTimer() {
  if (state.betTimerId) {
    window.clearInterval(state.betTimerId);
    state.betTimerId = null;
  }
}

function getActivePlayer() {
  if (viewContext.role === "player") {
    return state.players.find((player) => player.id === viewContext.playerId) || state.players[0];
  }

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

function getPlayerHandTotal(player) {
  return player.hand.reduce((sum, card) => sum + card.value, 0);
}

function getPlayerRemainingMoney(player) {
  return player.walletBalance;
}

function getPlayerTotalMoney(player) {
  return getPlayerRemainingMoney(player) + player.winnings;
}

function getPlayerBuyLimitLeft(player) {
  return Math.max(0, gameSettings.maxPurchasePerPlayer - player.purchasedTotal);
}

function getMaxBuyAmount(player) {
  return Math.floor(getPlayerBuyLimitLeft(player));
}

function getWalletDraftKey(playerId) {
  return String(playerId);
}

function getLaneBetDraftKey(playerId, laneId) {
  return `${playerId}:${laneId}`;
}

function getFocusedDraftInput() {
  const activeElement = document.activeElement;

  if (!activeElement || activeElement.tagName !== "INPUT" || !activeElement.dataset.draftKind) {
    return null;
  }

  return {
    kind: activeElement.dataset.draftKind,
    key: activeElement.dataset.draftKey,
    selectionStart: activeElement.selectionStart,
    selectionEnd: activeElement.selectionEnd
  };
}

function restoreFocusedDraftInput(focusedDraftInput) {
  if (!focusedDraftInput) {
    return;
  }

  const selector = `input[data-draft-kind="${cssEscape(focusedDraftInput.kind)}"][data-draft-key="${cssEscape(focusedDraftInput.key)}"]`;
  const input = document.querySelector(selector);

  if (!input || input.disabled) {
    return;
  }

  input.focus({ preventScroll: true });

  if (focusedDraftInput.selectionStart !== null && focusedDraftInput.selectionEnd !== null) {
    input.setSelectionRange(focusedDraftInput.selectionStart, focusedDraftInput.selectionEnd);
  }
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(String(value));
  }

  return String(value).replace(/["\\]/g, "\\$&");
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function setDieFace(die, value) {
  const face = Number(value);
  const pipMap = {
    1: ["pos-center"],
    2: ["pos-top-left", "pos-bottom-right"],
    3: ["pos-top-left", "pos-center", "pos-bottom-right"],
    4: ["pos-top-left", "pos-top-right", "pos-bottom-left", "pos-bottom-right"],
    5: ["pos-top-left", "pos-top-right", "pos-center", "pos-bottom-left", "pos-bottom-right"],
    6: ["pos-top-left", "pos-middle-left", "pos-bottom-left", "pos-top-right", "pos-middle-right", "pos-bottom-right"]
  };

  die.dataset.value = Number.isInteger(face) && pipMap[face] ? String(face) : "";

  if (!die.dataset.value) {
    die.textContent = "?";
    return;
  }

  die.innerHTML = pipMap[face]
    .map((position) => `<span class="die-pip ${position}"></span>`)
    .join("");
}

function animateDiceSettle() {
  [dieOne, dieTwo].forEach((die) => {
    die.classList.remove("is-settling");
    die.offsetHeight;
    die.classList.add("is-settling");
  });
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
  } catch (error) {
    // The local defaults keep the game playable if the API is unavailable.
  }
}

async function loadGameSession() {
  try {
    const response = await fetch("/api/game/session", {
      cache: "no-store",
      headers: getSessionHeaders()
    });

    if (!response.ok) {
      throw new Error("Session request failed");
    }

    const session = await response.json();
    applyGameSession(session);
    sessionHydrated = true;
  } catch (error) {
    sessionHydrated = true;
  }
}

function getSessionHeaders() {
  if (viewContext.role === "player") {
    return {
      "x-player-id": String(viewContext.playerId),
      "x-player-auth-token": getPlayerAuthToken()
    };
  }

  return {};
}

function connectWalletSocket() {
  if (!window.io || walletSocket || (viewContext.role !== "player" && viewContext.role !== "admin")) {
    return;
  }

  walletSocket = window.io({
    auth: {
      role: viewContext.role,
      playerId: viewContext.playerId,
      playerToken: getPlayerAuthToken(),
      adminKey: getAdminKey()
    }
  });

  walletSocket.on("wallet:updated", ({ session }) => {
    if (!session) {
      return;
    }

    applyGameSession(session);
    render();
    reconcileBetTimer();
  });
}

async function loadPaymentConfig() {
  try {
    const response = await fetch("/api/payment/config", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Payment config request failed");
    }

    paymentConfig = await response.json();
  } catch (error) {
    paymentConfig = {
      enabled: false,
      keyId: "",
      currency: "INR"
    };
  }
}

async function createPaymentOrder(amount) {
  if (!paymentConfig.enabled || !paymentConfig.keyId) {
    throw new Error("Razorpay is not configured on this server.");
  }

  const response = await fetch("/api/payment/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getSessionHeaders()
    },
    body: JSON.stringify({ amount })
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error || "Could not create payment order.");
  }

  return body;
}

function openRazorpayCheckout(order) {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Razorpay Checkout could not be loaded."));
      return;
    }

    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount * 100,
      currency: order.currency,
      name: "Lucky 7 Wallet",
      description: `Add ${formatRupees(order.amount)} to ${order.player.name}`,
      order_id: order.orderId,
      handler: resolve,
      modal: {
        ondismiss: () => reject(new Error("Payment was cancelled."))
      },
      notes: {
        transactionId: order.transactionId,
        playerId: String(order.player.id)
      },
      theme: {
        color: "#8f6a28"
      }
    });

    checkout.open();
  });
}

async function verifyPayment(payment) {
  const response = await fetch("/api/payment/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getSessionHeaders()
    },
    body: JSON.stringify(payment)
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error || "Payment verification failed.");
  }

  return body;
}

function startLiveSync() {
  window.clearInterval(liveSyncId);
  liveSyncId = window.setInterval(async () => {
    if (document.hidden || state.rolling) {
      return;
    }

    await loadGameSession();
    render();
    reconcileBetTimer();
  }, 1000);
}

function applyGameSession(session) {
  if (!session || !session.state) {
    return;
  }

  stopBetTimer();
  Object.assign(state, {
    ...session.state,
    rolling: false,
    betTimerId: null
  });

  syncBetTimerFromDeadline();

  if (!Array.isArray(state.players) || state.players.length === 0) {
    state.players = createPlayers();
  }

  if (!Array.isArray(state.history)) {
    state.history = [];
  }

  setDieFace(dieOne, session.ui?.dieOne || "?");
  setDieFace(dieTwo, session.ui?.dieTwo || "?");
  roundResult.textContent = session.ui?.roundResult || "Staging: add wallet funds";
  roundDetail.textContent = session.ui?.roundDetail || "Players can add money to their wallet now. The owner starts the betting timer when the table is ready.";
  playerConsentInput.value = getPlayerConsentToken(state.activePlayerId);
}

async function runGameAction(url, payload = {}) {
  try {
    const session = await postGameAction(url, payload);
    applyGameSession(session);
    render();

    if (state.bettingOpen && state.phase === "betting" && !state.roundResolved) {
      reconcileBetTimer();
    }
    return true;
  } catch (error) {
    roundResult.textContent = "Action failed";
    roundDetail.textContent = error.message;
    return false;
  }
}

async function postGameAction(url, payload = {}) {
  const headers = {
    "Content-Type": "application/json"
  };
  const adminKey = getAdminKey();

  if (viewContext.role === "admin" && adminKey) {
    headers["x-admin-key"] = adminKey;
  }

  if (viewContext.role === "player") {
    headers["x-player-id"] = String(viewContext.playerId);
    headers["x-player-auth-token"] = getPlayerAuthToken();
  }

  if (viewContext.role === "admin" && payload.playerId) {
    const consentToken = getPlayerConsentToken(payload.playerId);

    if (consentToken) {
      headers["x-player-consent-token"] = consentToken;
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error || "The server rejected the action.");
  }

  return body;
}

function formatRupees(value) {
  return `Rs ${Math.floor(Number(value) || 0)}`;
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.update())))
        .then(() => navigator.serviceWorker.register("./sw.js"))
        .catch(() => {
        // Offline support is optional; the game should still run without it.
        });
    });
  }
}
