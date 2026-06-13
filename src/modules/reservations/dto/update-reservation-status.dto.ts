// src/modules/reservations/dto/update-reservation-status.dto.ts

import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReservationStatusEnum {
  CONFIRMEE = 'CONFIRMEE',
  CHECKIN = 'CHECKIN',
  CHECKOUT = 'CHECKOUT',
  NOSHOW = 'NOSHOW',
}

export class UpdateReservationStatusDto {
  @ApiProperty({ enum: ReservationStatusEnum, description: 'Nouveau statut de la réservation' })
  @IsEnum(ReservationStatusEnum)
  status: ReservationStatusEnum;
}
