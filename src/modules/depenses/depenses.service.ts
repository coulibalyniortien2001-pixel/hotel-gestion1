// src/modules/depenses/depenses.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, DepenseCategorie } from '@prisma/client';
import { CreateDepenseDto } from './dto/create-depense.dto';
import { UpdateDepenseDto } from './dto/update-depense.dto';
import { QueryDepensesDto } from './dto/query-depenses.dto';

@Injectable()
export class DepensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryDepensesDto) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'date',
      order = 'desc',
      categorie,
      from,
      to,
      q,
    } = query;

    const where: Prisma.DepenseWhereInput = {};

    if (categorie) where.categorie = categorie as DepenseCategorie;

    if (from || to) {
      where.date = {
        ...(from && { gte: new Date(from) }),
        ...(to   && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
      };
    }

    if (q) {
      where.OR = [
        { libelle: { contains: q, mode: 'insensitive' } },
        { note:    { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.depense.count({ where }),
      this.prisma.depense.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const depense = await this.prisma.depense.findUnique({ where: { id } });
    if (!depense) throw new NotFoundException(`Dépense ${id} introuvable`);
    return depense;
  }

  async create(dto: CreateDepenseDto) {
    return this.prisma.depense.create({
      data: {
        libelle:   dto.libelle,
        montant:   dto.montant,
        categorie: dto.categorie ?? 'AUTRE',
        date:      dto.date ? new Date(dto.date) : new Date(),
        note:      dto.note,
        createdBy: dto.createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateDepenseDto) {
    await this.findOne(id);
    return this.prisma.depense.update({
      where: { id },
      data: {
        ...(dto.libelle    !== undefined && { libelle:   dto.libelle }),
        ...(dto.montant    !== undefined && { montant:   dto.montant }),
        ...(dto.categorie  !== undefined && { categorie: dto.categorie }),
        ...(dto.date       !== undefined && { date:      new Date(dto.date) }),
        ...(dto.note       !== undefined && { note:      dto.note }),
        ...(dto.createdBy  !== undefined && { createdBy: dto.createdBy }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.depense.delete({ where: { id } });
  }
}
