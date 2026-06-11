import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  databaseUrl: process.env.DATABASE_URL  // ✅ Prisma 7 property name
})

export default prisma