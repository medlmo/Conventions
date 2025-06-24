import { conventions, users, type Convention, type InsertConvention, type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Convention methods
  getAllConventions(): Promise<Convention[]>;
  getConvention(id: number): Promise<Convention | undefined>;
  createConvention(convention: InsertConvention): Promise<Convention>;
  updateConvention(id: number, convention: Partial<InsertConvention>): Promise<Convention | undefined>;
  deleteConvention(id: number): Promise<boolean>;
  searchConventions(query: string): Promise<Convention[]>;
  getConventionsByStatus(status: string): Promise<Convention[]>;
  getConventionsByDateRange(fromDate: string, toDate: string): Promise<Convention[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private conventions: Map<number, Convention>;
  private currentUserId: number;
  private currentConventionId: number;

  constructor() {
    this.users = new Map();
    this.conventions = new Map();
    this.currentUserId = 1;
    this.currentConventionId = 1;
    this.seedData();
  }

  private seedData() {
    // Add sample data based on the Excel screenshot
    const sampleConventions = [
      {
        conventionNumber: "2024/001",
        date: "2024-01-15",
        description: "توريد وتركيب أجهزة حاسوب للإدارة العامة",
        amount: "150000.00",
        status: "نشطة",
        operationType: "توريد",
        contractor: "شركة التقنية المتقدمة"
      },
      {
        conventionNumber: "2024/002", 
        date: "2024-02-20",
        description: "صيانة شبكة الحاسوب والخوادم",
        amount: "85000.00",
        status: "قيد التنفيذ",
        operationType: "صيانة",
        contractor: "مؤسسة الحلول التقنية"
      },
      {
        conventionNumber: "2024/003",
        date: "2024-03-10", 
        description: "تطوير نظام إدارة الموارد البشرية",
        amount: "250000.00",
        status: "معلقة",
        operationType: "تطوير",
        contractor: "شركة البرمجيات الذكية"
      }
    ];

    sampleConventions.forEach(conv => {
      const id = this.currentConventionId++;
      const now = new Date();
      const convention: Convention = {
        ...conv,
        id,
        createdAt: now,
        updatedAt: now,
      };
      this.conventions.set(id, convention);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Convention methods
  async getAllConventions(): Promise<Convention[]> {
    return Array.from(this.conventions.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getConvention(id: number): Promise<Convention | undefined> {
    return this.conventions.get(id);
  }

  async createConvention(insertConvention: InsertConvention): Promise<Convention> {
    const id = this.currentConventionId++;
    const now = new Date();
    const convention: Convention = {
      ...insertConvention,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.conventions.set(id, convention);
    return convention;
  }

  async updateConvention(id: number, updateData: Partial<InsertConvention>): Promise<Convention | undefined> {
    const existing = this.conventions.get(id);
    if (!existing) return undefined;

    const updated: Convention = {
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    };
    this.conventions.set(id, updated);
    return updated;
  }

  async deleteConvention(id: number): Promise<boolean> {
    return this.conventions.delete(id);
  }

  async searchConventions(query: string): Promise<Convention[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.conventions.values()).filter(convention =>
      convention.conventionNumber.toLowerCase().includes(lowerQuery) ||
      convention.description.toLowerCase().includes(lowerQuery) ||
      convention.contractor.toLowerCase().includes(lowerQuery) ||
      convention.amount.toString().includes(lowerQuery)
    );
  }

  async getConventionsByStatus(status: string): Promise<Convention[]> {
    return Array.from(this.conventions.values()).filter(convention =>
      convention.status === status
    );
  }

  async getConventionsByDateRange(fromDate: string, toDate: string): Promise<Convention[]> {
    return Array.from(this.conventions.values()).filter(convention => {
      const convDate = new Date(convention.date);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      return convDate >= from && convDate <= to;
    });
  }
}

export const storage = new MemStorage();
