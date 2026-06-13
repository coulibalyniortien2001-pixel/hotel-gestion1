// src/modules/reservations/dto/create-reservation.dto.ts

import {
  IsString,
  IsInt,
  IsDateString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurrencyEnum } from '../../../common/enums/currency.enum';

export enum StayTypeEnum {
  NUIT = 'NUIT',
  PASSAGE = 'PASSAGE',
}

export class ReservationServiceItemDto {
  @ApiProperty({ example: 'uuid-service', description: 'UUID du service' })
  @IsString()
  serviceId: string;

  @ApiPropertyOptional({ example: 2, minimum: 1, default: 1, description: 'Quantité' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number = 1;
}

export class CreateReservationDto {
  @ApiProperty({ example: 'uuid-guest', description: 'UUID du client' })
  @IsString()
  guestId: string;

  @ApiProperty({ example: 1, minimum: 1, description: 'ID de la chambre' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId: number;

  @ApiProperty({ example: '2025-06-15T14:00:00.000Z', description: 'Date/heure de check-in (ISO 8601)' })
  @IsDateString()
  checkIn: string;

  @ApiPropertyOptional({
    example: '2025-06-20T12:00:00.000Z',
    description: 'Date/heure de check-out (ISO 8601). Calculé automatiquement si stayType=PASSAGE et durationHours fourni.',
  })
  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @ApiPropertyOptional({
    enum: StayTypeEnum,
    default: StayTypeEnum.NUIT,
    description: 'Type de séjour : NUIT (nuitée standard) ou PASSAGE (quelques heures)',
  })
  @IsOptional()
  @IsEnum(StayTypeEnum)
  stayType?: StayTypeEnum = StayTypeEnum.NUIT;

  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
    maximum: 23,
    description: 'Durée en heures (requis si stayType=PASSAGE et checkOut absent). Max 23h.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(23)
  durationHours?: number;

  @ApiPropertyOptional({ example: 600.0, minimum: 0, description: 'Montant total — calculé automatiquement si absent' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({ enum: CurrencyEnum, default: 'FCFA', description: 'Devise du montant (EUR, FCFA, USD)' })
  @IsOptional()
  @IsEnum(CurrencyEnum)
  currency?: CurrencyEnum;

  @ApiPropertyOptional({ type: [ReservationServiceItemDto], description: 'Services inclus dans la réservation' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReservationServiceItemDto)
  services?: ReservationServiceItemDto[];
}
