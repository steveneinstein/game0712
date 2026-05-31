const path = require("path");
const express = require("express");
const apiRoutes = require("./src/routes/api");

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");

app.use(express.json());
app.use("/api", apiRoutes);
app.use(express.static(publicDir));

function sendApp(req, res) {
  res.sendFile(path.join(publicDir, "index.html"));
}

app.get("/", (req, res) => {
  res.redirect("/admin-login");
});

app.get("/admin-login", sendApp);
app.get("/player-login", sendApp);
app.get("/admin", sendApp);
app.get("/player/:playerId", sendApp);

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "API route not found." });
    return;
  }

  sendApp(req, res);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Lucky 7 Cards server running on port ${PORT}`);
});
