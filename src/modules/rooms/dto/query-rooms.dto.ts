// src/modules/rooms/dto/query-rooms.dto.ts

import { IsOptional, IsInt, IsEnum, IsString, IsNumber, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { RoomTypeEnum, RoomStatusEnum } from './create-room.dto';

export class QueryRoomsDto extends PaginationDto {
  @ApiPropertyOptional({ default: 'floor', enum: ['floor', 'number', 'price', 'status', 'type'] })
  @IsOptional()
  @IsIn(['floor', 'number', 'price', 'status', 'type'])
  override sortBy?: string = 'floor';

  @ApiPropertyOptional({ default: 'asc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({ example: 2, minimum: 1, description: 'Filtrer par étage' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  floor?: number;

  @ApiPropertyOptional({ enum: RoomTypeEnum, description: 'Filtrer par type' })
  @IsOptional()
  @IsEnum(RoomTypeEnum)
  type?: RoomTypeEnum;

  @ApiPropertyOptional({ enum: RoomStatusEnum, description: 'Filtrer par statut' })
  @IsOptional()
  @IsEnum(RoomStatusEnum)
  status?: RoomStatusEnum;

  @ApiPropertyOptional({ example: '101', description: 'Recherche sur le numéro de chambre' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 50, minimum: 0, description: 'Prix minimum (€)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 300, minimum: 0, description: 'Prix maximum (€)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Filtrer par UUID du client occupant' })
  @IsOptional()
  @IsString()
  guestId?: string;
}
