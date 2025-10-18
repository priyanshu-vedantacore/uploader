import express from "express";
import multer from "multer";
import { fileController } from "../controllers/fileController.js";

const router = express.Router();
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

router.post("/upload", upload.single("file"), fileController.upload);
router.get("/", fileController.list);
router.get("/:id/detail", fileController.detail);
router.delete("/:id", fileController.delete);

export default router;
