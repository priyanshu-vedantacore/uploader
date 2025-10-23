import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import YAML from "yaml";
import fileRoutes from "./routes/fileRoutes.js";
import swaggerUi from "swagger-ui-express";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Ensure uploads directory exists for multer disk storage
try {
  fs.mkdirSync("uploads", { recursive: true });
} catch {}

app.use("/api/files", fileRoutes);

// Swagger UI at /api-docs
try {
  const swaggerPath = path.resolve(process.cwd(), "swagger.yaml");
  const swaggerText = fs.readFileSync(swaggerPath, "utf8");
  const swaggerDoc = YAML.parse(swaggerText);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  console.log("Swagger UI available at /api-docs");
} catch (e) {
  console.warn("Swagger setup skipped:", e?.message || e);
}

export default app;
