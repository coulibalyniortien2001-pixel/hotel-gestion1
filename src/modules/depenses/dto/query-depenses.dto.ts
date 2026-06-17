// src/modules/depenses/dto/query-depenses.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsISO8601,
  IsString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DepenseCategorie } from '@prisma/client';

export class QueryDepensesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({ enum: ['date', 'montant', 'libelle', 'categorie', 'createdAt'] })
  @IsOptional()
  @IsString()
  sortBy?: 'date' | 'montant' | 'libelle' | 'categorie' | 'createdAt' = 'date';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ enum: DepenseCategorie })
  @IsOptional()
  @IsEnum(DepenseCategorie)
  categorie?: DepenseCategorie;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ description: 'Recherche dans libelle et note' })
  @IsOptional()
  @IsString()
  q?: string;
}
