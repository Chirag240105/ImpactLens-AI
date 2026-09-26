// Entry point — Chirag
// Wires up: env config, DB connection, middleware, routes, error handler.

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// TODO(Chirag): connect MongoDB
// const mongoose = require("mongoose");
// mongoose.connect(process.env.MONGODB_URI).then(...);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// TODO: mount routes here as they're built
// app.use("/api/auth", require("./routes/auth.routes"));
// app.use("/api/projects", require("./routes/project.routes"));
// app.use("/api/media", require("./routes/media.routes"));
// app.use("/api/search", require("./routes/search.routes"));
// app.use("/api/analysis", require("./routes/analysis.routes"));
// app.use("/api/reports", require("./routes/report.routes"));

// TODO: central error handler middleware (last app.use)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`ImpactLens server running on port ${PORT}`));
