import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendSmsDto {
  @ApiProperty({ example: '+33612345678', description: 'Numéro au format E.164' })
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Le numéro doit être au format E.164 (ex: +33612345678)' })
  to: string;

  @ApiProperty({ example: 'Votre code de vérification est : 123456' })
  @IsString()
  body: string;
}
