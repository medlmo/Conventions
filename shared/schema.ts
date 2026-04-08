import { pgTable, text, serial, decimal, timestamp, varchar, index, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const UserRole = {
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer"
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull().default(sql`gen_random_uuid()`), // #4 fix: DB-level UUID
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username").notNull().unique(),
  password: varchar("password").notNull(),
  role: text("role").notNull().default(UserRole.VIEWER),
  isActive: boolean("is_active").notNull().default(true), // #3 fix: real boolean
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conventions = pgTable("conventions", {
  id: serial("id").primaryKey(),
  conventionNumber: text("convention_number").notNull().unique(),
  date: text("date").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  status: text("status").notNull(),
  year: text("year").notNull(),
  session: text("session").notNull(),
  domain: text("domain").notNull(),
  sector: text("sector").notNull(),
  decisionNumber: text("decision_number").notNull(),
  contractor: text("contractor").notNull(),
  contribution: decimal("contribution", { precision: 12, scale: 2 }),
  province: jsonb("province").$type<string[]>(),          // #2 fix: jsonb array
  partners: jsonb("partners").$type<string[]>(),          // #2 fix: jsonb array
  attachments: jsonb("attachments").$type<string[]>(),    // #2 fix: jsonb array
  programme: text("programme"),
  executionType: text("execution_type"),
  delegatedProjectOwner: jsonb("delegated_project_owner").$type<string[]>(), // #2 fix: jsonb array
  validity: text("validity"),
  jurisdiction: text("jurisdiction"),
  conventionType: text("convention_type"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertConventionSchema = createInsertSchema(conventions).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // #2 fix: no more string-parsing needed, jsonb returns actual arrays
  province: z.array(z.string()).optional(),
  partners: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
  amount: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.union([z.string(), z.number()]).optional()
  ),
  contribution: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.union([z.string(), z.number()]).optional()
  ),
  programme: z.string().optional(),
  executionType: z.string().optional(),
  delegatedProjectOwner: z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    if (val === undefined || val === null || val === "") return undefined;
    return [String(val)];
  }, z.array(z.string()).optional()),
  validity: z.string().optional(),
  jurisdiction: z.enum(["منقول", "ذاتي", "مشترك"]).optional(),
  conventionType: z.enum(["اتفاقية شراكة", "اتفاقية خاصة", "ملحق تعديلي", "اتفاقية اطار"]).optional(),
});

export type InsertConvention = z.infer<typeof insertConventionSchema>;
export type Convention = typeof conventions.$inferSelect;

// Financial contributions table
export const financialContributions = pgTable("financial_contributions", {
  id: serial("id").primaryKey(),
  conventionId: integer("convention_id").references(() => conventions.id, { onDelete: "cascade" }).notNull(),
  partnerName: text("partner_name").notNull(),
  year: text("year").notNull(),
  amountExpected: decimal("amount_expected", { precision: 12, scale: 2 }),
  amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }),
  paymentDate: text("payment_date"),
  isPaid: boolean("is_paid").notNull().default(false), // #3 fix: real boolean
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFinancialContributionSchema = createInsertSchema(financialContributions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amountExpected: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.union([z.string(), z.number()]).optional()
  ),
  amountPaid: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.union([z.string(), z.number()]).optional()
  ),
  paymentDate: z.string().optional(),
  isPaid: z.boolean().default(false), // #3 fix: real boolean
  notes: z.string().optional(),
});

export type InsertFinancialContribution = z.infer<typeof insertFinancialContributionSchema>;
export type FinancialContribution = typeof financialContributions.$inferSelect;

// Administrative events table
export const administrativeEvents = pgTable("administrative_events", {
  id: serial("id").primaryKey(),
  conventionId: integer("convention_id").references(() => conventions.id, { onDelete: "cascade" }).notNull(),
  eventDate: text("event_date").notNull(),
  eventDescription: text("event_description").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAdministrativeEventSchema = createInsertSchema(administrativeEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  eventDate: z.string().min(1, "تاريخ الحدث مطلوب"),
  eventDescription: z.string().min(1, "وصف الحدث مطلوب"),
  notes: z.string().optional(),
});

export type InsertAdministrativeEvent = z.infer<typeof insertAdministrativeEventSchema>;
export type AdministrativeEvent = typeof administrativeEvents.$inferSelect;

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createUserSchema = insertUserSchema.pick({
  username: true,
  password: true,
  role: true,
  firstName: true,
  lastName: true,
  email: true,
}).extend({
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

// Separate update schema that also allows toggling isActive
export const updateUserSchema = createUserSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
