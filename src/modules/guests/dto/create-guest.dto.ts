// src/modules/guests/dto/create-guest.dto.ts

import { IsString, IsEmail, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGuestDto {
  @ApiProperty({ example: 'Jean', description: 'Prénom du client' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Dupont', description: 'Nom de famille' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '+33612345678', description: 'Numéro de téléphone' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'jean.dupont@example.com', description: 'Adresse email (unique)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, description: 'ID de la chambre à assigner' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roomId?: number;
}
