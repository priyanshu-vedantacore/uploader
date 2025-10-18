import { Client } from "minio";
import { config } from "./env.js";

export const minioClient = new Client({
  endPoint: config.minio.endpoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
});

export async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(config.minio.bucket);
    if (!exists) {
      await minioClient.makeBucket(config.minio.bucket, "us-east-1");
      console.log(`Created bucket: ${config.minio.bucket}`);
    }
  } catch (err) {
    console.error("MinIO bucket check/create failed:", err?.message || err);
    throw err;
  }
}

