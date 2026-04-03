import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireRole } from "../auth";
import { insertAdministrativeEventSchema, UserRole } from "@shared/schema";
import { z } from "zod";

export function createEventsRouter(): Router {
  const router = Router({ mergeParams: true });

  // GET /api/conventions/:conventionId/administrative-events
  router.get("/", requireAuth, async (req, res) => {
    try {
      const { conventionId } = req.params;
      const events = await storage.getAdministrativeEventsByConvention(parseInt(conventionId));
      res.json(events);
    } catch (error) {
      console.error("Error fetching administrative events:", error);
      res.status(500).json({ message: "خطأ في استرجاع الأحداث الإدارية" });
    }
  });

  // POST /api/conventions/:conventionId/administrative-events
  router.post("/", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const { conventionId } = req.params;
      const eventData = insertAdministrativeEventSchema.parse({
        ...req.body,
        conventionId: parseInt(conventionId),
      });
      const event = await storage.createAdministrativeEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error creating administrative event:", error);
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
      const { id } = req.params;
      const eventData = insertAdministrativeEventSchema.partial().omit({ conventionId: true }).parse(req.body);
      const event = await storage.updateAdministrativeEvent(parseInt(id), eventData);
      if (!event) {
        return res.status(404).json({ message: "الحدث الإداري غير موجود" });
      }
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error updating administrative event:", error);
      res.status(500).json({ message: "خطأ في تحديث الحدث الإداري" });
    }
  });

  // DELETE /api/administrative-events/:id
  router.delete("/:id", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAdministrativeEvent(parseInt(id));
      res.json({ message: "تم حذف الحدث الإداري بنجاح" });
    } catch (error) {
      console.error("Error deleting administrative event:", error);
      res.status(500).json({ message: "خطأ في حذف الحدث الإداري" });
    }
  });

  return router;
}
