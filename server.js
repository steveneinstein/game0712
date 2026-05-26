const path = require("path");
const express = require("express");
const apiRoutes = require("./src/routes/api");

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");

app.use(express.json());
app.use("/api", apiRoutes);
app.use(express.static(publicDir));

app.use((req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, '0.0.0.0', () => { 
  console.log(`Lucky 7 Cards server running`);
});
