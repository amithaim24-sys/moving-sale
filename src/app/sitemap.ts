import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { locales } from "@/i18n/config";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  const items = await prisma.item
    .findMany({
      where: { status: "AVAILABLE" },
      select: { id: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    })
    .catch(() => [] as { id: string; updatedAt: Date }[]);

  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    entries.push({ url: `${base}/${locale}`, changeFrequency: "daily", priority: 1 });
    for (const it of items) {
      entries.push({
        url: `${base}/${locale}/items/${it.id}`,
        lastModified: it.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }
  return entries;
}
