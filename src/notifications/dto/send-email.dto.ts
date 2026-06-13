import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  to: string;

  @ApiProperty({ example: 'Bienvenue sur notre plateforme' })
  @IsString()
  @MinLength(1)
  subject: string;

  @ApiPropertyOptional({ example: '<h1>Bonjour !</h1>' })
  @IsString()
  @IsOptional()
  html?: string;

  @ApiPropertyOptional({ example: 'Bonjour !' })
  @IsString()
  @IsOptional()
  text?: string;
}
