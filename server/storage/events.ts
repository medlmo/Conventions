import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  administrativeEvents,
  type AdministrativeEvent,
  type InsertAdministrativeEvent,
} from "@shared/schema";

export async function getAdministrativeEventsByConvention(
  conventionId: number
): Promise<AdministrativeEvent[]> {
  return await db
    .select()
    .from(administrativeEvents)
    .where(eq(administrativeEvents.conventionId, conventionId))
    .orderBy(administrativeEvents.eventDate);
}

export async function createAdministrativeEvent(
  eventData: InsertAdministrativeEvent
): Promise<AdministrativeEvent> {
  const [event] = await db.insert(administrativeEvents).values(eventData).returning();
  return event;
}

export async function updateAdministrativeEvent(
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

export async function deleteAdministrativeEvent(id: number): Promise<boolean> {
  const result = await db.delete(administrativeEvents).where(eq(administrativeEvents.id, id));
  return (result.rowCount || 0) > 0;
}
