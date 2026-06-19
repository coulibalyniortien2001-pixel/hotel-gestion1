// src/modules/reservations/reservations.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, ReservationStatus, RoomStatus, StayType } from '@prisma/client';
import { CreateReservationDto, StayTypeEnum } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { UpdateReservationStatusDto, ReservationStatusEnum } from './dto/update-reservation-status.dto';
import { QueryReservationsDto } from './dto/query-reservations.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

const INCLUDE_FULL = {
  guest: true,
  room: true,
  services: { include: { service: true } },
};

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryReservationsDto): Promise<PaginatedResponse<unknown>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'checkIn',
      order = 'asc',
      q,
      status,
      roomId,
      guestId,
      checkInFrom,
      checkInTo,
      checkOutFrom,
      checkOutTo,
      date,
      upcoming,
      active,
      isWalkIn,
      minAmount,
      maxAmount,
    } = query;

    const where: Prisma.ReservationWhereInput = {};

    if (status) where.status = status as ReservationStatus;

    if (roomId !== undefined) where.roomId = roomId;
    if (guestId) where.guestId = guestId;

    if (q) {
      where.OR = [
        { guest: { firstName: { contains: q, mode: 'insensitive' } } },
        { guest: { lastName: { contains: q, mode: 'insensitive' } } },
        { guest: { email: { contains: q, mode: 'insensitive' } } },
        { guest: { phone: { contains: q, mode: 'insensitive' } } },
        { room: { number: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (checkInFrom || checkInTo) {
      where.checkIn = {
        ...(checkInFrom && { gte: new Date(checkInFrom) }),
        ...(checkInTo && { lte: new Date(checkInTo) }),
      };
    }

    if (checkOutFrom || checkOutTo) {
      where.checkOut = {
        ...(checkOutFrom && { gte: new Date(checkOutFrom) }),
        ...(checkOutTo && { lte: new Date(checkOutTo) }),
      };
    }

    if (date === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      where.OR = [
        { checkIn: { gte: todayStart, lte: todayEnd } },
        { checkOut: { gte: todayStart, lte: todayEnd } },
      ];
    }

    if (upcoming === true) {
      where.checkIn = { gt: new Date() };
    }

    if (active === true) {
      where.status = { in: ['CONFIRMEE', 'CHECKIN'] };
    }

    if (isWalkIn !== undefined) {
      where.isWalkIn = isWalkIn;
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.totalAmount = {
        ...(minAmount !== undefined && { gte: minAmount }),
        ...(maxAmount !== undefined && { lte: maxAmount }),
      };
    }

    const allowedSortFields = ['checkIn', 'checkOut', 'createdAt', 'totalAmount', 'status'];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'checkIn';

    const [total, data] = await Promise.all([
      this.prisma.reservation.count({ where }),
      this.prisma.reservation.findMany({
        where,
        include: INCLUDE_FULL,
        orderBy: { [orderByField]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: INCLUDE_FULL,
    });
    if (!reservation) throw new NotFoundException(`Réservation ${id} introuvable`);
    return reservation;
  }

  async validateNoOverlap(
    roomId: number,
    checkIn: Date,
    checkOut: Date,
    excludeId?: string,
  ) {
    const overlap = await this.prisma.reservation.findFirst({
      where: {
        roomId,
        ...(excludeId && { id: { not: excludeId } }),
        status: { in: ['CONFIRMEE', 'CHECKIN'] },
        AND: [{ checkIn: { lt: checkOut } }, { checkOut: { gt: checkIn } }],
      },
    });
    if (overlap) {
      throw new ConflictException('Chambre non disponible sur ces dates');
    }
  }

  async create(dto: CreateReservationDto) {
    const checkIn = new Date(dto.checkIn);
    const stayType: StayType = (dto.stayType as StayType) ?? 'NUIT';

    let checkOut: Date;
    let durationHours: number | undefined;

    if (stayType === 'PASSAGE') {
      if (dto.checkOut) {
        checkOut = new Date(dto.checkOut);
        durationHours = Math.round(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60),
        );
      } else if (dto.durationHours) {
        durationHours = dto.durationHours;
        checkOut = new Date(checkIn.getTime() + durationHours * 60 * 60 * 1000);
      } else {
        throw new BadRequestException(
          'Pour un séjour PASSAGE, fournissez checkOut ou durationHours.',
        );
      }
    } else {
      if (!dto.checkOut) {
        throw new BadRequestException('checkOut est requis pour un séjour NUIT.');
      }
      checkOut = new Date(dto.checkOut);
    }

    if (checkOut <= checkIn) {
      throw new BadRequestException('La date de check-out doit être après le check-in');
    }

    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException(`Chambre #${dto.roomId} introuvable`);

    if (room.status !== 'LIBRE' && room.status !== 'NETTOYAGE') {
      throw new UnprocessableEntityException(
        `La chambre doit être LIBRE ou NETTOYAGE (actuel: ${room.status})`,
      );
    }

    await this.validateNoOverlap(dto.roomId, checkIn, checkOut);

    let totalAmount = dto.totalAmount;
    if (totalAmount === undefined) {
      if (stayType === 'PASSAGE') {
        const hours = durationHours ?? 1;
        totalAmount = Math.round((Number(room.price) * (hours / 24)) * 100) / 100;
      } else {
        const nights = Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        );
        totalAmount = Math.round(Number(room.price) * nights * 100) / 100;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.create({
        data: {
          guestId: dto.guestId,
          roomId: dto.roomId,
          checkIn,
          checkOut,
          stayType,
          durationHours: durationHours ?? null,
          totalAmount,
          currency: dto.currency ?? 'FCFA',
          isWalkIn: dto.isWalkIn ?? false,
        },
      });

      if (dto.services?.length) {
        await tx.reservationService.createMany({
          data: dto.services.map((s) => ({
            reservationId: reservation.id,
            serviceId: s.serviceId,
            quantity: s.quantity ?? 1,
          })),
        });
      }

      return tx.reservation.findUniqueOrThrow({
        where: { id: reservation.id },
        include: INCLUDE_FULL,
      });
    });
  }

  async update(id: string, dto: UpdateReservationDto) {
    const existing = await this.findOne(id);

    const checkIn = dto.checkIn ? new Date(dto.checkIn) : existing.checkIn;
    const stayType: StayType = (dto.stayType as StayType) ?? existing.stayType;

    let checkOut: Date;
    let durationHours: number | undefined | null = existing.durationHours;

    if (stayType === 'PASSAGE') {
      if (dto.checkOut) {
        checkOut = new Date(dto.checkOut);
        durationHours = Math.round(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60),
        );
      } else if (dto.durationHours) {
        durationHours = dto.durationHours;
        checkOut = new Date(checkIn.getTime() + durationHours * 60 * 60 * 1000);
      } else {
        checkOut = existing.checkOut;
      }
    } else {
      checkOut = dto.checkOut ? new Date(dto.checkOut) : existing.checkOut;
      durationHours = null;
    }

    if (checkOut <= checkIn) {
      throw new BadRequestException('La date de check-out doit être après le check-in');
    }

    const roomId = dto.roomId ?? existing.roomId;
    await this.validateNoOverlap(roomId, checkIn, checkOut, id);

    return this.prisma.reservation.update({
      where: { id },
      data: {
        ...(dto.guestId !== undefined && { guestId: dto.guestId }),
        ...(dto.roomId !== undefined && { roomId: dto.roomId }),
        ...(dto.checkIn !== undefined && { checkIn }),
        checkOut,
        stayType,
        durationHours,
        ...(dto.totalAmount !== undefined && { totalAmount: dto.totalAmount }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
      },
      include: INCLUDE_FULL,
    });
  }

  async updateStatus(id: string, dto: UpdateReservationStatusDto) {
    const reservation = await this.findOne(id);

    let roomUpdate: { status: RoomStatus; guestId: string | null } | undefined;

    switch (dto.status) {
      case ReservationStatusEnum.CHECKIN:
        roomUpdate = { status: 'OCCUPEE', guestId: reservation.guestId };
        break;
      case ReservationStatusEnum.CHECKOUT:
        roomUpdate = { status: 'LIBRE', guestId: null };
        break;
      case ReservationStatusEnum.NOSHOW:
        roomUpdate = { status: 'LIBRE', guestId: null };
        break;
      case ReservationStatusEnum.CONFIRMEE:
        roomUpdate = { status: 'LIBRE', guestId: null };
        break;
      case ReservationStatusEnum.ANNULEE:
        roomUpdate = { status: 'LIBRE', guestId: null };
        break;
    }

    const updatedReservation = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id },
        data: { status: dto.status as ReservationStatus },
        include: INCLUDE_FULL,
      });
      if (roomUpdate) {
        await tx.room.update({
          where: { id: reservation.roomId },
          data: roomUpdate,
        });
      }
      return updated;
    });

    return updatedReservation;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.reservation.delete({ where: { id } });
  }
}
