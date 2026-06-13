import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Injectable()
export class UploadService {
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', 'uploads');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Retourne l'URL publique d'un fichier uploadé
   * @param subDir  Sous-dossier : 'images' ou 'files'
   * @param filename Nom du fichier généré (uuid + extension)
   */
  getFileUrl(subDir: string, filename: string): string {
    return `/${this.uploadDir}/${subDir}/${filename}`;
  }

  /**
   * Retourne le chemin absolu d'un fichier sur le disque
   */
  getFilePath(subDir: string, filename: string): string {
    return join(process.cwd(), this.uploadDir, subDir, filename);
  }
}
