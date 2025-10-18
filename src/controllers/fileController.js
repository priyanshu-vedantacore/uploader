import { fileService } from "../services/fileService.js";
import { metadataService } from "../services/metadataService.js";
import sharp from "sharp";

export const fileController = {
  upload: async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }
      const metadata = {
        fileName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };

      // Prepare thumbnails if image/*
      const isImage = (file.mimetype || "").startsWith("image/");
      const thumbConfigs = isImage ? [200, 400] : [];
      const preparedThumbs = [];
      if (thumbConfigs.length > 0) {
        for (const w of thumbConfigs) {
          const { data, info } = await sharp(file.path)
            .resize(w, w, { fit: "inside" })
            .jpeg({ quality: 80 })
            .toBuffer({ resolveWithObject: true });

          const key = `thumbnails/${w}/${metadata.storedName}.jpg`;
          preparedThumbs.push({
            width: info.width,
            height: info.height,
            bytes: data.length,
            contentType: "image/jpeg",
            key,
            buffer: data,
            label: `${w}`,
          });
        }
      }

      const url = await fileService.uploadToMinio(file, metadata);
      metadata.url = url;

      const saved = await metadataService.saveMetadata(metadata);

      // If not an image, skip thumbnails entirely
      if (!isImage) {
        return res.status(201).json({ message: "File uploaded successfully", data: saved });
      }

      // Upload thumbnails and store their metadata linked to original
      const savedThumbs = [];
      for (const t of preparedThumbs) {
        const tUrl = await fileService.uploadBufferToMinio(t.buffer, t.key, t.contentType);
        const tMeta = {
          parentId: saved.id,
          fileName: `${t.label} - ${metadata.fileName}`,
          storedName: t.key,
          mimeType: t.contentType,
          size: t.bytes,
          width: t.width,
          height: t.height,
          uploadedAt: new Date().toISOString(),
          url: tUrl,
          type: "thumbnail",
          variant: t.label,
        };
        const tSaved = await metadataService.saveMetadata(tMeta);
        savedThumbs.push(tSaved);
      }

      if (savedThumbs.length > 0) {
        await metadataService.updateFileById(saved.id, {
          thumbnailIds: savedThumbs.map((t) => t.id),
        });
      }

      res.status(201).json({ message: "File uploaded successfully", data: { original: saved, thumbnails: savedThumbs } });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "File upload failed" });
    }
  },

  list: async (req, res) => {
    try {
      const files = await metadataService.getAllFiles();
      res.json(files);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const { storedName } = req.query;
      let file = await metadataService.getFileById(id);
      if (!file && storedName) {
        file = await metadataService.getFileByStoredName(storedName);
      }
      if (!file) {
        // As a convenience, treat :id as storedName fallback
        file = await metadataService.getFileByStoredName(id);
      }
      if (!file) return res.status(404).json({ error: "File not found" });

      try {
        await fileService.deleteFromMinio(file.storedName);
      } catch (e) {
        // If object already missing, still attempt metadata delete
        console.warn("MinIO delete warning:", e?.message || e);
      }
      await metadataService.deleteFileById(file.id);

      res.json({ message: "File deleted successfully" });
    } catch (err) {
      if (err?.response?.status === 404) {
        return res.status(404).json({ error: "File not found" });
      }
      res.status(500).json({ error: "Failed to delete file" });
    }
  },
};
