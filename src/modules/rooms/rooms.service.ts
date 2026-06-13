// src/modules/rooms/rooms.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, RoomStatus } from '@prisma/client';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { QueryRoomsDto } from './dto/query-rooms.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

const DASHBOARD_CACHE_KEY = 'dashboard:stats';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async findAll(query: QueryRoomsDto): Promise<PaginatedResponse<unknown>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'floor',
      order = 'asc',
      floor,
      type,
      status,
      q,
      minPrice,
      maxPrice,
      guestId,
    } = query;

    const where: Prisma.RoomWhereInput = {};

    if (floor !== undefined) where.floor = floor;
    if (type) where.type = type;
    if (status) where.status = status;
    if (guestId) where.guestId = guestId;

    if (q) {
      where.number = { contains: q, mode: 'insensitive' };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price = { ...where.price as object, gte: minPrice };
      if (maxPrice !== undefined) where.price = { ...where.price as object, lte: maxPrice };
    }

    const allowedSortFields = ['floor', 'number', 'price', 'status', 'type'];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'floor';

    const [total, data] = await Promise.all([
      this.prisma.room.count({ where }),
      this.prisma.room.findMany({
        where,
        include: { guest: true },
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

  async findOne(id: number) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        guest: true,
        reservations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { guest: true, services: { include: { service: true } } },
        },
      },
    });
    if (!room) throw new NotFoundException(`Chambre #${id} introuvable`);
    return room;
  }

  async create(dto: CreateRoomDto) {
    const existing = await this.prisma.room.findUnique({
      where: { number: dto.number },
    });
    if (existing) {
      throw new ConflictException(`La chambre ${dto.number} existe déjà`);
    }
    return this.prisma.room.create({
      data: {
        number: dto.number,
        floor: dto.floor,
        type: dto.type,
        status: dto.status ?? 'LIBRE',
        price: dto.price,
        currency: dto.currency ?? 'FCFA',
        guestId: dto.guestId,
      },
      include: { guest: true },
    });
  }

  async update(id: number, dto: UpdateRoomDto) {
    await this.findOne(id);
    return this.prisma.room.update({
      where: { id },
      data: {
        ...(dto.number !== undefined && { number: dto.number }),
        ...(dto.floor !== undefined && { floor: dto.floor }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.guestId !== undefined && { guestId: dto.guestId }),
      },
      include: { guest: true },
    });
  }

  async updateStatus(id: number, dto: UpdateRoomStatusDto) {
    await this.findOne(id);
    const room = await this.prisma.room.update({
      where: { id },
      data: { status: dto.status as RoomStatus },
      include: { guest: true },
    });
    try {
      await this.redis.del(DASHBOARD_CACHE_KEY);
    } catch {
      // Redis unavailable, cache invalidation skipped
    }
    return room;
  }

  async remove(id: number) {
    await this.findOne(id);

    const reservationCount = await this.prisma.reservation.count({
      where: { roomId: id },
    });
    if (reservationCount > 0) {
      throw new ConflictException(
        `Impossible de supprimer la chambre #${id} : elle possède ${reservationCount} réservation(s) associée(s).`,
      );
    }

    return this.prisma.room.delete({ where: { id } });
  }
}
