// src/modules/auth/dto/refresh-token.dto.ts

import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Token de rafraîchissement JWT obtenu lors du login' })
  @IsString()
  refresh_token: string;
}
