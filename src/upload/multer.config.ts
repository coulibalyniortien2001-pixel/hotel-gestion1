import { Injectable, mixin, UnsupportedMediaTypeException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_IMAGE_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_FILE_MIMETYPES = [
  ...ALLOWED_IMAGE_MIMETYPES,
  'application/pdf',
  'text/plain',
];

function buildStorage(subDir: string) {
  const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
  const dest = join(uploadDir, subDir);
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

  return diskStorage({
    destination: dest,
    filename: (_req, file, cb) => {
      cb(null, `${uuidv4()}${extname(file.originalname).toLowerCase()}`);
    },
  });
}

function maxBytes(): number {
  return (parseInt(process.env.UPLOAD_MAX_SIZE_MB ?? '10', 10) || 10) * 1024 * 1024;
}

export const imageInterceptorOptions: MulterOptions = {
  storage: buildStorage('images'),
  limits: { fileSize: maxBytes() },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {
      return cb(
        new UnsupportedMediaTypeException(
          `Types acceptés : ${ALLOWED_IMAGE_MIMETYPES.join(', ')}`,
        ),
        false,
      );
    }
    cb(null, true);
  },
};

export const fileInterceptorOptions: MulterOptions = {
  storage: buildStorage('files'),
  limits: { fileSize: maxBytes() },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_FILE_MIMETYPES.includes(file.mimetype)) {
      return cb(
        new UnsupportedMediaTypeException(
          `Types acceptés : ${ALLOWED_FILE_MIMETYPES.join(', ')}`,
        ),
        false,
      );
    }
    cb(null, true);
  },
};
