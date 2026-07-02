import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import aiRoutes from "./routes/ai.routes.js";

const app = express();
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use("/api/ai", aiRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);

// test protected route
app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({ message: "You are authorized!" });
});

app.get("/", (req, res) => {
  res.send("API Running");
});

export default app;
