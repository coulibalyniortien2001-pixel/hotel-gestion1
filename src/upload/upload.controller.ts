import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { imageInterceptorOptions, fileInterceptorOptions } from './multer.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload d'une seule image (JPEG, PNG, WebP, GIF)
   * Taille max définie par UPLOAD_MAX_SIZE_MB dans .env (défaut : 10 Mo)
   */
  @Post('image')
  @ApiOperation({ summary: 'Upload une image (JPEG, PNG, WebP, GIF)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', imageInterceptorOptions))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return {
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      url: this.uploadService.getFileUrl('images', file.filename),
    };
  }

  /**
   * Upload d'un fichier générique (PDF, TXT, images)
   * Taille max définie par UPLOAD_MAX_SIZE_MB dans .env (défaut : 10 Mo)
   */
  @Post('file')
  @ApiOperation({ summary: 'Upload un fichier (PDF, TXT, images)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', fileInterceptorOptions))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      url: this.uploadService.getFileUrl('files', file.filename),
    };
  }

  /**
   * Upload de plusieurs fichiers en une seule requête (max 10)
   */
  @Post('files')
  @ApiOperation({ summary: 'Upload plusieurs fichiers (max 10)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10, fileInterceptorOptions))
  uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
    return files.map((file) => ({
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      url: this.uploadService.getFileUrl('files', file.filename),
    }));
  }
}

