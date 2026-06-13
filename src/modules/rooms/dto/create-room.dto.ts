// src/modules/rooms/dto/create-room.dto.ts

import { IsString, IsInt, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurrencyEnum } from '../../../common/enums/currency.enum';

export enum RoomTypeEnum {
  SINGLE = 'SINGLE',
  DOUBLE = 'DOUBLE',
  SUITE = 'SUITE',
}

export enum RoomStatusEnum {
  LIBRE = 'LIBRE',
  OCCUPEE = 'OCCUPEE',
  TRAVAUX = 'TRAVAUX',
  NETTOYAGE = 'NETTOYAGE',
}

export class CreateRoomDto {
  @ApiProperty({ example: '101', description: 'Numéro de chambre (unique)' })
  @IsString()
  number: string;

  @ApiProperty({ example: 1, minimum: 1, description: 'Étage' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  floor: number;

  @ApiProperty({ enum: RoomTypeEnum, description: 'Type de chambre' })
  @IsEnum(RoomTypeEnum)
  type: RoomTypeEnum;

  @ApiPropertyOptional({ enum: RoomStatusEnum, default: 'LIBRE', description: 'Statut initial (défaut: LIBRE)' })
  @IsOptional()
  @IsEnum(RoomStatusEnum)
  status?: RoomStatusEnum;

  @ApiProperty({ example: 120.0, minimum: 0, description: 'Prix par nuit (€)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'uuid', description: 'UUID du client occupant actuellement la chambre' })
  @IsOptional()
  @IsString()
  guestId?: string;

  @ApiPropertyOptional({ enum: CurrencyEnum, default: 'FCFA', description: 'Devise du prix (EUR, FCFA, USD)' })
  @IsOptional()
  @IsEnum(CurrencyEnum)
  currency?: CurrencyEnum;
}
