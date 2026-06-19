// src/modules/guests/guests.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { QueryGuestsDto } from './dto/query-guests.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('guests')
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Liste des clients', description: 'Retourne une liste paginée avec filtres.' })
  @ApiResponse({ status: 200, description: 'Liste paginée des clients' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  findAll(@Query() query: QueryGuestsDto) {
    return this.guestsService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Détail d\'un client', description: 'Inclut les stats (totalStays, totalSpent, lastStay) et les réservations paginées.' })
  @ApiParam({ name: 'id', description: 'UUID du client' })
  @ApiQuery({ name: 'rPage', required: false, type: Number, description: 'Page des réservations (défaut: 1)' })
  @ApiQuery({ name: 'rLimit', required: false, type: Number, description: 'Taille de page des réservations (défaut: 5)' })
  @ApiResponse({ status: 200, description: 'Client trouvé avec stats et réservations' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Client introuvable' })
  findOne(
    @Param('id') id: string,
    @Query('rPage', new ParseIntPipe({ optional: true })) rPage?: number,
    @Query('rLimit', new ParseIntPipe({ optional: true })) rLimit?: number,
  ) {
    return this.guestsService.findOne(id, rPage ?? 1, rLimit ?? 5);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Créer un client' })
  @ApiResponse({ status: 201, description: 'Client créé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  create(@Body() dto: CreateGuestDto) {
    return this.guestsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Modifier un client' })
  @ApiParam({ name: 'id', description: 'UUID du client' })
  @ApiResponse({ status: 200, description: 'Client mis à jour' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Client introuvable' })
  update(@Param('id') id: string, @Body() dto: UpdateGuestDto) {
    return this.guestsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Supprimer un client', description: 'Réservé au rôle admin.' })
  @ApiParam({ name: 'id', description: 'UUID du client' })
  @ApiResponse({ status: 204, description: 'Client supprimé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle admin requis' })
  @ApiResponse({ status: 404, description: 'Client introuvable' })
  remove(@Param('id') id: string) {
    return this.guestsService.remove(id);
  }
}
