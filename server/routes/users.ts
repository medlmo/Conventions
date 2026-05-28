import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireRole } from "../auth";
import { createUserSchema, updateUserSchema, UserRole } from "@shared/schema";
import { z } from "zod";
import { audit, logger } from "../logger";

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
        isActive: user.isActive,
        createdAt: user.createdAt,
      }));
      res.json(safeUsers);
    } catch (error) {
      logger.error({ err: error }, "Error fetching users");
      res.status(500).json({ message: "خطأ في استرجاع المستخدمين" });
    }
  });

  router.post("/", requireAuth, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      audit("user.create", req.user!.id, { targetUserId: user.id, username: user.username, role: user.role });
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
      logger.error({ err: error }, "Error creating user");
      res.status(500).json({ message: "خطأ في إنشاء المستخدم" });
    }
  });

  router.put("/:id", requireAuth, requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { id } = req.params;
      const { role, ...profileFields } = updateUserSchema.parse(req.body);

      // Update profile fields (role is structurally excluded from updateUser).
      let updatedUser = await storage.updateUser(id, profileFields);
      if (!updatedUser) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }

      // Role changes go through an explicit, auditable path.
      if (role !== undefined) {
        updatedUser = (await storage.setUserRole(id, role)) ?? updatedUser;
        audit("user.role_change", req.user!.id, { targetUserId: id, newRole: role });
      }

      audit("user.update", req.user!.id, { targetUserId: id, changes: Object.keys(profileFields) });
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
      logger.error({ err: error }, "Error updating user");
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
      audit("user.delete", req.user!.id, { targetUserId: id });
      res.json({ message: "تم حذف المستخدم بنجاح" });
    } catch (error) {
      logger.error({ err: error }, "Error deleting user");
      res.status(500).json({ message: "خطأ في حذف المستخدم" });
    }
  });

  return router;
}
