// src/modules/dashboard/dashboard.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Statistiques temps réel',
    description:
      'KPIs hôtel: taux d\'occupation, revenus du mois, check-ins/checkouts du jour, ' +
      'chambres par statut, réservations récentes.\n\n' +
      'Les résultats sont mis en cache Redis 60 secondes.',
  })
  @ApiResponse({ status: 200, description: 'Statistiques du tableau de bord' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('alerts')
  @ApiOperation({
    summary: 'Alertes opérationnelles du jour',
    description:
      'Retourne les alertes actives : check-ins/outs imminents, chambres à nettoyer, chambres en travaux.',
  })
  @ApiResponse({ status: 200, description: 'Liste des alertes' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  getAlerts() {
    return this.dashboardService.getAlerts();
  }

  @Get('events')
  @ApiOperation({
    summary: 'Événements de la journée',
    description: 'Fil d\'activité : check-ins, check-outs et services consommés pour une date donnée.',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Date au format YYYY-MM-DD (défaut: aujourd\'hui)',
    example: '2026-06-03',
  })
  @ApiResponse({ status: 200, description: 'Liste des événements' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  getEvents(@Query('date') date?: string) {
    return this.dashboardService.getEvents(date);
  }

  @Get('revenue')
  @ApiOperation({
    summary: 'Revenus journaliers',
    description: 'Agrège les revenus (chambres + services) des réservations CHECKOUT sur N jours.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Nombre de jours (1–30, défaut: 7)',
    example: 7,
  })
  @ApiResponse({ status: 200, description: 'Revenus par jour' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  getRevenue(@Query('days') days?: string) {
    return this.dashboardService.getRevenue(days ? parseInt(days, 10) : 7);
  }
}
