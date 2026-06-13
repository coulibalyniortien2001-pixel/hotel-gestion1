// src/modules/rooms/dto/update-room-status.dto.ts

import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoomStatusEnum } from './create-room.dto';

export class UpdateRoomStatusDto {
  @ApiProperty({ enum: RoomStatusEnum, description: 'Nouveau statut de la chambre' })
  @IsEnum(RoomStatusEnum)
  status: RoomStatusEnum;
}
