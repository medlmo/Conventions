import { db } from "../db";
import { eq, sql } from "drizzle-orm";
import { conventions, type Convention, type InsertConvention } from "@shared/schema";

export async function getAllConventions(): Promise<Convention[]> {
  return await db
    .select()
    .from(conventions)
    .orderBy(
      sql`NULLIF(split_part(${conventions.conventionNumber}, '/', 2), '')::int DESC`,
      sql`NULLIF(split_part(${conventions.conventionNumber}, '/', 1), '')::int DESC`
    ) as Convention[];
}

export async function getConventions(filters?: {
  search?: string;
  status?: string;
  sector?: string;
  programme?: string;
  domain?: string;
  limit?: number;
  offset?: number;
}): Promise<Convention[]> {
  const search     = typeof filters?.search    === "string" ? filters.search.trim()    : "";
  const status     = typeof filters?.status    === "string" ? filters.status.trim()    : "";
  const sector     = typeof filters?.sector    === "string" ? filters.sector.trim()    : "";
  const programme  = typeof filters?.programme === "string" ? filters.programme.trim() : "";
  const domain     = typeof filters?.domain    === "string" ? filters.domain.trim()    : "";

  const safeLimit  = Math.max(1, Math.min(Number(filters?.limit  ?? 1000) || 1000, 5000));
  const safeOffset = Math.max(0, Number(filters?.offset ?? 0) || 0);
  const safeQuery  = search.slice(0, 100);
  const pattern    = `%${safeQuery}%`;

  const conditions: unknown[] = [];

  if (safeQuery) {
    conditions.push(sql`(
      ${conventions.conventionNumber} ILIKE ${pattern}
      OR ${conventions.description}   ILIKE ${pattern}
      OR ${conventions.contractor}    ILIKE ${pattern}
    )`);
  }
  if (status    && status    !== "all") conditions.push(sql`TRIM(${conventions.status})    = ${status}`);
  if (sector    && sector    !== "all") conditions.push(sql`TRIM(${conventions.sector})    = ${sector}`);
  if (programme && programme !== "all") conditions.push(sql`TRIM(${conventions.programme}) = ${programme}`);
  if (domain    && domain    !== "all") conditions.push(sql`TRIM(${conventions.domain})    = ${domain}`);

  let whereClause: any = undefined;
  for (const cond of conditions) {
    whereClause = whereClause ? sql`${whereClause} AND ${cond}` : cond;
  }

  return await db
    .select()
    .from(conventions)
    .where(whereClause ?? sql`TRUE`)
    .orderBy(
      sql`NULLIF(split_part(${conventions.conventionNumber}, '/', 2), '')::int DESC`,
      sql`NULLIF(split_part(${conventions.conventionNumber}, '/', 1), '')::int DESC`
    )
    .limit(safeLimit)
    .offset(safeOffset) as Convention[];
}

export async function getConvention(id: number): Promise<Convention | undefined> {
  const [c] = await db.select().from(conventions).where(eq(conventions.id, id));
  return c as Convention | undefined;
}

export async function createConvention(
  conventionData: InsertConvention,
  createdBy: string
): Promise<Convention> {
  const [convention] = await db
    .insert(conventions)
    .values({
      ...conventionData,
      amount:       conventionData.amount       != null && conventionData.amount       !== "" ? String(conventionData.amount)       : null,
      contribution: conventionData.contribution != null && conventionData.contribution !== "" ? String(conventionData.contribution) : null,
      createdBy,
    })
    .returning();
  return convention as Convention;
}

export async function updateConvention(
  id: number,
  updateData: Partial<InsertConvention>
): Promise<Convention | undefined> {
  const [convention] = await db
    .update(conventions)
    .set({
      ...updateData,
      amount:       updateData.amount       != null && updateData.amount       !== "" ? String(updateData.amount)       : null,
      contribution: updateData.contribution != null && updateData.contribution !== "" ? String(updateData.contribution) : null,
      updatedAt: new Date(),
    })
    .where(eq(conventions.id, id))
    .returning();
  return convention as Convention | undefined;
}

export async function deleteConvention(id: number): Promise<boolean> {
  const result = await db.delete(conventions).where(eq(conventions.id, id));
  return (result.rowCount || 0) > 0;
}

export async function getConventionsByStatus(status: string): Promise<Convention[]> {
  return await db
    .select()
    .from(conventions)
    .where(eq(conventions.status, status)) as Convention[];
}

export async function getConventionsByDateRange(
  fromDate: string,
  toDate: string
): Promise<Convention[]> {
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (!ISO_DATE_RE.test(fromDate) || !ISO_DATE_RE.test(toDate)) {
    throw new Error("صيغة التاريخ غير صحيحة: يجب أن تكون YYYY-MM-DD");
  }
  const from = new Date(fromDate);
  const to   = new Date(toDate);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    throw new Error("قيمة التاريخ غير صحيحة");
  }
  if (from > to) {
    throw new Error("تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية");
  }
  return await db
    .select()
    .from(conventions)
    .where(sql`${conventions.date} BETWEEN ${fromDate} AND ${toDate}`) as Convention[];
}
