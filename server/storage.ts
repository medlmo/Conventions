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
  type UserRoleType
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";

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
    // Always hash password before persisting to avoid storing plaintext passwords.
    // `UpsertUser` is derived from `users.$inferInsert` where `password` is required.
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const { password: _password, ...rest } = userData;
    const [user] = await db
      .insert(users)
      .values({
        ...rest,
        password: hashedPassword,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...rest,
          password: hashedPassword,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(userData: CreateUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        username: userData.username,
        password: hashedPassword,
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        isActive: "true",
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined> {
    // Never overwrite stored passwords with plaintext.
    // Only hash and set password when an explicit password update is requested.
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
    if (!user || user.isActive !== "true") return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Convention operations  
  async getAllConventions(): Promise<Convention[]> {
    const parseArray = (val: unknown): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val as string[];
      if (typeof val === 'string') {
        const s = val.trim();
        if (!s) return [];
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed as string[];
          return [String(parsed)];
        } catch {
          if (s.includes(',')) return s.split(',').map(p => p.trim()).filter(Boolean);
          return [s];
        }
      }
      try {
        const parsed = JSON.parse(String(val));
        return Array.isArray(parsed) ? (parsed as string[]) : [String(parsed)];
      } catch {
        return [String(val)];
      }
    };
    const rows = await db
      .select()
      .from(conventions)
      .orderBy(
        // Trier d'abord par année (partie après le '/') en ordre décroissant
        sql`NULLIF(split_part(${conventions.conventionNumber}, '/', 2), '')::int DESC`,
        // Puis par numéro (partie avant le '/') en ordre décroissant
        sql`NULLIF(split_part(${conventions.conventionNumber}, '/', 1), '')::int DESC`
      );
    return rows.map(c => ({
      ...c,
      province: parseArray(c.province as unknown as string),
      partners: parseArray(c.partners as unknown as string),
      attachments: parseArray(c.attachments as unknown as string),
      delegatedProjectOwner: parseArray(c.delegatedProjectOwner as unknown as string),
    })) as unknown as Convention[];
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
    const parseArray = (val: unknown): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val as string[];
      if (typeof val === "string") {
        const s = val.trim();
        if (!s) return [];
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed as string[];
          return [String(parsed)];
        } catch {
          if (s.includes(",")) return s.split(",").map((p) => p.trim()).filter(Boolean);
          return [s];
        }
      }
      try {
        const parsed = JSON.parse(String(val));
        return Array.isArray(parsed) ? (parsed as string[]) : [String(parsed)];
      } catch {
        return [String(val)];
      }
    };

    const search = typeof filters?.search === "string" ? filters?.search.trim() : "";
    const status = typeof filters?.status === "string" ? filters?.status.trim() : "";
    const sector = typeof filters?.sector === "string" ? filters?.sector.trim() : "";
    const programme = typeof filters?.programme === "string" ? filters?.programme.trim() : "";
    const domain = typeof filters?.domain === "string" ? filters?.domain.trim() : "";

    const safeLimit = Math.max(1, Math.min(Number(filters?.limit ?? 1000) || 1000, 5000));
    const safeOffset = Math.max(0, Number(filters?.offset ?? 0) || 0);

    const MAX_QUERY_LEN = 100;
    const safeQuery = search.slice(0, MAX_QUERY_LEN);
    const pattern = `%${safeQuery}%`;

    // Build WHERE clause incrementally to avoid loading everything in memory.
    const conditions: unknown[] = [];

    if (safeQuery) {
      conditions.push(
        sql`(
          ${conventions.conventionNumber} ILIKE ${pattern}
          OR ${conventions.description} ILIKE ${pattern}
          OR ${conventions.contractor} ILIKE ${pattern}
        )`
      );
    }
    if (status && status !== "all") {
      conditions.push(sql`${conventions.status} = ${status}`);
    }
    if (sector && sector !== "all") {
      conditions.push(sql`${conventions.sector} = ${sector}`);
    }
    if (programme && programme !== "all") {
      conditions.push(sql`${conventions.programme} = ${programme}`);
    }
    if (domain && domain !== "all") {
      conditions.push(sql`${conventions.domain} = ${domain}`);
    }

    let whereClause: any = undefined;
    for (const cond of conditions) {
      whereClause = whereClause ? sql`${whereClause} AND ${cond}` : cond;
    }

    const whereClauseFinal = whereClause ?? sql`TRUE`;

    const rows = await db
      .select()
      .from(conventions)
      .where(whereClauseFinal)
      .orderBy(
        // Trier d'abord par année (partie après le '/') en ordre décroissant
        sql`NULLIF(split_part(${conventions.conventionNumber}, '/', 2), '')::int DESC`,
        // Puis par numéro (partie avant le '/') en ordre décroissant
        sql`NULLIF(split_part(${conventions.conventionNumber}, '/', 1), '')::int DESC`,
      )
      .limit(safeLimit)
      .offset(safeOffset);

    // Keep response shape compatible with the client.
    return rows.map((c: any) => ({
      ...c,
      province: parseArray(c.province as unknown as string),
      partners: parseArray(c.partners as unknown as string),
      attachments: parseArray(c.attachments as unknown as string),
      delegatedProjectOwner: parseArray(c.delegatedProjectOwner as unknown as string),
    })) as unknown as Convention[];
  }

  async getConvention(id: number): Promise<Convention | undefined> {
    const [c] = await db.select().from(conventions).where(eq(conventions.id, id));
    if (!c) return undefined;
    const parseArray = (val: unknown): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val as string[];
      if (typeof val === 'string') {
        const s = val.trim();
        if (!s) return [];
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed as string[];
          return [String(parsed)];
        } catch {
          if (s.includes(',')) return s.split(',').map(p => p.trim()).filter(Boolean);
          return [s];
        }
      }
      try {
        const parsed = JSON.parse(String(val));
        return Array.isArray(parsed) ? (parsed as string[]) : [String(parsed)];
      } catch {
        return [String(val)];
      }
    };
    return {
      ...c,
      province: parseArray(c.province as unknown as string),
      partners: parseArray(c.partners as unknown as string),
      attachments: parseArray(c.attachments as unknown as string),
      delegatedProjectOwner: parseArray(c.delegatedProjectOwner as unknown as string),
    } as unknown as Convention;
  }

  async createConvention(conventionData: InsertConvention, createdBy: string): Promise<Convention> {
    const normalizedDelegated = Array.isArray(conventionData.delegatedProjectOwner)
      ? conventionData.delegatedProjectOwner
      : (conventionData.delegatedProjectOwner ? [String(conventionData.delegatedProjectOwner)] : undefined);
    const [convention] = await db
      .insert(conventions)
      .values({
        ...conventionData,
        amount:
          conventionData.amount !== undefined && conventionData.amount !== null && conventionData.amount !== ""
            ? String(conventionData.amount)
            : null,
        contribution:
          conventionData.contribution !== undefined && conventionData.contribution !== null && conventionData.contribution !== ""
            ? String(conventionData.contribution)
            : null,
        province: conventionData.province ? JSON.stringify(conventionData.province) : null,
        partners: conventionData.partners ? JSON.stringify(conventionData.partners) : null,
        attachments: conventionData.attachments ? JSON.stringify(conventionData.attachments) : null,
        delegatedProjectOwner: conventionData.delegatedProjectOwner ? JSON.stringify(conventionData.delegatedProjectOwner) : null,
        createdBy,
      })
      .returning();
    return {
      ...convention,
      province: convention.province ? JSON.parse(convention.province) : [],
      partners: convention.partners ? JSON.parse(convention.partners) : [],
      attachments: convention.attachments ? JSON.parse(convention.attachments) : [],
      delegatedProjectOwner: convention.delegatedProjectOwner ? JSON.parse(convention.delegatedProjectOwner as unknown as string) : [],
    };
  }

  async updateConvention(id: number, updateData: Partial<InsertConvention>): Promise<Convention | undefined> {
    const [convention] = await db
      .update(conventions)
      .set({
        ...updateData,
        amount:
          updateData.amount !== undefined && updateData.amount !== null && updateData.amount !== ""
            ? String(updateData.amount)
            : null,
        contribution:
          updateData.contribution !== undefined && updateData.contribution !== null && updateData.contribution !== ""
            ? String(updateData.contribution)
            : null,
        province: updateData.province ? JSON.stringify(updateData.province) : null,
        partners: updateData.partners ? JSON.stringify(updateData.partners) : null,
        attachments: updateData.attachments ? JSON.stringify(updateData.attachments) : null,
        delegatedProjectOwner: updateData.delegatedProjectOwner ? JSON.stringify(updateData.delegatedProjectOwner) : null,
        updatedAt: new Date(),
      })
      .where(eq(conventions.id, id))
      .returning();
    return convention
      ? {
          ...convention,
          province: convention.province ? JSON.parse(convention.province) : [],
          partners: convention.partners ? JSON.parse(convention.partners) : [],
          attachments: convention.attachments ? JSON.parse(convention.attachments) : [],
          delegatedProjectOwner: convention.delegatedProjectOwner ? JSON.parse(convention.delegatedProjectOwner as unknown as string) : [],
        }
      : undefined;
  }

  async deleteConvention(id: number): Promise<boolean> {
    const result = await db.delete(conventions).where(eq(conventions.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchConventions(query: string): Promise<Convention[]> {
    // Production-grade search:
    // - Avoid loading ALL conventions in memory.
    // - Perform case-insensitive filtering in Postgres (ILIKE).
    // - Cap results to prevent response bloat and DoS.
    const q = String(query ?? "").trim();
    if (!q) return [];

    // Prevent pathological patterns / huge payloads.
    const MAX_QUERY_LEN = 100;
    const safeQuery = q.slice(0, MAX_QUERY_LEN);
    const pattern = `%${safeQuery}%`;
    const MAX_RESULTS = 50;

    const rows = await db
      .select()
      .from(conventions)
      .where(
        sql`(
          ${conventions.conventionNumber} ILIKE ${pattern}
          OR ${conventions.description} ILIKE ${pattern}
          OR ${conventions.contractor} ILIKE ${pattern}
          OR ${conventions.amount}::text ILIKE ${pattern}
        )`
      )
      .limit(MAX_RESULTS);

    // Keep response shape consistent with getAllConventions() by parsing JSON-string columns.
    const parseArray = (val: unknown): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val as string[];
      if (typeof val === "string") {
        const s = val.trim();
        if (!s) return [];
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed as string[];
          return [String(parsed)];
        } catch {
          if (s.includes(",")) return s.split(",").map((p) => p.trim()).filter(Boolean);
          return [s];
        }
      }
      try {
        const parsed = JSON.parse(String(val));
        return Array.isArray(parsed) ? (parsed as string[]) : [String(parsed)];
      } catch {
        return [String(val)];
      }
    };

    return rows.map((c) => ({
      ...c,
      province: parseArray(c.province as unknown as string),
      partners: parseArray(c.partners as unknown as string),
      attachments: parseArray(c.attachments as unknown as string),
      delegatedProjectOwner: parseArray(c.delegatedProjectOwner as unknown as string),
    })) as unknown as Convention[];
  }

  async getConventionsByStatus(status: string): Promise<Convention[]> {
    const allConventions = await this.getAllConventions();
    return allConventions.filter(convention => convention.status === status);
  }

  async getConventionsByDateRange(fromDate: string, toDate: string): Promise<Convention[]> {
    const allConventions = await this.getAllConventions();
    return allConventions.filter(convention => {
      const convDate = new Date(convention.date);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      return convDate >= from && convDate <= to;
    });
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
        updatedAt: new Date() 
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
    const [event] = await db
      .insert(administrativeEvents)
      .values(eventData)
      .returning();
    return event;
  }

  async updateAdministrativeEvent(
    id: number, 
    eventData: Partial<InsertAdministrativeEvent>
  ): Promise<AdministrativeEvent | undefined> {
    const [event] = await db
      .update(administrativeEvents)
      .set({ 
        ...eventData,
        updatedAt: new Date() 
      })
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
