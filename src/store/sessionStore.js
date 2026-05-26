const { createInitialSession } = require("../config/game");

let session = createInitialSession();

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

  return getSession();
}

function resetSession() {
  session = createInitialSession();
  return getSession();
}

module.exports = {
  getSession,
  saveSession,
  updateSession,
  resetSession
};
