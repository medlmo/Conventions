import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireRole } from "../auth";
import { insertFinancialContributionSchema, UserRole } from "@shared/schema";
import { z } from "zod";

export function createFinancialsRouter(): Router {
  const router = Router({ mergeParams: true });

  // GET /api/conventions/:conventionId/financial-contributions
  router.get("/", requireAuth, async (req, res) => {
    try {
      const { conventionId } = req.params;
      const contributions = await storage.getFinancialContributionsByConvention(parseInt(conventionId));
      res.json(contributions);
    } catch (error) {
      console.error("Error fetching financial contributions:", error);
      res.status(500).json({ message: "خطأ في استرجاع المساهمات المالية" });
    }
  });

  // POST /api/conventions/:conventionId/financial-contributions
  router.post("/", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const { conventionId } = req.params;
      const contributionData = insertFinancialContributionSchema.parse({
        ...req.body,
        conventionId: parseInt(conventionId),
      });
      const contribution = await storage.createFinancialContribution(contributionData);
      res.status(201).json(contribution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error creating financial contribution:", error);
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
      const { id } = req.params;
      const contributionData = insertFinancialContributionSchema.partial().parse(req.body);
      const contribution = await storage.updateFinancialContribution(parseInt(id), contributionData);
      if (!contribution) {
        return res.status(404).json({ message: "المساهمة المالية غير موجودة" });
      }
      res.json(contribution);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error updating financial contribution:", error);
      res.status(500).json({ message: "خطأ في تحديث المساهمة المالية" });
    }
  });

  // DELETE /api/financial-contributions/:id
  router.delete("/:id", requireAuth, requireRole([UserRole.ADMIN, UserRole.EDITOR]), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFinancialContribution(parseInt(id));
      res.json({ message: "تم حذف المساهمة المالية بنجاح" });
    } catch (error) {
      console.error("Error deleting financial contribution:", error);
      res.status(500).json({ message: "خطأ في حذف المساهمة المالية" });
    }
  });

  return router;
}
