const { createInitialSession } = require("../config/game");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const SESSION_FILE = path.join(DATA_DIR, "session.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSessionFromDisk() {
  try {
    ensureDataDir();
    if (fs.existsSync(SESSION_FILE)) {
      const raw = fs.readFileSync(SESSION_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

function saveSessionToDisk(sessionData) {
  try {
    ensureDataDir();
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2), "utf8");
  } catch {
    // ignore
  }
}

let session = loadSessionFromDisk() || createInitialSession();
saveSessionToDisk(session);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getSession() {
  return clone(session);
}

function saveSession(nextSession) {
  session = {
    ...clone(nextSession),
    updatedAt: new Date().toISOString()
  };

  if (session.state) {
    session.state.rolling = false;
    session.state.betTimerId = null;
  }

  saveSessionToDisk(session);
  return getSession();
}

function updateSession(updater) {
  const nextSession = updater(clone(session));
  session = {
    ...nextSession,
    updatedAt: new Date().toISOString()
  };

  if (session.state) {
    session.state.rolling = false;
    session.state.betTimerId = null;
  }

  saveSessionToDisk(session);
  return getSession();
}

function resetSession() {
  const savedPlayers = (session.state?.players || []).map((player) => ({
    id: player.id,
    purchasedTotal: player.purchasedTotal || 0,
    walletBalance: player.walletBalance || 0,
    winnings: player.winnings || 0,
    consentToken: player.consentToken,
    authToken: player.authToken
  }));

  session = createInitialSession();

  session.state.players.forEach((player) => {
    const saved = savedPlayers.find((s) => s.id === player.id);
    if (!saved) return;
    player.purchasedTotal = saved.purchasedTotal;
    player.walletBalance = saved.walletBalance;
    player.winnings = saved.winnings;
    player.consentToken = saved.consentToken || player.consentToken;
    player.authToken = saved.authToken || player.authToken;
  });

  saveSessionToDisk(session);
  return getSession();
}

module.exports = {
  getSession,
  saveSession,
  updateSession,
  resetSession
};
