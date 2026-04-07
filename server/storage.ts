import {
  users,
  conventions,
  financialContributions,
  administrativeEvents,
  type User,
  type UpsertUser,
  type Convention,
  type InsertConvention,
  type CreateUser,
  type FinancialContribution,
  type InsertFinancialContribution,
  type AdministrativeEvent,
  type InsertAdministrativeEvent,
  UserRole,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto"; // #4 fix

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: CreateUser): Promise<User>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  validateUser(username: string, password: string): Promise<User | null>;

  // Convention methods
  getAllConventions(): Promise<Convention[]>;
  getConventions(filters?: {
    search?: string;
    status?: string;
    sector?: string;
    programme?: string;
    domain?: string;
    limit?: number;
    offset?: number;
  }): Promise<Convention[]>;
  getConvention(id: number): Promise<Convention | undefined>;
  createConvention(convention: InsertConvention, createdBy: string): Promise<Convention>;
  updateConvention(id: number, convention: Partial<InsertConvention>): Promise<Convention | undefined>;
  deleteConvention(id: number): Promise<boolean>;
  searchConventions(query: string): Promise<Convention[]>;
  getConventionsByStatus(status: string): Promise<Convention[]>;
  getConventionsByDateRange(fromDate: string, toDate: string): Promise<Convention[]>;

  // DB-level aggregation stats methods
  getGlobalStats(): Promise<{ total: number; signed: number; signature: number; visa: number; visee: number; totalValue: number }>;
  getStatsByStatus(): Promise<Array<{ status: string; count: number }>>;
  getStatsBySector(): Promise<Array<{ sector: string; count: number }>>;
  getStatsBySectorCost(): Promise<Array<{ sector: string; amount: number }>>;
  getStatsByDomain(): Promise<Array<{ domain: string; count: number }>>;
  getStatsByYear(): Promise<Array<{ year: string; count: number }>>;
  getStatsByProgramme(): Promise<Array<{ programme: string; count: number }>>;
  getStatsByProvince(): Promise<Array<{ province: string; count: number }>>;

  // Financial contribution methods
  getFinancialContributionsByConvention(conventionId: number): Promise<FinancialContribution[]>;
  createFinancialContribution(contribution: InsertFinancialContribution): Promise<FinancialContribution>;
  updateFinancialContribution(id: number, contribution: Partial<InsertFinancialContribution>): Promise<FinancialContribution | undefined>;
  deleteFinancialContribution(id: number): Promise<boolean>;

  // Administrative event methods
  getAdministrativeEventsByConvention(conventionId: number): Promise<AdministrativeEvent[]>;
  createAdministrativeEvent(event: InsertAdministrativeEvent): Promise<AdministrativeEvent>;
  updateAdministrativeEvent(id: number, event: Partial<InsertAdministrativeEvent>): Promise<AdministrativeEvent | undefined>;
  deleteAdministrativeEvent(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const { password: _password, ...rest } = userData;
    const [user] = await db
      .insert(users)
      .values({ ...rest, password: hashedPassword })
      .onConflictDoUpdate({
        target: users.id,
        set: { ...rest, password: hashedPassword, updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  async createUser(userData: CreateUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    // #4 fix: use crypto.randomUUID() — no collision risk, no deprecated .substr()
    const [user] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        username: userData.username,
        password: hashedPassword,
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined> {
    const passwordUpdate =
      userData && Object.prototype.hasOwnProperty.call(userData, "password") && typeof userData.password === "string"
        ? userData.password
        : undefined;

    const { password: _password, ...rest } = userData as typeof userData & { password?: unknown };
    const nextUserData: Partial<UpsertUser> = {
      ...rest,
      ...(passwordUpdate ? { password: await bcrypt.hash(passwordUpdate, 10) } : {}),
    };

    const [user] = await db
      .update(users)
      .set({ ...nextUserData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    // #3 fix: isActive is now a real boolean
    if (!user || !user.isActive) return null;
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Convention operations
  // #2 fix: jsonb columns — Drizzle returns actual arrays, no parsing needed
  async getAllConventions(): Promise<Convention[]> {
    return await db
      .select()
      .from(conventions)
      .orderBy(
        sql`NULLIF(split_part(${conventions.conventionNumber}, '/', 2), '')::int DESC`,
        sql`NULLIF(split_part(${conventions.conventionNumber}, '/', 1), '')::int DESC`
      ) as Convention[];
  }

  async getConventions(filters?: {
    search?: string;
    status?: string;
    sector?: string;
    programme?: string;
    domain?: string;
    limit?: number;
    offset?: number;
  }): Promise<Convention[]> {
    const search = typeof filters?.search === "string" ? filters.search.trim() : "";
    const status = typeof filters?.status === "string" ? filters.status.trim() : "";
    const sector = typeof filters?.sector === "string" ? filters.sector.trim() : "";
    const programme = typeof filters?.programme === "string" ? filters.programme.trim() : "";
    const domain = typeof filters?.domain === "string" ? filters.domain.trim() : "";

    const safeLimit = Math.max(1, Math.min(Number(filters?.limit ?? 1000) || 1000, 5000));
    const safeOffset = Math.max(0, Number(filters?.offset ?? 0) || 0);
    const safeQuery = search.slice(0, 100);
    const pattern = `%${safeQuery}%`;

    const conditions: unknown[] = [];

    if (safeQuery) {
      conditions.push(sql`(
        ${conventions.conventionNumber} ILIKE ${pattern}
        OR ${conventions.description} ILIKE ${pattern}
        OR ${conventions.contractor} ILIKE ${pattern}
      )`);
    }
    if (status && status !== "all") conditions.push(sql`TRIM(${conventions.status}) = ${status}`);
    if (sector && sector !== "all") conditions.push(sql`TRIM(${conventions.sector}) = ${sector}`);
    if (programme && programme !== "all") conditions.push(sql`TRIM(${conventions.programme}) = ${programme}`);
    if (domain && domain !== "all") conditions.push(sql`TRIM(${conventions.domain}) = ${domain}`);

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

  async getConvention(id: number): Promise<Convention | undefined> {
    const [c] = await db.select().from(conventions).where(eq(conventions.id, id));
    return c as Convention | undefined;
  }

  async createConvention(conventionData: InsertConvention, createdBy: string): Promise<Convention> {
    const [convention] = await db
      .insert(conventions)
      .values({
        ...conventionData,
        // Decimal fields must be strings for the pg driver
        amount: conventionData.amount != null && conventionData.amount !== "" ? String(conventionData.amount) : null,
        contribution: conventionData.contribution != null && conventionData.contribution !== "" ? String(conventionData.contribution) : null,
        // #2 fix: jsonb columns accept arrays directly — no JSON.stringify needed
        createdBy,
      })
      .returning();
    return convention as Convention;
  }

  async updateConvention(id: number, updateData: Partial<InsertConvention>): Promise<Convention | undefined> {
    const [convention] = await db
      .update(conventions)
      .set({
        ...updateData,
        amount: updateData.amount != null && updateData.amount !== "" ? String(updateData.amount) : null,
        contribution: updateData.contribution != null && updateData.contribution !== "" ? String(updateData.contribution) : null,
        // #2 fix: jsonb columns accept arrays directly — no JSON.stringify needed
        updatedAt: new Date(),
      })
      .where(eq(conventions.id, id))
      .returning();
    return convention as Convention | undefined;
  }

  async deleteConvention(id: number): Promise<boolean> {
    const result = await db.delete(conventions).where(eq(conventions.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchConventions(query: string): Promise<Convention[]> {
    const q = String(query ?? "").trim();
    if (!q) return [];
    const safeQuery = q.slice(0, 100);
    const pattern = `%${safeQuery}%`;
    return await db
      .select()
      .from(conventions)
      .where(sql`(
        ${conventions.conventionNumber} ILIKE ${pattern}
        OR ${conventions.description} ILIKE ${pattern}
        OR ${conventions.contractor} ILIKE ${pattern}
        OR ${conventions.amount}::text ILIKE ${pattern}
      )`)
      .limit(50) as Convention[];
  }

  async getConventionsByStatus(status: string): Promise<Convention[]> {
    return await db.select().from(conventions).where(eq(conventions.status, status)) as Convention[];
  }

  async getConventionsByDateRange(fromDate: string, toDate: string): Promise<Convention[]> {
    return await db
      .select()
      .from(conventions)
      .where(sql`${conventions.date} BETWEEN ${fromDate} AND ${toDate}`) as Convention[];
  }

  // DB-level aggregation stats
  async getGlobalStats(): Promise<{ total: number; signed: number; signature: number; visa: number; visee: number; totalValue: number }> {
    const [row] = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        signed: sql<number>`COUNT(*) FILTER (WHERE ${conventions.status} = 'موقعة')::int`,
        signature: sql<number>`COUNT(*) FILTER (WHERE ${conventions.status} = 'في طور التوقيع')::int`,
        visa: sql<number>`COUNT(*) FILTER (WHERE ${conventions.status} = 'في طور التأشير')::int`,
        visee: sql<number>`COUNT(*) FILTER (WHERE ${conventions.status} = 'مؤشرة')::int`,
        totalValue: sql<number>`COALESCE(SUM(${conventions.amount}::numeric), 0)`,
      })
      .from(conventions);
    return row ?? { total: 0, signed: 0, signature: 0, visa: 0, visee: 0, totalValue: 0 };
  }

  async getStatsByStatus(): Promise<Array<{ status: string; count: number }>> {
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

  async getStatsBySector(): Promise<Array<{ sector: string; count: number }>> {
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

  async getStatsBySectorCost(): Promise<Array<{ sector: string; amount: number }>> {
    const rows = await db
      .select({ sector: conventions.sector, amount: sql<number>`COALESCE(SUM(${conventions.amount}::numeric), 0)` })
      .from(conventions)
      .where(sql`
        ${conventions.sector} IS NOT NULL
        AND BTRIM(${conventions.sector}) <> ''
        AND BTRIM(${conventions.sector}) <> 'غير محدد'
      `)
      .groupBy(conventions.sector);
    return rows.map((r) => ({ sector: String(r.sector).trim().replace(/\s+/g, " "), amount: Number(r.amount) }));
  }

  async getStatsByDomain(): Promise<Array<{ domain: string; count: number }>> {
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

  async getStatsByYear(): Promise<Array<{ year: string; count: number }>> {
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

  async getStatsByProgramme(): Promise<Array<{ programme: string; count: number }>> {
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

  async getStatsByProvince(): Promise<Array<{ province: string; count: number }>> {
    // #2 fix: province is now jsonb, use PostgreSQL's jsonb_array_elements_text for DB-level aggregation
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

  // Financial contribution operations
  async getFinancialContributionsByConvention(conventionId: number): Promise<FinancialContribution[]> {
    return await db
      .select()
      .from(financialContributions)
      .where(eq(financialContributions.conventionId, conventionId))
      .orderBy(financialContributions.year, financialContributions.partnerName);
  }

  async createFinancialContribution(contributionData: InsertFinancialContribution): Promise<FinancialContribution> {
    const [contribution] = await db
      .insert(financialContributions)
      .values({
        ...contributionData,
        amountExpected: contributionData.amountExpected ? String(contributionData.amountExpected) : null,
        amountPaid: contributionData.amountPaid ? String(contributionData.amountPaid) : null,
      })
      .returning();
    return contribution;
  }

  async updateFinancialContribution(
    id: number,
    contributionData: Partial<InsertFinancialContribution>
  ): Promise<FinancialContribution | undefined> {
    const [contribution] = await db
      .update(financialContributions)
      .set({
        ...contributionData,
        amountExpected: contributionData.amountExpected ? String(contributionData.amountExpected) : undefined,
        amountPaid: contributionData.amountPaid ? String(contributionData.amountPaid) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(financialContributions.id, id))
      .returning();
    return contribution;
  }

  async deleteFinancialContribution(id: number): Promise<boolean> {
    const result = await db.delete(financialContributions).where(eq(financialContributions.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Administrative event operations
  async getAdministrativeEventsByConvention(conventionId: number): Promise<AdministrativeEvent[]> {
    return await db
      .select()
      .from(administrativeEvents)
      .where(eq(administrativeEvents.conventionId, conventionId))
      .orderBy(administrativeEvents.eventDate);
  }

  async createAdministrativeEvent(eventData: InsertAdministrativeEvent): Promise<AdministrativeEvent> {
    const [event] = await db.insert(administrativeEvents).values(eventData).returning();
    return event;
  }

  async updateAdministrativeEvent(
    id: number,
    eventData: Partial<InsertAdministrativeEvent>
  ): Promise<AdministrativeEvent | undefined> {
    const [event] = await db
      .update(administrativeEvents)
      .set({ ...eventData, updatedAt: new Date() })
      .where(eq(administrativeEvents.id, id))
      .returning();
    return event;
  }

  async deleteAdministrativeEvent(id: number): Promise<boolean> {
    const result = await db.delete(administrativeEvents).where(eq(administrativeEvents.id, id));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();
