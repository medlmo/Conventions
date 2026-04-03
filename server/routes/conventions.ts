import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireRole } from "../auth";
import { insertConventionSchema, UserRole } from "@shared/schema";
import { z } from "zod";

export function createConventionsRouter(): Router {
  const router = Router();

  // GET /api/conventions — All authenticated users can view
  router.get("/", requireAuth, async (req, res) => {
    try {
      const q = req.query as Record<string, unknown>;
      const search = typeof q.search === "string" ? q.search : undefined;
      const status = typeof q.status === "string" ? q.status : undefined;
      const sector = typeof q.sector === "string" ? q.sector : undefined;
      const programme = typeof q.programme === "string" ? q.programme : undefined;
      const domain = typeof q.domain === "string" ? q.domain : undefined;
      const limit = typeof q.limit === "string" && q.limit.trim() ? Number(q.limit) : undefined;
      const offset = typeof q.offset === "string" && q.offset.trim() ? Number(q.offset) : undefined;

      const conventions = await storage.getConventions({ search, status, sector, programme, domain, limit, offset });
      res.json(conventions);
    } catch (error) {
      console.error("Error fetching conventions:", error);
      res.status(500).json({ message: "خطأ في استرجاع الاتفاقيات" });
    }
  });

  // GET /api/conventions/search/:query
  router.get("/search/:query", requireAuth, async (req, res) => {
    try {
      const conventions = await storage.searchConventions(req.params.query);
      res.json(conventions);
    } catch (error) {
      console.error("Error searching conventions:", error);
      res.status(500).json({ message: "خطأ في البحث" });
    }
  });

  // GET /api/conventions/:id
  router.get("/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "معرف الاتفاقية غير صحيح" });
      }
      const convention = await storage.getConvention(id);
      if (!convention) {
        return res.status(404).json({ message: "الاتفاقية غير موجودة" });
      }
      res.json(convention);
    } catch (error) {
      console.error("Error fetching convention:", error);
      res.status(500).json({ message: "خطأ في استرجاع الاتفاقية" });
    }
  });

  // POST /api/conventions — Admin and Editor only
  router.post("/", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const validatedData = insertConventionSchema.parse(req.body);
      const convention = await storage.createConvention(validatedData, req.user!.id);
      res.status(201).json(convention);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error creating convention:", error);
      res.status(500).json({ message: "خطأ في إنشاء الاتفاقية" });
    }
  });

  // PUT /api/conventions/:id — Admin and Editor only
  router.put("/:id", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "معرف الاتفاقية غير صحيح" });
      }
      const validatedData = insertConventionSchema.partial().parse(req.body);
      const convention = await storage.updateConvention(id, validatedData);
      if (!convention) {
        return res.status(404).json({ message: "الاتفاقية غير موجودة" });
      }
      res.json(convention);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error updating convention:", error);
      res.status(500).json({ message: "خطأ في تحديث الاتفاقية" });
    }
  });

  // DELETE /api/conventions/:id — Admin and Editor only
  router.delete("/:id", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "معرف الاتفاقية غير صحيح" });
      }
      const deleted = await storage.deleteConvention(id);
      if (!deleted) {
        return res.status(404).json({ message: "الاتفاقية غير موجودة" });
      }
      res.json({ message: "تم حذف الاتفاقية بنجاح" });
    } catch (error) {
      console.error("Error deleting convention:", error);
      res.status(500).json({ message: "خطأ في حذف الاتفاقية" });
    }
  });

  return router;
}
