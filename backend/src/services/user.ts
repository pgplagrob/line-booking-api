import { prisma } from "../lib/prisma.js";

export async function getOrCreateUser(lineUserId: string) {
  return prisma.user.upsert({
    where: {
      lineUserId,
    },
    update: {},
    create: {
      lineUserId,
    },
    select: {
      id: true,
      lineUserId: true,
    },
  });
}
