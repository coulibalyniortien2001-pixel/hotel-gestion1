// src/database/seed.ts
import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const rawUrl = process.env.DATABASE_URL!.replace(/sslmode=(prefer|require|verify-ca)/g, 'sslmode=verify-full');
const pool = new Pool({ connectionString: rawUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const BCRYPT_ROUNDS = 10;

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── Users ────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin1234!', BCRYPT_ROUNDS);
  const staffHash = await bcrypt.hash('Staff1234!', BCRYPT_ROUNDS);

  await prisma.user.upsert({
    where: { email: 'admin@hotel.com' },
    update: {},
    create: { email: 'admin@hotel.com', password: adminHash, role: 'admin' },
  });
  await prisma.user.upsert({
    where: { email: 'staff@hotel.com' },
    update: {},
    create: { email: 'staff@hotel.com', password: staffHash, role: 'staff' },
  });
  console.log('✅ Users seeded');

  // ─── Services ─────────────────────────────────────────────────────────
  const serviceData = [
    { id: 's1', name: 'Petit-déjeuner', price: 15 },
    { id: 's2', name: 'Room Service', price: 25 },
    { id: 's3', name: 'Parking', price: 20 },
    { id: 's4', name: 'Mini-bar', price: 35 },
    { id: 's5', name: 'Spa', price: 50 },
    { id: 's6', name: 'Pressing', price: 30 },
  ];

  for (const s of serviceData) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }
  console.log('✅ Services seeded');

  // ─── Rooms (without guestId first) ────────────────────────────────────
  const roomData = [
    { id: 1, number: '101', floor: 1, type: 'SINGLE' as const, status: 'LIBRE' as const, price: 89 },
    { id: 2, number: '102', floor: 1, type: 'SINGLE' as const, status: 'OCCUPEE' as const, price: 89 },
    { id: 3, number: '103', floor: 1, type: 'DOUBLE' as const, status: 'LIBRE' as const, price: 129 },
    { id: 4, number: '104', floor: 1, type: 'DOUBLE' as const, status: 'NETTOYAGE' as const, price: 129 },
    { id: 5, number: '105', floor: 1, type: 'SUITE' as const, status: 'OCCUPEE' as const, price: 249 },
    { id: 6, number: '201', floor: 2, type: 'SINGLE' as const, status: 'LIBRE' as const, price: 99 },
    { id: 7, number: '202', floor: 2, type: 'SINGLE' as const, status: 'TRAVAUX' as const, price: 99 },
    { id: 8, number: '203', floor: 2, type: 'DOUBLE' as const, status: 'OCCUPEE' as const, price: 139 },
    { id: 9, number: '204', floor: 2, type: 'DOUBLE' as const, status: 'LIBRE' as const, price: 139 },
    { id: 10, number: '205', floor: 2, type: 'SUITE' as const, status: 'LIBRE' as const, price: 269 },
    { id: 11, number: '301', floor: 3, type: 'SINGLE' as const, status: 'OCCUPEE' as const, price: 109 },
    { id: 12, number: '302', floor: 3, type: 'SINGLE' as const, status: 'LIBRE' as const, price: 109 },
    { id: 13, number: '303', floor: 3, type: 'DOUBLE' as const, status: 'NETTOYAGE' as const, price: 149 },
    { id: 14, number: '304', floor: 3, type: 'DOUBLE' as const, status: 'OCCUPEE' as const, price: 149 },
    { id: 15, number: '305', floor: 3, type: 'SUITE' as const, status: 'LIBRE' as const, price: 289 },
    { id: 16, number: '401', floor: 4, type: 'DOUBLE' as const, status: 'LIBRE' as const, price: 159 },
    { id: 17, number: '402', floor: 4, type: 'DOUBLE' as const, status: 'OCCUPEE' as const, price: 159 },
    { id: 18, number: '403', floor: 4, type: 'SUITE' as const, status: 'TRAVAUX' as const, price: 299 },
    { id: 19, number: '404', floor: 4, type: 'SUITE' as const, status: 'LIBRE' as const, price: 299 },
    { id: 20, number: '405', floor: 4, type: 'SUITE' as const, status: 'OCCUPEE' as const, price: 349 },
  ];

  for (const r of roomData) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, number: r.number, floor: r.floor, type: r.type, status: r.status, price: r.price },
    });
  }
  // Reset the autoincrement sequence so new rooms get IDs above the seeded ones
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Room"', 'id'), COALESCE((SELECT MAX(id) FROM "Room"), 0) + 1, false)`;
  console.log('✅ Rooms seeded (without guestId)');

  // ─── Guests ───────────────────────────────────────────────────────────
  const guestData = [
    { id: 'g1', firstName: 'Jean', lastName: 'Dupont', phone: '0612345678', email: 'jean.dupont@email.com', roomId: 2 },
    { id: 'g2', firstName: 'Marie', lastName: 'Martin', phone: '0623456789', email: 'marie.martin@email.com', roomId: 5 },
    { id: 'g3', firstName: 'Pierre', lastName: 'Bernard', phone: '0634567890', email: 'pierre.bernard@email.com', roomId: 8 },
    { id: 'g4', firstName: 'Sophie', lastName: 'Dubois', phone: '0645678901', email: 'sophie.dubois@email.com', roomId: 11 },
    { id: 'g5', firstName: 'Lucas', lastName: 'Moreau', phone: '0656789012', email: 'lucas.moreau@email.com', roomId: 14 },
    { id: 'g6', firstName: 'Emma', lastName: 'Laurent', phone: '0667890123', email: 'emma.laurent@email.com', roomId: 17 },
    { id: 'g7', firstName: 'Hugo', lastName: 'Simon', phone: '0678901234', email: 'hugo.simon@email.com', roomId: 20 },
    { id: 'g8', firstName: 'Léa', lastName: 'Michel', phone: '0689012345', email: 'lea.michel@email.com', roomId: null },
    { id: 'g9', firstName: 'Thomas', lastName: 'Garcia', phone: '0690123456', email: 'thomas.garcia@email.com', roomId: null },
    { id: 'g10', firstName: 'Chloé', lastName: 'David', phone: '0601234567', email: 'chloe.david@email.com', roomId: null },
  ];

  for (const g of guestData) {
    await prisma.guest.upsert({
      where: { id: g.id },
      update: {},
      create: {
        id: g.id,
        firstName: g.firstName,
        lastName: g.lastName,
        phone: g.phone,
        email: g.email,
      },
    });
  }
  console.log('✅ Guests seeded');

  // ─── Link rooms to guests ──────────────────────────────────────────────
  const roomGuestLinks = [
    { roomId: 2, guestId: 'g1' },
    { roomId: 5, guestId: 'g2' },
    { roomId: 8, guestId: 'g3' },
    { roomId: 11, guestId: 'g4' },
    { roomId: 14, guestId: 'g5' },
    { roomId: 17, guestId: 'g6' },
    { roomId: 20, guestId: 'g7' },
  ];

  for (const link of roomGuestLinks) {
    await prisma.room.update({
      where: { id: link.roomId },
      data: { guestId: link.guestId },
    });
  }
  console.log('✅ Room-Guest links set');

  // ─── Reservations ──────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const d = (offsetDays: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + offsetDays);
    return date;
  };

  const reservations = [
    {
      id: 'r1',
      guestId: 'g1',
      roomId: 2,
      checkIn: d(-1),
      checkOut: d(1),
      status: 'CHECKIN' as const,
      totalAmount: 178,
      services: ['s1', 's3'],
    },
    {
      id: 'r2',
      guestId: 'g2',
      roomId: 5,
      checkIn: d(-2),
      checkOut: d(3),
      status: 'CHECKIN' as const,
      totalAmount: 1295,
      services: ['s1', 's2', 's5'],
    },
    {
      id: 'r3',
      guestId: 'g3',
      roomId: 8,
      checkIn: d(0),
      checkOut: d(2),
      status: 'CHECKIN' as const,
      totalAmount: 278,
      services: ['s1'],
    },
    {
      id: 'r4',
      guestId: 'g8',
      roomId: 3,
      checkIn: d(1),
      checkOut: d(4),
      status: 'CONFIRMEE' as const,
      totalAmount: 387,
      services: ['s1', 's3'],
    },
    {
      id: 'r5',
      guestId: 'g9',
      roomId: 6,
      checkIn: d(2),
      checkOut: d(5),
      status: 'CONFIRMEE' as const,
      totalAmount: 297,
      services: [],
    },
  ];

  for (const res of reservations) {
    await prisma.reservation.upsert({
      where: { id: res.id },
      update: {},
      create: {
        id: res.id,
        guestId: res.guestId,
        roomId: res.roomId,
        checkIn: res.checkIn,
        checkOut: res.checkOut,
        status: res.status,
        totalAmount: res.totalAmount,
        services: {
          create: res.services.map((serviceId) => ({ serviceId, quantity: 1 })),
        },
      },
    });
  }
  console.log('✅ Reservations seeded');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
