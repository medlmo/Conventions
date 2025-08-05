import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    cb(null, `${baseName}-${uniqueSuffix}${extension}`);
  }
});

// File filter to accept only specific file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مسموح. يرجى رفع ملفات PDF, Word, Excel أو الصور فقط.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Helper function to delete uploaded files
export const deleteFile = (filePath: string): void => {
  try {
    // Validation de sécurité contre Path Traversal
    if (!filePath || typeof filePath !== 'string') {
      console.error('Invalid file path provided');
      return;
    }

    // Nettoyer le chemin et vérifier qu'il ne contient pas de séquences dangereuses
    const normalizedPath = path.normalize(filePath);
    
    // Vérifier que le chemin ne contient pas de séquences de navigation
    if (normalizedPath.includes('..') || normalizedPath.startsWith('/') || normalizedPath.startsWith('\\')) {
      console.error('Path traversal attempt detected:', filePath);
      return;
    }

    // Vérifier que le chemin final est bien dans le dossier uploads
    const fullPath = path.resolve(uploadsDir, normalizedPath);
    const uploadsDirResolved = path.resolve(uploadsDir);
    
    if (!fullPath.startsWith(uploadsDirResolved)) {
      console.error('Path traversal attempt detected - file outside uploads directory:', filePath);
      return;
    }

    // Vérifier que le fichier existe avant de le supprimer
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log('File deleted successfully:', filePath);
    } else {
      console.warn('File not found for deletion:', filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};