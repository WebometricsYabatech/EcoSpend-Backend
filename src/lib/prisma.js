import { PrismaClient } from '@prisma/client'

// Use env DATABASE_URL implicitly.
// NOTE: Do not pass unsupported PrismaClient constructor options.
const prisma = new PrismaClient()

export default prisma


