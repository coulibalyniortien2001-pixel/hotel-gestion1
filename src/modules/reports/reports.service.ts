// src/modules/reports/reports.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const INCLUDE_FULL = {
  guest: true,
  room: true,
  services: { include: { service: true } },
};

const VAT_RATE = 0.18;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getReservation(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: INCLUDE_FULL,
    });
    if (!reservation) throw new NotFoundException(`Réservation ${id} introuvable`);
    return reservation;
  }

  private computeNights(checkIn: Date, checkOut: Date): number {
    const diff = checkOut.getTime() - checkIn.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  private buildLineItems(reservation: Awaited<ReturnType<typeof this.getReservation>>) {
    const nightsCount = this.computeNights(reservation.checkIn, reservation.checkOut);
    const roomTotal = Number(reservation.room.price) * nightsCount;

    const serviceItems = reservation.services.map((rs) => ({
      name: rs.service.name,
      price: Number(rs.service.price),
      quantity: rs.quantity,
      subtotal: Number(rs.service.price) * rs.quantity,
    }));

    const servicesTotal = serviceItems.reduce((s, i) => s + i.subtotal, 0);
    const grandTotal = roomTotal + servicesTotal;

    return { nightsCount, roomTotal, serviceItems, servicesTotal, grandTotal };
  }

  async getReceipt(reservationId: string) {
    const reservation = await this.getReservation(reservationId);
    const { nightsCount, roomTotal, serviceItems, servicesTotal, grandTotal } =
      this.buildLineItems(reservation);

    return {
      reservation: {
        id: reservation.id,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        totalAmount: Number(reservation.totalAmount),
        status: reservation.status,
      },
      guest: {
        firstName: reservation.guest.firstName,
        lastName: reservation.guest.lastName,
        email: reservation.guest.email,
        phone: reservation.guest.phone,
      },
      room: {
        number: reservation.room.number,
        type: reservation.room.type,
        floor: reservation.room.floor,
        price: Number(reservation.room.price),
      },
      services: serviceItems,
      nightsCount,
      roomTotal,
      servicesTotal,
      grandTotal,
      issuedAt: new Date(),
    };
  }

  async getInvoice(reservationId: string) {
    const receipt = await this.getReceipt(reservationId);
    const amountHT = receipt.grandTotal / (1 + VAT_RATE);
    const vatAmount = receipt.grandTotal - amountHT;

    const year = new Date().getFullYear();
    const shortId = reservationId.slice(0, 8).toUpperCase();
    const invoiceNumber = `INV-${year}-${shortId}`;

    const reservation = await this.getReservation(reservationId);
    const { nightsCount, roomTotal } = this.buildLineItems(reservation);

    const lineItems = [
      {
        description: `Chambre ${reservation.room.number} — ${nightsCount} nuit(s)`,
        quantite: nightsCount,
        prixUnitaireHT: Number(reservation.room.price) / (1 + VAT_RATE),
        tauxTVA: VAT_RATE,
        montantTTC: roomTotal,
      },
      ...reservation.services.map((rs) => ({
        description: rs.service.name,
        quantite: rs.quantity,
        prixUnitaireHT: Number(rs.service.price) / (1 + VAT_RATE),
        tauxTVA: VAT_RATE,
        montantTTC: Number(rs.service.price) * rs.quantity,
      })),
    ];

    return {
      invoiceNumber,
      ...receipt,
      hotelInfo: {
        name: 'Grand Hôtel PMS',
        address: '12 Avenue des Palaces, 75001 Paris',
        siret: '123 456 789 00012',
        rib: {
          bank: 'BNP Paribas',
          iban: 'FR76 3000 4000 0100 0000 0000 000',
          bic: 'BNPAFRPP',
        },
      },
      vatRate: VAT_RATE,
      amountHT: Math.round(amountHT * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      amountTTC: receipt.grandTotal,
      lineItems,
    };
  }

  async getStayReport(reservationId: string) {
    const receipt = await this.getReceipt(reservationId);
    const reservation = await this.getReservation(reservationId);

    const timeline: { date: Date; event: string; detail: string }[] = [];

    timeline.push({
      date: reservation.checkIn,
      event: 'check-in',
      detail: `Arrivée dans la chambre ${reservation.room.number}`,
    });

    for (const rs of reservation.services) {
      timeline.push({
        date: reservation.checkIn,
        event: 'service',
        detail: `${rs.service.name} x${rs.quantity} — ${(Number(rs.service.price) * rs.quantity).toFixed(2)} €`,
      });
    }

    timeline.push({
      date: reservation.checkOut,
      event: 'check-out',
      detail: `Départ de la chambre ${reservation.room.number}`,
    });

    const payments = [
      {
        method: 'card',
        amount: receipt.grandTotal,
        date: reservation.checkOut,
      },
    ];

    const balance = Number(reservation.totalAmount) - receipt.grandTotal;

    return {
      ...receipt,
      timeline,
      payments,
      balance,
    };
  }
}
