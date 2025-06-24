import { pgTable, text, serial, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conventions = pgTable("conventions", {
  id: serial("id").primaryKey(),
  conventionNumber: text("convention_number").notNull().unique(),
  date: text("date").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull(),
  operationType: text("operation_type").notNull(),
  contractor: text("contractor").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertConventionSchema = createInsertSchema(conventions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConvention = z.infer<typeof insertConventionSchema>;
export type Convention = typeof conventions.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
