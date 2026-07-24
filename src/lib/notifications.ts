import { prisma } from "@/lib/prisma";

export async function createNotification({
  userId, type, title, body, link,
}: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  return prisma.notification.create({
    data: { userId, type, title, body: body ?? null, link: link ?? null },
  });
}
