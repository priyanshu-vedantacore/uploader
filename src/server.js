import app from "./app.js";
import { config } from "./config/env.js";
import { ensureBucketExists } from "./config/minio.js";

await ensureBucketExists();

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
