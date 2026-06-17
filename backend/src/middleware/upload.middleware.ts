import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import { env } from '../config/env';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const dest = path.join(env.UPLOAD_DIR, 'documents');
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dest = path.join(env.UPLOAD_DIR, 'photos');
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const allowedDocTypes = ['image/jpeg', 'image/png', 'application/pdf'];
const allowedPhotoTypes = ['image/jpeg', 'image/png'];

const docFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (allowedDocTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only PDF, JPG, PNG files are allowed'));
};

const photoFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (allowedPhotoTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPG, PNG files are allowed for photos'));
};

export const uploadDocument = multer({
  storage,
  fileFilter: docFilter,
  limits: { fileSize: env.MAX_FILE_SIZE },
}).single('file');

export const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: photoFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('photo');