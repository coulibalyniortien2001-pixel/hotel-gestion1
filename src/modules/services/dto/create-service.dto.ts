// src/modules/services/dto/create-service.dto.ts

import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurrencyEnum } from '../../../common/enums/currency.enum';

export class CreateServiceDto {
  @ApiProperty({ example: 'Petit-déjeuner', description: 'Nom du service (unique)' })
  @IsString()
  name: string;

  @ApiProperty({ example: 15.0, minimum: 0, description: 'Prix unitaire' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ enum: CurrencyEnum, default: 'FCFA', description: 'Devise du prix (EUR, FCFA, USD)' })
  @IsOptional()
  @IsEnum(CurrencyEnum)
  currency?: CurrencyEnum;
}
