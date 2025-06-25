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
    const rows = await db.select().from(conventions).orderBy(conventions.createdAt);
    return rows.map(c => ({
      ...c,
      province: c.province ? JSON.parse(c.province) : [],
      partners: c.partners ? JSON.parse(c.partners) : [],
      attachments: c.attachments ? JSON.parse(c.attachments) : [],
    }));
  }

  async getConvention(id: number): Promise<Convention | undefined> {
    const [c] = await db.select().from(conventions).where(eq(conventions.id, id));
    if (!c) return undefined;
    return {
      ...c,
      province: c.province ? JSON.parse(c.province) : [],
      partners: c.partners ? JSON.parse(c.partners) : [],
      attachments: c.attachments ? JSON.parse(c.attachments) : [],
    };
  }

  async createConvention(conventionData: InsertConvention, createdBy: string): Promise<Convention> {
    const [convention] = await db
      .insert(conventions)
      .values({
        ...conventionData,
        province: conventionData.province ? JSON.stringify(conventionData.province) : null,
        partners: conventionData.partners ? JSON.stringify(conventionData.partners) : null,
        attachments: conventionData.attachments ? JSON.stringify(conventionData.attachments) : null,
        createdBy,
      })
      .returning();
    return {
      ...convention,
      province: convention.province ? JSON.parse(convention.province) : [],
      partners: convention.partners ? JSON.parse(convention.partners) : [],
      attachments: convention.attachments ? JSON.parse(convention.attachments) : [],
    };
  }

  async updateConvention(id: number, updateData: Partial<InsertConvention>): Promise<Convention | undefined> {
    const [convention] = await db
      .update(conventions)
      .set({
        ...updateData,
        province: updateData.province ? JSON.stringify(updateData.province) : null,
        partners: updateData.partners ? JSON.stringify(updateData.partners) : null,
        attachments: updateData.attachments ? JSON.stringify(updateData.attachments) : null,
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
      convention.amount.toString().includes(lowerQuery)
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
