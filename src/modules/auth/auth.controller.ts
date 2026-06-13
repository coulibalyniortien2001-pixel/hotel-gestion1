// src/modules/auth/auth.controller.ts

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @SkipTransform()
  @ApiOperation({ summary: 'Connexion', description: 'Retourne un access_token JWT et un refresh_token.' })
  @ApiResponse({ status: 200, description: 'Authentification réussie — access_token + refresh_token' })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe invalide' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @SkipTransform()
  @ApiOperation({ summary: 'Renouveler le token', description: 'Échange un refresh_token valide contre un nouvel access_token.' })
  @ApiResponse({ status: 200, description: 'Nouveau access_token généré' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refresh_token);
  }
}
