// src/modules/reservations/dto/query-reservations.dto.ts

import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  IsIn,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ReservationStatusEnum } from './update-reservation-status.dto';

export class QueryReservationsDto extends PaginationDto {
  @ApiPropertyOptional({ default: 'checkIn', enum: ['checkIn', 'checkOut', 'createdAt', 'totalAmount', 'status'] })
  @IsOptional()
  @IsIn(['checkIn', 'checkOut', 'createdAt', 'totalAmount', 'status'])
  override sortBy?: string = 'checkIn';

  @ApiPropertyOptional({ default: 'asc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({ description: 'Recherche par UUID client ou chambre' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ReservationStatusEnum, description: 'Filtrer par statut' })
  @IsOptional()
  @IsEnum(ReservationStatusEnum)
  status?: ReservationStatusEnum;

  @ApiPropertyOptional({ example: 3, description: 'Filtrer par ID de chambre' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId?: number;

  @ApiPropertyOptional({ description: 'Filtrer par UUID du client' })
  @IsOptional()
  @IsString()
  guestId?: string;

  @ApiPropertyOptional({ example: '2025-06-01', description: 'Check-in après cette date' })
  @IsOptional()
  @IsDateString()
  checkInFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'Check-in avant cette date' })
  @IsOptional()
  @IsDateString()
  checkInTo?: string;

  @ApiPropertyOptional({ example: '2025-06-01', description: 'Check-out après cette date' })
  @IsOptional()
  @IsDateString()
  checkOutFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'Check-out avant cette date' })
  @IsOptional()
  @IsDateString()
  checkOutTo?: string;

  @ApiPropertyOptional({ enum: ['today'], description: 'Filtre raccourci: séjours du jour' })
  @IsOptional()
  @IsIn(['today'])
  date?: 'today';

  @ApiPropertyOptional({ description: 'true = réservations futures (check-in > maintenant)' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  upcoming?: boolean;

  @ApiPropertyOptional({ description: 'true = réservations en cours (CHECKIN)' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'true = accueils directs uniquement (walk-in)' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isWalkIn?: boolean;

  @ApiPropertyOptional({ example: 100, minimum: 0, description: 'Montant minimum (€)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ example: 1000, minimum: 0, description: 'Montant maximum (€)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;
}
