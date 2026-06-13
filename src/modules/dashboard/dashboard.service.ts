// src/modules/dashboard/dashboard.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

const CACHE_KEY = 'dashboard:stats';
const CACHE_TTL = 60; // seconds

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async getStats() {
    try {
      const cached = await this.redis.get(CACHE_KEY);
      if (cached) {
        this.logger.debug('Dashboard stats served from Redis cache');
        return JSON.parse(cached) as unknown;
      }
    } catch {
      this.logger.warn('Redis unavailable, skipping cache read');
    }

    const stats = await this.computeStats();

    try {
      await this.redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(stats));
    } catch {
      // Redis unavailable, serve without caching
    }

    return stats;
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
