import express from "express";
import cors from "cors";
import fs from "fs";
import fileRoutes from "./routes/fileRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists for multer disk storage
try {
  fs.mkdirSync("uploads", { recursive: true });
} catch {}

app.use("/api/files", fileRoutes);

export default app;
