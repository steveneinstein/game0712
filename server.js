const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const apiRoutes = require("./src/routes/api");
const createPaymentRouter = require("./src/routes/payment");
const { getSession } = require("./src/store/sessionStore");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");
const paymentRouter = createPaymentRouter({ io });

io.on("connection", (socket) => {
  const role = String(socket.handshake.auth?.role || "");
  const playerId = Number(socket.handshake.auth?.playerId);
  const playerToken = String(socket.handshake.auth?.playerToken || "");
  const adminKey = String(socket.handshake.auth?.adminKey || "");

  if (role === "admin" && adminKey === (process.env.ADMIN_PASSWORD || "admin")) {
    socket.join("admins");
    return;
  }

  if (role === "player" && playerId) {
    const player = getSession().state.players.find((entry) => entry.id === playerId);

    if (player && player.authToken && player.authToken === playerToken) {
      socket.join(`player:${playerId}`);
    }
  }
});

app.use("/payment", paymentRouter);
app.use("/api/payment", paymentRouter);
app.use(express.json());
app.use("/api", apiRoutes);

function sendApp(req, res) {
  res.sendFile(path.join(publicDir, "index.html"));
}

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", sendApp);
app.get("/admin-login", sendApp);
app.get("/player-login", sendApp);
app.get("/admin", sendApp);
app.get("/player/:playerId/profile", sendApp);
app.get("/player/:playerId", sendApp);

app.use(express.static(publicDir));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "API route not found." });
    return;
  }

  sendApp(req, res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Lucky 7 Cards server running on port ${PORT}`);
});
