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
        conventionNumber: "47/2021",
        date: "2024-01-15",
        description: "اتفاقية شراكة من أجل تعزيز الربط الجوي بين  طنجة واكادير",
        amount: "6750000.00",
        status: "في طور التفعيل",
        year: "2021",
        session: "نونبر 2021",
        domain: "التنمية الإقتصادية",
        sector: "السياحة",
        decisionNumber: "26/2021",
        operationType: "توريد",
        contractor: "شركة العربية للطيران المغرب",
        createdBy: "admin_001",
      },
      {
        conventionNumber: "21/2022",
        date: "2024-01-15",
        description: " اتفاقية شراكة حول دعم قرية الأطفال المسعفين بأكادير",
        amount: "1500000.00",
        status: "في طور التفعيل",
        year: "2022",
        session: "مارس 2022" ,
        domain: "الشؤون الاجتماعية و الثقافية والرياضية",
        sector: "التأهيل الاجتماعي",
        decisionNumber: "62/2022",
        operationType: "توريد",
        contractor: "قرية الأطفال المسعفين ",
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