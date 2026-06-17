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
  @ApiQuery({ name: 'days', required: false, description: 'Nombre de jours (1–30, défaut: 7)', example: 7 })
  @ApiResponse({ status: 200, description: 'Revenus par jour' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  getRevenue(@Query('days') days?: string) {
    return this.dashboardService.getRevenue(days ? parseInt(days, 10) : 7);
  }

  @Get('revenue-range')
  @ApiOperation({
    summary: 'Revenus & dépenses sur une plage de dates',
    description: 'Retourne les revenus, dépenses et bénéfice net entre deux dates.',
  })
  @ApiQuery({ name: 'from', required: true,  description: 'Date de début (YYYY-MM-DD)', example: '2026-06-01' })
  @ApiQuery({ name: 'to',   required: true,  description: 'Date de fin (YYYY-MM-DD)',   example: '2026-06-30' })
  @ApiResponse({ status: 200, description: 'Synthèse financière sur la plage' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  getRevenueRange(@Query('from') from: string, @Query('to') to: string) {
    const today = new Date().toISOString().slice(0, 10);
    return this.dashboardService.getRevenueRange(from ?? today, to ?? today);
  }

  @Get('resume')
  @ApiOperation({
    summary: 'Résumé des activités sur une plage de dates',
    description: 'Synthèse complète : réservations, événements, dépenses, bénéfice, état des chambres.',
  })
  @ApiQuery({ name: 'from', required: false, description: 'Date de début (YYYY-MM-DD, défaut: aujourd\'hui)', example: '2026-06-17' })
  @ApiQuery({ name: 'to',   required: false, description: 'Date de fin (YYYY-MM-DD, défaut: aujourd\'hui)',   example: '2026-06-17' })
  @ApiResponse({ status: 200, description: 'Résumé de la période' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  getResume(@Query('from') from?: string, @Query('to') to?: string) {
    const today = new Date().toISOString().slice(0, 10);
    return this.dashboardService.getResumePeriode(from ?? today, to ?? today);
  }

  @Get('rapport-mensuel')
  @ApiOperation({
    summary: 'Rapport financier mensuel',
    description: 'Détail jour par jour des revenus, dépenses et bénéfice net pour un mois donné.',
  })
  @ApiQuery({ name: 'mois', required: false, description: 'Mois au format YYYY-MM (défaut: mois courant)', example: '2026-06' })
  @ApiResponse({ status: 200, description: 'Rapport mensuel' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  getRapportMensuel(@Query('mois') mois?: string) {
    const defaultMois = new Date().toISOString().slice(0, 7);
    return this.dashboardService.getRapportMensuel(mois ?? defaultMois);
  }
}
