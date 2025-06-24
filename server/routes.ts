import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConventionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all conventions
  app.get("/api/conventions", async (req, res) => {
    try {
      const conventions = await storage.getAllConventions();
      res.json(conventions);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع الاتفاقيات" });
    }
  });

  // Get convention by ID
  app.get("/api/conventions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const convention = await storage.getConvention(id);
      if (!convention) {
        return res.status(404).json({ message: "الاتفاقية غير موجودة" });
      }
      res.json(convention);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع الاتفاقية" });
    }
  });

  // Create new convention
  app.post("/api/conventions", async (req, res) => {
    try {
      const validatedData = insertConventionSchema.parse(req.body);
      const convention = await storage.createConvention(validatedData);
      res.status(201).json(convention);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في إنشاء الاتفاقية" });
    }
  });

  // Update convention
  app.put("/api/conventions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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
      res.status(500).json({ message: "خطأ في تحديث الاتفاقية" });
    }
  });

  // Delete convention
  app.delete("/api/conventions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteConvention(id);
      if (!deleted) {
        return res.status(404).json({ message: "الاتفاقية غير موجودة" });
      }
      res.json({ message: "تم حذف الاتفاقية بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في حذف الاتفاقية" });
    }
  });

  // Search conventions
  app.get("/api/conventions/search/:query", async (req, res) => {
    try {
      const query = req.params.query;
      const conventions = await storage.searchConventions(query);
      res.json(conventions);
    } catch (error) {
      res.status(500).json({ message: "خطأ في البحث" });
    }
  });

  // Get conventions statistics
  app.get("/api/conventions/stats", async (req, res) => {
    try {
      const allConventions = await storage.getAllConventions();
      const total = allConventions.length;
      const active = allConventions.filter(c => c.status === "نشطة").length;
      const pending = allConventions.filter(c => c.status === "معلقة").length;
      const totalValue = allConventions.reduce((sum, c) => sum + parseFloat(c.amount), 0);

      res.json({
        total,
        active,
        pending,
        totalValue: totalValue.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' })
      });
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع الإحصائيات" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
