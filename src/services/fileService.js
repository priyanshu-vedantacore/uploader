import fs from "fs";
import { minioClient } from "../config/minio.js";
import { config } from "../config/env.js";

function objectUrlFor(key) {
  const protocol = config.minio.useSSL ? "https" : "http";
  return `${protocol}://${config.minio.endpoint}:${config.minio.port}/${config.minio.bucket}/${key}`;
}

export const fileService = {
    async uploadToMinio(localFile, metadata) {
        await minioClient.fPutObject(
            config.minio.bucket,
            metadata.storedName,
            localFile.path,
            {
                "Content-Type": localFile.mimetype,
            }
        );
        await fs.promises.unlink(localFile.path);
        return objectUrlFor(metadata.storedName);
    },

    async deleteFromMinio(filekey) {
        await minioClient.removeObject(config.minio.bucket, filekey);
        return true;
    },

    async uploadBufferToMinio(buffer, key, contentType) {
        await minioClient.putObject(
            config.minio.bucket,
            key,
            buffer,
            buffer.length,
            {
                "Content-Type": contentType,
            }
        );
        return objectUrlFor(key);
    },
};
