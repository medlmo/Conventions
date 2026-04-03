import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireRole } from "../auth";
import { createUserSchema, updateUserSchema, UserRole } from "@shared/schema";
import { z } from "zod";

export function createUsersRouter(): Router {
  const router = Router();

  router.get("/", requireAuth, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users.map((user) => ({
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive, // now a real boolean
        createdAt: user.createdAt,
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "خطأ في استرجاع المستخدمين" });
    }
  });

  router.post("/", requireAuth, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json({
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "خطأ في إنشاء المستخدم" });
    }
  });

  router.put("/:id", requireAuth, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { id } = req.params;
      // Use updateUserSchema which includes isActive as boolean
      const userData = updateUserSchema.parse(req.body);
      const updatedUser = await storage.updateUser(id, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        isActive: updatedUser.isActive,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "خطأ في تحديث المستخدم" });
    }
  });

  router.delete("/:id", requireAuth, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { id } = req.params;
      if (id === req.user!.id) {
        return res.status(400).json({ message: "لا يمكنك حذف حسابك الخاص" });
      }
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      res.json({ message: "تم حذف المستخدم بنجاح" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "خطأ في حذف المستخدم" });
    }
  });

  return router;
}
