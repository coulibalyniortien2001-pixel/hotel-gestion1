// src/modules/auth/dto/login.dto.ts

import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@hotel.com', description: 'Adresse email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin1234!', description: 'Mot de passe (min. 6 caractères)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
