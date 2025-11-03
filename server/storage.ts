import {
  users,
  conventions,
  type User,
  type UpsertUser,
  type Convention,
  type InsertConvention,
  type CreateUser,
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
  getConvention(id: number): Promise<Convention | undefined>;
  createConvention(convention: InsertConvention, createdBy: string): Promise<Convention>;
  updateConvention(id: number, convention: Partial<InsertConvention>): Promise<Convention | undefined>;
  deleteConvention(id: number): Promise<boolean>;
  searchConventions(query: string): Promise<Convention[]>;
  getConventionsByStatus(status: string): Promise<Convention[]>;
  getConventionsByDateRange(fromDate: string, toDate: string): Promise<Convention[]>;
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
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
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
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
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
    }));
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
    };
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
    // This would need proper SQL search implementation
    const allConventions = await this.getAllConventions();
    const lowerQuery = query.toLowerCase();
    return allConventions.filter(convention =>
      convention.conventionNumber.toLowerCase().includes(lowerQuery) ||
      convention.description.toLowerCase().includes(lowerQuery) ||
      convention.contractor.toLowerCase().includes(lowerQuery) ||
      (convention.amount != null && convention.amount.toString().includes(lowerQuery))
    );
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
}

export const storage = new DatabaseStorage();
