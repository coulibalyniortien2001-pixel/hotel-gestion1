// src/modules/depenses/dto/create-depense.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsISO8601,
  MinLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DepenseCategorie } from '@prisma/client';

export { DepenseCategorie };

export class CreateDepenseDto {
  @ApiProperty({ example: 'Achat de draps et serviettes' })
  @IsString()
  @MinLength(2)
  libelle: string;

  @ApiProperty({ example: 45000, description: 'Montant en FCFA' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  montant: number;

  @ApiPropertyOptional({ enum: DepenseCategorie, default: DepenseCategorie.AUTRE })
  @IsOptional()
  @IsEnum(DepenseCategorie)
  categorie?: DepenseCategorie;

  @ApiPropertyOptional({ example: '2026-06-17T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({ example: 'Fournisseur : Marché Central Abidjan' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: 'manager@hotel.com' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}
