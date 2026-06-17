// src/modules/guests/guests.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { QueryGuestsDto } from './dto/query-guests.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryGuestsDto): Promise<PaginatedResponse<unknown>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'lastName',
      order = 'asc',
      q,
      hasRoom,
      roomId,
      checkInFrom,
      checkInTo,
    } = query;

    const where: Prisma.GuestWhereInput = {};

    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (hasRoom === true) {
      where.room = { isNot: null };
    } else if (hasRoom === false) {
      where.room = { is: null };
    }

    if (roomId !== undefined) {
      where.room = { id: roomId };
    }

    if (checkInFrom || checkInTo) {
      where.reservations = {
        some: {
          checkIn: {
            ...(checkInFrom && { gte: new Date(checkInFrom) }),
            ...(checkInTo && { lte: new Date(checkInTo) }),
          },
        },
      };
    }

    const allowedSortFields = ['lastName', 'firstName', 'email', 'createdAt'];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'lastName';

    const [total, data] = await Promise.all([
      this.prisma.guest.count({ where }),
      this.prisma.guest.findMany({
        where,
        include: { room: true },
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

  async findOne(
    id: string,
    rPage = 1,
    rLimit = 5,
  ) {
    const guest = await this.prisma.guest.findUnique({
      where: { id },
      include: {
        room: true,
        reservations: {
          orderBy: { checkIn: 'desc' },
          skip: (rPage - 1) * rLimit,
          take: rLimit,
          include: {
            room: true,
            services: { include: { service: true } },
          },
        },
      },
    });
    if (!guest) throw new NotFoundException(`Client ${id} introuvable`);

    const stats = await this.prisma.reservation.aggregate({
      where: { guestId: id },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    const lastReservation = await this.prisma.reservation.findFirst({
      where: { guestId: id },
      orderBy: { checkOut: 'desc' },
    });

    return {
      ...guest,
      stats: {
        totalStays: stats._count.id,
        totalSpent: stats._sum.totalAmount ?? 0,
        lastStay: lastReservation?.checkOut ?? null,
      },
    };
  }

  async create(dto: CreateGuestDto) {
    const providedEmail = dto.email && String(dto.email).trim();
    const email = providedEmail || `noemail-${Date.now()}-${Math.random().toString(36).slice(2)}@noemail.pms`;

    if (providedEmail) {
      const existing = await this.prisma.guest.findUnique({ where: { email } });
      if (existing) {
        throw new ConflictException(`L'email ${email} est déjà utilisé`);
      }
    }

    return this.prisma.guest.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email,
        ...(dto.roomId !== undefined && {
          room: { connect: { id: dto.roomId } },
        }),
      },
      include: { room: true },
    });
  }

  async update(id: string, dto: UpdateGuestDto) {
    await this.findOne(id);
    return this.prisma.guest.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.roomId !== undefined && {
          room: { connect: { id: dto.roomId } },
        }),
      },
      include: { room: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Unlink room if the guest is currently checked in
      await tx.room.updateMany({
        where: { guestId: id },
        data: { guestId: null },
      });

      // Delete reservations (ReservationService rows cascade automatically)
      await tx.reservation.deleteMany({ where: { guestId: id } });

      return tx.guest.delete({ where: { id } });
    });
  }
}
