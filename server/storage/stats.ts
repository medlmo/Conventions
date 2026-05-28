import { db } from "../db";
import { sql } from "drizzle-orm";
import { conventions } from "@shared/schema";

export async function getGlobalStats(): Promise<{
  total: number;
  signed: number;
  signature: number;
  visa: number;
  visee: number;
  totalValue: number;
}> {
  const [row] = await db
    .select({
      total:      sql<number>`COUNT(*)::int`,
      signed:     sql<number>`COUNT(*) FILTER (WHERE ${conventions.status} = 'موقعة')::int`,
      signature:  sql<number>`COUNT(*) FILTER (WHERE ${conventions.status} = 'في طور التوقيع')::int`,
      visa:       sql<number>`COUNT(*) FILTER (WHERE ${conventions.status} = 'في طور التأشير')::int`,
      visee:      sql<number>`COUNT(*) FILTER (WHERE ${conventions.status} = 'مؤشرة')::int`,
      totalValue: sql<number>`COALESCE(SUM(${conventions.amount}::numeric), 0)`,
    })
    .from(conventions);
  return row ?? { total: 0, signed: 0, signature: 0, visa: 0, visee: 0, totalValue: 0 };
}

export async function getStatsByStatus(): Promise<Array<{ status: string; count: number }>> {
  const rows = await db
    .select({ status: conventions.status, count: sql<number>`COUNT(*)::int` })
    .from(conventions)
    .where(sql`
      ${conventions.status} IS NOT NULL
      AND BTRIM(${conventions.status}) <> ''
      AND BTRIM(${conventions.status}) <> 'غير محدد'
    `)
    .groupBy(conventions.status);
  return rows.map((r) => ({ status: String(r.status).trim(), count: r.count }));
}

export async function getStatsBySector(): Promise<Array<{ sector: string; count: number }>> {
  const rows = await db
    .select({ sector: conventions.sector, count: sql<number>`COUNT(*)::int` })
    .from(conventions)
    .where(sql`
      ${conventions.sector} IS NOT NULL
      AND BTRIM(${conventions.sector}) <> ''
      AND BTRIM(${conventions.sector}) <> 'غير محدد'
    `)
    .groupBy(conventions.sector);
  return rows.map((r) => ({ sector: String(r.sector).trim().replace(/\s+/g, " "), count: r.count }));
}

export async function getStatsBySectorCost(): Promise<Array<{ sector: string; amount: number }>> {
  const rows = await db
    .select({
      sector: conventions.sector,
      amount: sql<number>`COALESCE(SUM(${conventions.amount}::numeric), 0)`,
    })
    .from(conventions)
    .where(sql`
      ${conventions.sector} IS NOT NULL
      AND BTRIM(${conventions.sector}) <> ''
      AND BTRIM(${conventions.sector}) <> 'غير محدد'
    `)
    .groupBy(conventions.sector);
  return rows.map((r) => ({ sector: String(r.sector).trim().replace(/\s+/g, " "), amount: Number(r.amount) }));
}

export async function getStatsByDomain(): Promise<Array<{ domain: string; count: number }>> {
  const rows = await db
    .select({ domain: conventions.domain, count: sql<number>`COUNT(*)::int` })
    .from(conventions)
    .where(sql`
      ${conventions.domain} IS NOT NULL
      AND BTRIM(${conventions.domain}) <> ''
      AND BTRIM(${conventions.domain}) <> 'غير محدد'
    `)
    .groupBy(conventions.domain);
  return rows.map((r) => ({ domain: String(r.domain).trim(), count: r.count }));
}

export async function getStatsByYear(): Promise<Array<{ year: string; count: number }>> {
  const rows = await db
    .select({ year: conventions.year, count: sql<number>`COUNT(*)::int` })
    .from(conventions)
    .where(sql`
      ${conventions.year} IS NOT NULL
      AND BTRIM(${conventions.year}) <> ''
      AND BTRIM(${conventions.year}) <> 'غير محدد'
    `)
    .groupBy(conventions.year)
    .orderBy(conventions.year);
  return rows.map((r) => ({ year: String(r.year).trim(), count: r.count }));
}

export async function getStatsByProgramme(): Promise<Array<{ programme: string; count: number }>> {
  const rows = await db
    .select({ programme: conventions.programme, count: sql<number>`COUNT(*)::int` })
    .from(conventions)
    .where(sql`
      ${conventions.programme} IS NOT NULL
      AND BTRIM(${conventions.programme}) <> ''
      AND BTRIM(${conventions.programme}) <> 'غير محدد'
    `)
    .groupBy(conventions.programme);
  return rows.map((r) => ({ programme: String(r.programme).trim(), count: r.count }));
}

export async function getStatsByProvince(): Promise<Array<{ province: string; count: number }>> {
  const rows = await db.execute<{ province: string; count: number }>(sql`
    SELECT p.province, COUNT(*)::int as count
    FROM conventions, jsonb_array_elements_text(
      CASE WHEN province IS NOT NULL AND jsonb_typeof(province) = 'array'
        THEN province ELSE '[]'::jsonb END
    ) AS p(province)
    WHERE BTRIM(p.province) <> ''
      AND BTRIM(p.province) <> 'غير محدد'
    GROUP BY p.province
    ORDER BY count DESC
  `);
  return rows.rows;
}
