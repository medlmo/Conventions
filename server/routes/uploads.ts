import { Router } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, requireRole } from "../auth";
import { deleteFile, persistUploads, upload, uploadsDir } from "../upload";
import { UserRole } from "@shared/schema";

export const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

export function createUploadsRouter(): Router {
  const router = Router();

  router.post("/", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), uploadLimiter, (req, res, next) => {
    upload.array("files", 5)(req, res, (err: any) => {
      if (err) {
        console.error("Multer error:", err);
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "الملف كبير جداً. الحد الأقصى هو 10 ميجابايت.",
            error: "FILE_TOO_LARGE",
          });
        }
        if (err.name === "MulterError") {
          switch (err.code) {
            case "LIMIT_FILE_COUNT":
              return res.status(400).json({
                message: "عدد الملفات كبير جداً. الحد الأقصى هو 5 ملفات.",
                error: "TOO_MANY_FILES",
              });
            case "LIMIT_UNEXPECTED_FILE":
              return res.status(400).json({
                message: "نوع الملف غير متوقع.",
                error: "UNEXPECTED_FILE",
              });
            default:
              return res.status(400).json({
                message: "خطأ في رفع الملفات.",
                error: "UPLOAD_ERROR",
              });
          }
        }
        return res.status(500).json({ message: "خطأ في رفع الملفات" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "لم يتم رفع أي ملفات" });
      }
      const uploadedFiles = await persistUploads(files);
      res.json({ files: uploadedFiles });
    } catch (error) {
      const code = (error as any)?.code;
      if (code === "UNSUPPORTED_FILE_TYPE") {
        return res.status(400).json({
          message: "نوع الملف غير مسموح. يرجى رفع ملفات PDF, Word, Excel أو الصور فقط.",
          error: "UNSUPPORTED_FILE_TYPE",
        });
      }
      if (code === "MISSING_BUFFER") {
        return res.status(400).json({
          message: "خطأ في معالجة الملف المرفوع",
          error: "MISSING_BUFFER",
        });
      }
      console.error("Error uploading files:", error);
      return res.status(500).json({ message: "خطأ في رفع الملفات" });
    }
  });

  router.delete("/:filename", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), (req, res) => {
    try {
      const { filename } = req.params;
      const ok = deleteFile(filename);
      if (!ok) {
        return res.status(404).json({ message: "الملف غير موجود أو غير صالح" });
      }
      return res.json({ message: "تم حذف الملف بنجاح" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "خطأ في حذف الملف" });
    }
  });

  return router;
}

export function createStaticUploadsMiddleware() {
  return [
    requireAuth,
    express.static(uploadsDir, {
      etag: false,
      maxAge: 0,
      setHeaders: (res) => {
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Disposition", "attachment");
      },
    }),
  ];
}
