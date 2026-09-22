import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDatabase } from "./src/config/db.js";
import {
  errorHandler,
  notFoundHandler,
} from "./src/middleware/errorHandler.js";
import boxRoutes from "./src/routes/boxRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigin = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

app.use("/api/boxes", boxRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Box backend is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({
    app: "box-management-backend",
    status: "running",
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
