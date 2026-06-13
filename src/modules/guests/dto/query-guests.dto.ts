// src/modules/guests/dto/query-guests.dto.ts

import { IsOptional, IsString, IsBoolean, IsInt, Min, IsIn, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryGuestsDto extends PaginationDto {
  @ApiPropertyOptional({ default: 'lastName', enum: ['lastName', 'firstName', 'email', 'createdAt'] })
  @IsOptional()
  @IsIn(['lastName', 'firstName', 'email', 'createdAt'])
  override sortBy?: string = 'lastName';

  @ApiPropertyOptional({ default: 'asc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({ example: 'Dupont', description: 'Recherche textuelle (nom, prénom, email, téléphone)' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'true = clients avec chambre assignée, false = sans chambre' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasRoom?: boolean;

  @ApiPropertyOptional({ example: 5, description: 'Filtrer par ID de chambre' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId?: number;

  @ApiPropertyOptional({ example: '2025-01-01', description: 'Date de check-in minimale (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  checkInFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'Date de check-in maximale (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  checkInTo?: string;
}
