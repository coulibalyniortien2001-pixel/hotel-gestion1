// src/modules/reports/reports.controller.ts

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('receipt/:reservationId')
  @ApiOperation({ summary: 'Reçu de paiement', description: 'Génère le récapitulatif de paiement pour une réservation.' })
  @ApiParam({ name: 'reservationId', description: 'UUID de la réservation' })
  @ApiResponse({ status: 200, description: 'Reçu généré' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Réservation introuvable' })
  getReceipt(@Param('reservationId') reservationId: string) {
    return this.reportsService.getReceipt(reservationId);
  }

  @Get('invoice/:reservationId')
  @ApiOperation({
    summary: 'Facture',
    description:
      'Génère la facture officielle avec TVA 18\u202f%.\n' +
      'Référence: INV-{année}-{id court}.',
  })
  @ApiParam({ name: 'reservationId', description: 'UUID de la réservation' })
  @ApiResponse({ status: 200, description: 'Facture générée' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Réservation introuvable' })
  getInvoice(@Param('reservationId') reservationId: string) {
    return this.reportsService.getInvoice(reservationId);
  }

  @Get('stay/:reservationId')
  @ApiOperation({
    summary: 'Rapport de séjour',
    description:
      'Rapport complet du séjour: timeline des évènements, services consommés, durée, montant.',
  })
  @ApiParam({ name: 'reservationId', description: 'UUID de la réservation' })
  @ApiResponse({ status: 200, description: 'Rapport de séjour généré' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 404, description: 'Réservation introuvable' })
  getStayReport(@Param('reservationId') reservationId: string) {
    return this.reportsService.getStayReport(reservationId);
  }
}
