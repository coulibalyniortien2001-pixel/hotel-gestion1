// src/modules/depenses/depenses.controller.ts

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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DepensesService } from './depenses.service';
import { CreateDepenseDto } from './dto/create-depense.dto';
import { UpdateDepenseDto } from './dto/update-depense.dto';
import { QueryDepensesDto } from './dto/query-depenses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('depenses')
@Controller('depenses')
export class DepensesController {
  constructor(private readonly depensesService: DepensesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des dépenses', description: 'Paginée avec filtres (catégorie, plage de dates, recherche).' })
  @ApiResponse({ status: 200, description: 'Liste paginée des dépenses' })
  findAll(@Query() query: QueryDepensesDto) {
    return this.depensesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une dépense' })
  @ApiParam({ name: 'id', description: 'UUID de la dépense' })
  @ApiResponse({ status: 200, description: 'Dépense trouvée' })
  @ApiResponse({ status: 404, description: 'Dépense introuvable' })
  findOne(@Param('id') id: string) {
    return this.depensesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Enregistrer une dépense' })
  @ApiResponse({ status: 201, description: 'Dépense créée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  create(@Body() dto: CreateDepenseDto) {
    return this.depensesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Modifier une dépense' })
  @ApiParam({ name: 'id', description: 'UUID de la dépense' })
  @ApiResponse({ status: 200, description: 'Dépense mise à jour' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Dépense introuvable' })
  update(@Param('id') id: string, @Body() dto: UpdateDepenseDto) {
    return this.depensesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Supprimer une dépense', description: 'Réservé au rôle admin.' })
  @ApiParam({ name: 'id', description: 'UUID de la dépense' })
  @ApiResponse({ status: 204, description: 'Dépense supprimée' })
  @ApiResponse({ status: 403, description: 'Rôle admin requis' })
  remove(@Param('id') id: string) {
    return this.depensesService.remove(id);
  }
}
