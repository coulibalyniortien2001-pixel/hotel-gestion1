// src/modules/dashboard/dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    return this.computeStats();
  }

  private async computeStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const [
      totalRooms,
      occupiedRooms,
      libreRooms,
      travauxRooms,
      nettoyageRooms,
      checkInsToday,
      checkOutsToday,
      pendingReservations,
      occupiedRoomsList,
      weekReservations,
    ] = await Promise.all([
      this.prisma.room.count(),
      this.prisma.room.count({ where: { status: 'OCCUPEE' } }),
      this.prisma.room.count({ where: { status: 'LIBRE' } }),
      this.prisma.room.count({ where: { status: 'TRAVAUX' } }),
      this.prisma.room.count({ where: { status: 'NETTOYAGE' } }),
      this.prisma.reservation.count({
        where: {
          checkIn: { gte: todayStart, lte: todayEnd },
          status: 'CONFIRMEE',
        },
      }),
      this.prisma.reservation.count({
        where: {
          checkOut: { gte: todayStart, lte: todayEnd },
          status: 'CHECKOUT',
        },
      }),
      this.prisma.reservation.count({ where: { status: 'CONFIRMEE' } }),
      this.prisma.room.findMany({
        where: { status: 'OCCUPEE' },
        select: { price: true },
      }),
      this.prisma.reservation.findMany({
        where: {
          checkIn: { gte: weekStart },
          status: { in: ['CHECKIN', 'CHECKOUT'] },
        },
        select: { totalAmount: true },
      }),
    ]);

    const todayRevenue = occupiedRoomsList.reduce(
      (sum, r) => sum + Number(r.price),
      0,
    );

    const weekRevenue = weekReservations.reduce(
      (sum, r) => sum + Number(r.totalAmount),
      0,
    );

    const occupancyRate =
      totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    const roomsToClean = nettoyageRooms;

    return {
      occupancyRate,
      occupiedRooms,
      totalRooms,
      todayRevenue,
      weekRevenue,
      checkInsToday,
      checkOutsToday,
      roomsToClean,
      pendingReservations,
      roomsByStatus: {
        libre: libreRooms,
        occupee: occupiedRooms,
        travaux: travauxRooms,
        nettoyage: nettoyageRooms,
      },
      alerts: [
        {
          type: 'nettoyage',
          message: `${roomsToClean} chambre${roomsToClean !== 1 ? 's' : ''} à nettoyer`,
          count: roomsToClean,
        },
        {
          type: 'checkin',
          message: `${checkInsToday} arrivée${checkInsToday !== 1 ? 's' : ''} prévue${checkInsToday !== 1 ? 's' : ''}`,
          count: checkInsToday,
        },
        {
          type: 'reservation',
          message: `${pendingReservations} réservation${pendingReservations !== 1 ? 's' : ''} en attente`,
          count: pendingReservations,
        },
      ],
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // GET /dashboard/alerts
  // ──────────────────────────────────────────────────────────────────────
  async getAlerts() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [checkinsToday, checkoutsToday, nettoyageRooms, travauxRooms] =
      await Promise.all([
        this.prisma.reservation.findMany({
          where: {
            status: 'CONFIRMEE',
            checkIn: { gte: todayStart, lte: todayEnd },
          },
          include: { guest: true, room: true },
        }),
        this.prisma.reservation.findMany({
          where: {
            status: 'CHECKIN',
            checkOut: { gte: todayStart, lte: todayEnd },
          },
          include: { guest: true, room: true },
        }),
        this.prisma.room.findMany({ where: { status: 'NETTOYAGE' } }),
        this.prisma.room.findMany({ where: { status: 'TRAVAUX' } }),
      ]);

    const alerts: {
      id: string;
      type: string;
      priority: string;
      message: string;
      messageEn: string;
      resolved: boolean;
      createdAt: string;
      roomId: number | null;
      guestId: string | null;
      reservationId: string | null;
    }[] = [];

    for (const res of checkinsToday) {
      alerts.push({
        id: `checkin-${res.id}`,
        type: 'checkin',
        priority: 'high',
        message: `Arrivée prévue : ${res.guest.firstName} ${res.guest.lastName} — Chambre ${res.room.number}`,
        messageEn: `Expected check-in: ${res.guest.firstName} ${res.guest.lastName} — Room ${res.room.number}`,
        resolved: false,
        createdAt: new Date().toISOString(),
        roomId: res.roomId,
        guestId: res.guestId,
        reservationId: res.id,
      });
    }

    for (const res of checkoutsToday) {
      alerts.push({
        id: `checkout-${res.id}`,
        type: 'checkout',
        priority: 'high',
        message: `Départ prévu : ${res.guest.firstName} ${res.guest.lastName} — Chambre ${res.room.number}`,
        messageEn: `Expected check-out: ${res.guest.firstName} ${res.guest.lastName} — Room ${res.room.number}`,
        resolved: false,
        createdAt: new Date().toISOString(),
        roomId: res.roomId,
        guestId: res.guestId,
        reservationId: res.id,
      });
    }

    for (const room of nettoyageRooms) {
      alerts.push({
        id: `nettoyage-${room.id}`,
        type: 'nettoyage',
        priority: 'medium',
        message: `Chambre ${room.number} en attente de nettoyage`,
        messageEn: `Room ${room.number} waiting to be cleaned`,
        resolved: false,
        createdAt: new Date().toISOString(),
        roomId: room.id,
        guestId: null,
        reservationId: null,
      });
    }

    for (const room of travauxRooms) {
      alerts.push({
        id: `maintenance-${room.id}`,
        type: 'maintenance',
        priority: 'urgent',
        message: `Chambre ${room.number} en travaux`,
        messageEn: `Room ${room.number} under maintenance`,
        resolved: false,
        createdAt: new Date().toISOString(),
        roomId: room.id,
        guestId: null,
        reservationId: null,
      });
    }

    return { data: alerts };
  }

  // ──────────────────────────────────────────────────────────────────────
  // GET /dashboard/events?date=YYYY-MM-DD
  // ──────────────────────────────────────────────────────────────────────
  async getEvents(date?: string) {
    const target = date ? new Date(date) : new Date();
    const dayStart = new Date(target);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(target);
    dayEnd.setHours(23, 59, 59, 999);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        OR: [
          { checkIn: { gte: dayStart, lte: dayEnd } },
          { checkOut: { gte: dayStart, lte: dayEnd } },
        ],
      },
      include: {
        guest: true,
        room: true,
        services: { include: { service: true } },
      },
      orderBy: { checkIn: 'asc' },
    });

    const events: {
      id: string;
      type: string;
      title: string;
      titleEn: string;
      description: string;
      time: string;
      amount: number | null;
      guestId: string | null;
      roomId: number | null;
      reservationId: string | null;
    }[] = [];

    for (const res of reservations) {
      const guestName = `${res.guest.firstName} ${res.guest.lastName}`;

      const checkInDay = new Date(res.checkIn);
      checkInDay.setHours(0, 0, 0, 0);
      if (checkInDay.getTime() === dayStart.getTime()) {
        events.push({
          id: `checkin-${res.id}`,
          type: 'checkin',
          title: `Arrivée — ${guestName}`,
          titleEn: `Check-in — ${guestName}`,
          description: `Chambre ${res.room.number} · Départ le ${new Date(res.checkOut).toLocaleDateString('fr-FR')}`,
          time: res.checkIn.toISOString(),
          amount: Number(res.totalAmount),
          guestId: res.guestId,
          roomId: res.roomId,
          reservationId: res.id,
        });
      }

      const checkOutDay = new Date(res.checkOut);
      checkOutDay.setHours(0, 0, 0, 0);
      if (checkOutDay.getTime() === dayStart.getTime()) {
        events.push({
          id: `checkout-${res.id}`,
          type: 'checkout',
          title: `Départ — ${guestName}`,
          titleEn: `Check-out — ${guestName}`,
          description: `Chambre ${res.room.number} · Arrivée le ${new Date(res.checkIn).toLocaleDateString('fr-FR')}`,
          time: res.checkOut.toISOString(),
          amount: Number(res.totalAmount),
          guestId: res.guestId,
          roomId: res.roomId,
          reservationId: res.id,
        });
      }

      for (const rs of res.services) {
        events.push({
          id: `service-${res.id}-${rs.serviceId}`,
          type: 'service',
          title: `Service — ${rs.service.name}`,
          titleEn: `Service — ${rs.service.name}`,
          description: `${guestName} · Chambre ${res.room.number} · Qté ${rs.quantity}`,
          time: res.checkIn.toISOString(),
          amount: Number(rs.service.price) * rs.quantity,
          guestId: res.guestId,
          roomId: res.roomId,
          reservationId: res.id,
        });
      }
    }

    events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return { data: events };
  }

  // ──────────────────────────────────────────────────────────────────────
  // GET /dashboard/revenue-range?from=YYYY-MM-DD&to=YYYY-MM-DD
  // ──────────────────────────────────────────────────────────────────────
  async getRevenueRange(from: string, to: string) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const [reservations, depenses] = await Promise.all([
      this.prisma.reservation.findMany({
        where: {
          status: 'CHECKOUT',
          checkOut: { gte: fromDate, lte: toDate },
        },
        select: { totalAmount: true },
      }),
      this.prisma.depense.findMany({
        where: {
          date: { gte: fromDate, lte: toDate },
        },
        select: { montant: true },
      }),
    ]);

    const revenus = reservations.reduce((s, r) => s + Number(r.totalAmount), 0);
    const depensesTotal = depenses.reduce((s, d) => s + Number(d.montant), 0);

    return {
      revenus:           Math.round(revenus),
      depenses:          Math.round(depensesTotal),
      benefice:          Math.round(revenus - depensesTotal),
      reservationsCount: reservations.length,
      depensesCount:     depenses.length,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // GET /dashboard/rapport-mensuel?mois=YYYY-MM
  // ──────────────────────────────────────────────────────────────────────
  async getRapportMensuel(mois: string) {
    const [year, month] = mois.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const lastDay  = new Date(year, month, 0, 23, 59, 59, 999);

    const [reservations, depenses] = await Promise.all([
      this.prisma.reservation.findMany({
        where: {
          status: 'CHECKOUT',
          checkOut: { gte: firstDay, lte: lastDay },
        },
        select: { totalAmount: true, checkOut: true },
      }),
      this.prisma.depense.findMany({
        where: {
          date: { gte: firstDay, lte: lastDay },
        },
        select: { montant: true, date: true },
      }),
    ]);

    // Build per-day map
    const daysInMonth = lastDay.getDate();
    const parJour: { date: string; revenus: number; depenses: number; net: number }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayRevenus = reservations
        .filter((r) => new Date(r.checkOut).toISOString().slice(0, 10) === key)
        .reduce((s, r) => s + Number(r.totalAmount), 0);
      const dayDepenses = depenses
        .filter((dep) => new Date(dep.date).toISOString().slice(0, 10) === key)
        .reduce((s, dep) => s + Number(dep.montant), 0);
      parJour.push({ date: key, revenus: Math.round(dayRevenus), depenses: Math.round(dayDepenses), net: Math.round(dayRevenus - dayDepenses) });
    }

    const totalRevenus   = reservations.reduce((s, r)   => s + Number(r.totalAmount), 0);
    const totalDepenses  = depenses.reduce((s, d)        => s + Number(d.montant), 0);

    return {
      mois,
      totalRevenus:      Math.round(totalRevenus),
      totalDepenses:     Math.round(totalDepenses),
      beneficeNet:       Math.round(totalRevenus - totalDepenses),
      reservationsCount: reservations.length,
      depensesCount:     depenses.length,
      parJour,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // GET /dashboard/resume?from=YYYY-MM-DD&to=YYYY-MM-DD
  // ──────────────────────────────────────────────────────────────────────
  async getResumePeriode(from: string, to: string) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const [
      reservations,
      depenses,
      roomCounts,
      checkInsCount,
      checkOutsCount,
    ] = await Promise.all([
      this.prisma.reservation.findMany({
        where: {
          OR: [
            { checkIn:  { gte: fromDate, lte: toDate } },
            { checkOut: { gte: fromDate, lte: toDate } },
          ],
        },
        include: {
          guest: true,
          room: true,
          services: { include: { service: true } },
        },
        orderBy: { checkIn: 'asc' },
      }),
      this.prisma.depense.findMany({
        where: { date: { gte: fromDate, lte: toDate } },
        select: { montant: true },
      }),
      // Snapshot des statuts chambres au moment de la requête
      Promise.all([
        this.prisma.room.count({ where: { status: 'LIBRE' } }),
        this.prisma.room.count({ where: { status: 'OCCUPEE' } }),
        this.prisma.room.count({ where: { status: 'NETTOYAGE' } }),
        this.prisma.room.count({ where: { status: 'TRAVAUX' } }),
      ]),
      this.prisma.reservation.count({
        where: {
          checkIn: { gte: fromDate, lte: toDate },
          status: { in: ['CHECKIN', 'CHECKOUT'] },
        },
      }),
      this.prisma.reservation.count({
        where: {
          checkOut: { gte: fromDate, lte: toDate },
          status: 'CHECKOUT',
        },
      }),
    ]);

    const [libre, occupee, nettoyage, travaux] = roomCounts;

    // Compter par statut
    const parStatut: Record<string, number> = {
      CONFIRMEE: 0, CHECKIN: 0, CHECKOUT: 0, NOSHOW: 0,
    };
    let revenus = 0;
    for (const r of reservations) {
      parStatut[r.status] = (parStatut[r.status] ?? 0) + 1;
      if (r.status === 'CHECKOUT') revenus += Number(r.totalAmount);
    }

    // Construire les événements (même logique que getEvents mais sur plage)
    const events: {
      id: string; type: string; title: string; titleEn: string;
      description: string; time: string;
      amount: number | null; guestId: string | null;
      roomId: number | null; reservationId: string | null;
    }[] = [];

    for (const res of reservations) {
      const guestName = `${res.guest.firstName} ${res.guest.lastName}`;
      const checkInDay = new Date(res.checkIn);
      checkInDay.setHours(0, 0, 0, 0);
      if (checkInDay >= fromDate && checkInDay <= toDate) {
        events.push({
          id: `checkin-${res.id}`, type: 'checkin',
          title: `Arrivée — ${guestName}`, titleEn: `Check-in — ${guestName}`,
          description: `Chambre ${res.room.number} · Départ le ${new Date(res.checkOut).toLocaleDateString('fr-FR')}`,
          time: res.checkIn.toISOString(),
          amount: Number(res.totalAmount), guestId: res.guestId,
          roomId: res.roomId, reservationId: res.id,
        });
      }
      const checkOutDay = new Date(res.checkOut);
      checkOutDay.setHours(0, 0, 0, 0);
      if (checkOutDay >= fromDate && checkOutDay <= toDate) {
        events.push({
          id: `checkout-${res.id}`, type: 'checkout',
          title: `Départ — ${guestName}`, titleEn: `Check-out — ${guestName}`,
          description: `Chambre ${res.room.number} · Arrivée le ${new Date(res.checkIn).toLocaleDateString('fr-FR')}`,
          time: res.checkOut.toISOString(),
          amount: Number(res.totalAmount), guestId: res.guestId,
          roomId: res.roomId, reservationId: res.id,
        });
      }
      for (const rs of res.services) {
        events.push({
          id: `service-${res.id}-${rs.serviceId}`, type: 'service',
          title: `Service — ${rs.service.name}`, titleEn: `Service — ${rs.service.name}`,
          description: `${guestName} · Chambre ${res.room.number} · Qté ${rs.quantity}`,
          time: res.checkIn.toISOString(),
          amount: Number(rs.service.price) * rs.quantity,
          guestId: res.guestId, roomId: res.roomId, reservationId: res.id,
        });
      }
    }
    events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    const totalDepenses = depenses.reduce((s, d) => s + Number(d.montant), 0);

    return {
      period: { from, to },
      reservations: {
        count:     reservations.length,
        revenus:   Math.round(revenus),
        parStatut,
      },
      events,
      depenses: {
        count: depenses.length,
        total: Math.round(totalDepenses),
      },
      beneficeNet: Math.round(revenus - totalDepenses),
      chambres: { libre, occupee, nettoyage, travaux },
      checkIns:  checkInsCount,
      checkOuts: checkOutsCount,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // GET /dashboard/revenue?days=7
  // ──────────────────────────────────────────────────────────────────────
  async getRevenue(days = 7) {
    const cappedDays = Math.min(Math.max(1, days), 30);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (cappedDays - 1));
    startDate.setHours(0, 0, 0, 0);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: 'CHECKOUT',
        checkOut: { gte: startDate, lte: endDate },
      },
      include: {
        services: { include: { service: true } },
      },
    });

    // Build a map keyed by YYYY-MM-DD
    const map = new Map<string, { rooms: number; services: number }>();
    for (let i = 0; i < cappedDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { rooms: 0, services: 0 });
    }

    for (const res of reservations) {
      const key = new Date(res.checkOut).toISOString().slice(0, 10);
      if (!map.has(key)) continue;
      const entry = map.get(key)!;

      const servicesTotal = res.services.reduce(
        (sum, rs) => sum + Number(rs.service.price) * rs.quantity,
        0,
      );
      entry.rooms += Number(res.totalAmount) - servicesTotal;
      entry.services += servicesTotal;
    }

    const data = Array.from(map.entries()).map(([date, { rooms, services }]) => ({
      date,
      rooms: Math.round(rooms * 100) / 100,
      services: Math.round(services * 100) / 100,
      total: Math.round((rooms + services) * 100) / 100,
    }));

    return { data };
  }
}
