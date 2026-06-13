// src/modules/services/dto/query-services.dto.ts

import { IsOptional, IsString, IsNumber, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryServicesDto extends PaginationDto {
  @ApiPropertyOptional({ default: 'name', enum: ['name', 'price'] })
  @IsOptional()
  @IsIn(['name', 'price'])
  override sortBy?: string = 'name';

  @ApiPropertyOptional({ default: 'asc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({ example: 'petit', description: 'Recherche sur le nom du service' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 5, minimum: 0, description: 'Prix minimum (€)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 100, minimum: 0, description: 'Prix maximum (€)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}
