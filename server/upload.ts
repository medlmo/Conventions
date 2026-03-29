import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export const uploadsDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const toNormalizedExt = (ext: string): string => {
  const normalized = ext.toLowerCase();
  return normalized === ".jpeg" ? ".jpg" : normalized;
};

const allowedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".jpg",
  ".png",
  ".gif",
]);

const fileSignature = {
  pdf: "%PDF-",
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  jpg: Buffer.from([0xff, 0xd8, 0xff]),
  gif87a: Buffer.from("GIF87a", "ascii"),
  gif89a: Buffer.from("GIF89a", "ascii"),
  zip: Buffer.from([0x50, 0x4b, 0x03, 0x04]), // "PK.."
  ole: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), // OLE compound file
} as const;

type DetectedFile = { extension: string; mime: string };

function startsWith(buf: Buffer, signature: Buffer): boolean {
  return buf.subarray(0, signature.length).equals(signature);
}

function detectFileFromMagicBytes(buffer: Buffer, normalizedExt: string): DetectedFile | null {
  // PDFs
  if (normalizedExt === ".pdf" && buffer.subarray(0, fileSignature.pdf.length).toString("ascii") === fileSignature.pdf) {
    return { extension: ".pdf", mime: "application/pdf" };
  }

  // Images
  if (normalizedExt === ".png" && startsWith(buffer, fileSignature.png)) {
    return { extension: ".png", mime: "image/png" };
  }
  if (normalizedExt === ".jpg" && startsWith(buffer, fileSignature.jpg)) {
    return { extension: ".jpg", mime: "image/jpeg" };
  }
  if (normalizedExt === ".gif" && (startsWith(buffer, fileSignature.gif87a) || startsWith(buffer, fileSignature.gif89a))) {
    return { extension: ".gif", mime: "image/gif" };
  }

  // ZIP-based Office (docx/xlsx)
  if ((normalizedExt === ".docx" || normalizedExt === ".xlsx") && startsWith(buffer, fileSignature.zip)) {
    if (normalizedExt === ".docx") return { extension: ".docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
    return { extension: ".xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  }

  // OLE-based Office (doc/xls)
  if ((normalizedExt === ".doc" || normalizedExt === ".xls") && startsWith(buffer, fileSignature.ole)) {
    if (normalizedExt === ".doc") return { extension: ".doc", mime: "application/msword" };
    return { extension: ".xls", mime: "application/vnd.ms-excel" };
  }

  return null;
}

// We use memoryStorage so we can validate file content (magic bytes)
// before persisting anything to disk.
const storage = multer.memoryStorage();

// File filter to accept only specific file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = toNormalizedExt(path.extname(file.originalname || ""));

  // Reject early by extension. Content is verified later using magic bytes.
  if (!allowedExtensions.has(ext)) {
    return cb(new Error('نوع الملف غير مسموح. يرجى رفع ملفات PDF, Word, Excel أو الصور فقط.'));
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5,
  },
});

export type UploadedFileInfo = {
  originalName: string;
  filename: string;
  size: number;
  mimetype: string;
  path: string;
};

export async function persistUploads(files: Express.Multer.File[]): Promise<UploadedFileInfo[]> {
  const written: string[] = [];
  try {
    const results: UploadedFileInfo[] = [];

    for (const file of files) {
      const buffer = file.buffer;
      if (!buffer || !Buffer.isBuffer(buffer)) {
        const e = new Error("Invalid upload buffer");
        (e as any).code = "MISSING_BUFFER";
        throw e;
      }

      const normalizedExt = toNormalizedExt(path.extname(file.originalname || ""));
      const detected = detectFileFromMagicBytes(buffer, normalizedExt);
      if (!detected) {
        const e = new Error("Unsupported file type");
        (e as any).code = "UNSUPPORTED_FILE_TYPE";
        throw e;
      }

      // Unpredictable filename to prevent enumeration.
      const id = crypto.randomBytes(16).toString("hex"); // 32 hex chars
      const filename = `${id}${detected.extension}`;
      const fullPath = path.join(uploadsDir, filename);

      // Persist only after validation.
      await fs.promises.writeFile(fullPath, buffer);
      written.push(filename);

      results.push({
        originalName: file.originalname,
        filename,
        size: file.size,
        mimetype: detected.mime,
        path: `/uploads/${filename}`,
      });
    }

    return results;
  } catch (error) {
    // Best-effort cleanup for any files already written.
    for (const filename of written) {
      try {
        const fullPath = path.join(uploadsDir, filename);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      } catch {
        // ignore cleanup errors
      }
    }
    throw error;
  }
}

// Helper function to delete uploaded files
export const deleteFile = (fileName: string): boolean => {
  try {
    if (!fileName || typeof fileName !== "string") return false;

    // Ensure callers can only delete by filename (no directories).
    const basename = path.basename(fileName);
    if (basename !== fileName) return false;

    // Filename format: 32 hex chars + extension
    if (!/^[a-f0-9]{32}\.[a-z0-9]+$/i.test(fileName)) return false;

    const uploadsDirResolved = path.resolve(uploadsDir);
    const fullPath = path.resolve(uploadsDirResolved, fileName);
    const rel = path.relative(uploadsDirResolved, fullPath);

    if (rel.startsWith("..") || path.isAbsolute(rel)) return false;

    if (!fs.existsSync(fullPath)) return false;
    fs.unlinkSync(fullPath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};