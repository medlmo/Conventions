import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireRole } from "../auth";
import { insertAdministrativeEventSchema, UserRole } from "@shared/schema";
import { z } from "zod";
import { logger } from "../logger";

/** Parse a route param as a positive integer; returns NaN if invalid. */
function parseId(value: string): number {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : NaN;
}

export function createEventsRouter(): Router {
  const router = Router({ mergeParams: true });

  // GET /api/conventions/:conventionId/administrative-events
  router.get("/", requireAuth, async (req, res) => {
    try {
      const conventionId = parseId(req.params.conventionId);
      if (isNaN(conventionId)) {
        return res.status(400).json({ message: "معرف الاتفاقية غير صحيح" });
      }
      const events = await storage.getAdministrativeEventsByConvention(conventionId);
      res.json(events);
    } catch (error) {
      logger.error({ err: error }, "Error fetching administrative events");
      res.status(500).json({ message: "خطأ في استرجاع الأحداث الإدارية" });
    }
  });

  // POST /api/conventions/:conventionId/administrative-events
  router.post("/", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const conventionId = parseId(req.params.conventionId);
      if (isNaN(conventionId)) {
        return res.status(400).json({ message: "معرف الاتفاقية غير صحيح" });
      }
      const eventData = insertAdministrativeEventSchema.parse({
        ...req.body,
        conventionId,
      });
      const event = await storage.createAdministrativeEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      logger.error({ err: error }, "Error creating administrative event");
      res.status(500).json({ message: "خطأ في إنشاء الحدث الإداري" });
    }
  });

  return router;
}

export function createEventItemRouter(): Router {
  const router = Router();

  // PUT /api/administrative-events/:id
  router.put("/:id", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "معرف غير صحيح" });
      }
      const eventData = insertAdministrativeEventSchema.partial().omit({ conventionId: true }).parse(req.body);
      const event = await storage.updateAdministrativeEvent(id, eventData);
      if (!event) {
        return res.status(404).json({ message: "الحدث الإداري غير موجود" });
      }
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      logger.error({ err: error }, "Error updating administrative event");
      res.status(500).json({ message: "خطأ في تحديث الحدث الإداري" });
    }
  });

  // DELETE /api/administrative-events/:id
  router.delete("/:id", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "معرف غير صحيح" });
      }
      await storage.deleteAdministrativeEvent(id);
      res.json({ message: "تم حذف الحدث الإداري بنجاح" });
    } catch (error) {
      logger.error({ err: error }, "Error deleting administrative event");
      res.status(500).json({ message: "خطأ في حذف الحدث الإداري" });
    }
  });

  return router;
}
