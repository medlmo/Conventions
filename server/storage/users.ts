import { db } from "../db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import {
  users,
  UserRole,
  type User,
  type SafeUser,
  type UpsertUser,
  type CreateUser,
} from "@shared/schema";

export function stripPassword(user: User): SafeUser {
  const { password: _pw, ...safe } = user;
  return safe;
}

export const BCRYPT_ROUNDS = 12;

/**
 * Valid bcrypt hash used as a timing-safe fallback in validateUser().
 * Generated at module load so it is always structurally valid and forces
 * a full bcrypt computation (~250 ms), preventing username enumeration
 * via response-time side-channel.
 */
export const DUMMY_HASH = bcrypt.hashSync("__timing_dummy__", BCRYPT_ROUNDS);

export async function getUser(id: string): Promise<SafeUser | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ? stripPassword(user) : undefined;
}

export async function getUserByUsername(username: string): Promise<SafeUser | undefined> {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user ? stripPassword(user) : undefined;
}

export async function upsertUser(userData: UpsertUser): Promise<SafeUser> {
  const hashedPassword = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);
  const { password: _pw, ...rest } = userData;
  const [user] = await db
    .insert(users)
    .values({ ...rest, password: hashedPassword })
    .onConflictDoUpdate({
      target: users.id,
      set: { ...rest, password: hashedPassword, updatedAt: new Date() },
    })
    .returning();
  return stripPassword(user);
}

export async function createUser(userData: CreateUser): Promise<SafeUser> {
  const hashedPassword = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);
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
  return stripPassword(user);
}

export async function updateUser(
  id: string,
  userData: Omit<Partial<UpsertUser>, "role">
): Promise<SafeUser | undefined> {
  const passwordUpdate =
    userData &&
    Object.prototype.hasOwnProperty.call(userData, "password") &&
    typeof userData.password === "string"
      ? userData.password
      : undefined;

  const { password: _pw, role: _role, ...rest } = userData as typeof userData & {
    password?: unknown;
    role?: unknown;
  };
  const nextUserData: Omit<Partial<UpsertUser>, "role"> = {
    ...rest,
    ...(passwordUpdate ? { password: await bcrypt.hash(passwordUpdate, BCRYPT_ROUNDS) } : {}),
  };

  const [user] = await db
    .update(users)
    .set({ ...nextUserData, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user ? stripPassword(user) : undefined;
}

export async function setUserRole(id: string, role: string): Promise<SafeUser | undefined> {
  const validRoles = Object.values(UserRole) as string[];
  if (!validRoles.includes(role)) {
    throw new Error(`قيمة الدور غير صحيحة: "${role}". القيم المقبولة: ${validRoles.join(", ")}`);
  }
  const [user] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user ? stripPassword(user) : undefined;
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await db.delete(users).where(eq(users.id, id));
  return (result.rowCount || 0) > 0;
}

export async function getAllUsers(): Promise<SafeUser[]> {
  const rows = await db.select().from(users).orderBy(users.createdAt);
  return rows.map(stripPassword);
}

export async function validateUser(username: string, password: string): Promise<SafeUser | null> {
  const [user] = await db.select().from(users).where(eq(users.username, username));

  const hashToCompare = user?.password ?? DUMMY_HASH;
  const isValid = await bcrypt.compare(password, hashToCompare);

  if (!user || !user.isActive || !isValid) return null;
  return stripPassword(user);
}
