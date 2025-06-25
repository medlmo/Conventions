import { db } from "./db";
import { users, conventions } from "@shared/schema";
import { UserRole } from "@shared/schema";
import bcrypt from "bcrypt";

async function seedDatabase() {
  console.log("Seeding database...");

  try {
    // Create default users
    const defaultUsers = [
      {
        id: "admin_001",
        username: "admin",
        password: await bcrypt.hash("admin123", 10),
        role: UserRole.ADMIN,
        firstName: "مدير",
        lastName: "النظام",
        email: "admin@example.com",
        isActive: "true",
      },
      {
        id: "editor_001",
        username: "editor",
        password: await bcrypt.hash("editor123", 10),
        role: UserRole.EDITOR,
        firstName: "محرر",
        lastName: "النظام",
        email: "editor@example.com",
        isActive: "true",
      },
      {
        id: "viewer_001",
        username: "viewer",
        password: await bcrypt.hash("viewer123", 10),
        role: UserRole.VIEWER,
        firstName: "مشاهد",
        lastName: "النظام",
        email: "viewer@example.com",
        isActive: "true",
      },
    ];

    // Insert users
    for (const user of defaultUsers) {
      await db
        .insert(users)
        .values(user)
        .onConflictDoNothing();
    }

    // Create sample conventions
    const sampleConventions = [
      {
        conventionNumber: "2024/001",
        date: "2024-01-15",
        description: "توريد وتركيب أجهزة حاسوب للإدارة العامة",
        amount: "150000.00",
        status: "نشطة",
        year: "2024",
        session: "1",
        domain: "Informatique",
        sector: "Public",
        decisionNumber: "D-001",
        operationType: "توريد",
        contractor: "شركة التقنية المتقدمة",
        createdBy: "admin_001",
      },
      {
        conventionNumber: "2024/002",
        date: "2024-02-20",
        description: "صيانة شبكة الحاسوب والخوادم",
        amount: "85000.00",
        status: "قيد التنفيذ",
        year: "2024",
        session: "1",
        domain: "Informatique",
        sector: "Public",
        decisionNumber: "D-001",
        contractor: "مؤسسة الحلول التقنية",
        createdBy: "editor_001",
      },
    ];

    // Insert conventions
    for (const convention of sampleConventions) {
      await db
        .insert(conventions)
        .values(convention)
        .onConflictDoNothing();
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => process.exit(0));
}

export { seedDatabase };