import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireRole } from "../auth";
import { insertFinancialContributionSchema, UserRole } from "@shared/schema";
import { z } from "zod";
import { logger } from "../logger";

/** Parse a route param as a positive integer; returns NaN if invalid. */
function parseId(value: string): number {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : NaN;
}

export function createFinancialsRouter(): Router {
  const router = Router({ mergeParams: true });

  // GET /api/conventions/:conventionId/financial-contributions
  router.get("/", requireAuth, async (req, res) => {
    try {
      const conventionId = parseId(req.params.conventionId);
      if (isNaN(conventionId)) {
        return res.status(400).json({ message: "معرف الاتفاقية غير صحيح" });
      }
      const contributions = await storage.getFinancialContributionsByConvention(conventionId);
      res.json(contributions);
    } catch (error) {
      logger.error({ err: error }, "Error fetching financial contributions");
      res.status(500).json({ message: "خطأ في استرجاع المساهمات المالية" });
    }
  });

  // POST /api/conventions/:conventionId/financial-contributions
  router.post("/", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const conventionId = parseId(req.params.conventionId);
      if (isNaN(conventionId)) {
        return res.status(400).json({ message: "معرف الاتفاقية غير صحيح" });
      }
      const contributionData = insertFinancialContributionSchema.parse({
        ...req.body,
        conventionId,
      });
      const contribution = await storage.createFinancialContribution(contributionData);
      res.status(201).json(contribution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      logger.error({ err: error }, "Error creating financial contribution");
      res.status(500).json({ message: "خطأ في إنشاء المساهمة المالية" });
    }
  });

  return router;
}

export function createFinancialItemRouter(): Router {
  const router = Router();

  // PUT /api/financial-contributions/:id
  router.put("/:id", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "معرف غير صحيح" });
      }
      const contributionData = insertFinancialContributionSchema.partial().parse(req.body);
      const contribution = await storage.updateFinancialContribution(id, contributionData);
      if (!contribution) {
        return res.status(404).json({ message: "المساهمة المالية غير موجودة" });
      }
      res.json(contribution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      logger.error({ err: error }, "Error updating financial contribution");
      res.status(500).json({ message: "خطأ في تحديث المساهمة المالية" });
    }
  });

  // DELETE /api/financial-contributions/:id
  router.delete("/:id", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "معرف غير صحيح" });
      }
      await storage.deleteFinancialContribution(id);
      res.json({ message: "تم حذف المساهمة المالية بنجاح" });
    } catch (error) {
      logger.error({ err: error }, "Error deleting financial contribution");
      res.status(500).json({ message: "خطأ في حذف المساهمة المالية" });
    }
  });

  return router;
}
