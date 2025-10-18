import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  minio: {
    endpoint: process.env.MINIO_ENDPOINT,
    port: Number(process.env.MINIO_PORT),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucket: process.env.MINIO_BUCKET,
  },
  jsonServerUrl: process.env.JSON_SERVER_URL,
};
