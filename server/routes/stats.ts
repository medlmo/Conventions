import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";

export function createStatsRouter(): Router {
  const router = Router();

  // Global stats — uses DB aggregation (#9 fix)
  router.get("/", requireAuth, async (_req, res) => {
    try {
      const stats = await storage.getGlobalStats();
      const totalValueFormatted = Number(stats.totalValue).toLocaleString("fr-FR", {
        style: "currency",
        currency: "MAD",
      });
      res.json({ ...stats, totalValue: totalValueFormatted });
    } catch (error) {
      console.error("Erreur stats globales:", error);
      res.status(500).json({ message: "Erreur statistiques globales" });
    }
  });

  router.get("/by-sector", requireAuth, async (_req, res) => {
    try {
      const result = await storage.getStatsBySector();
      res.json(result);
    } catch (error) {
      console.error("Erreur stats by-sector:", error);
      res.status(500).json({ message: "Erreur statistiques secteur" });
    }
  });

  router.get("/by-status", requireAuth, async (_req, res) => {
    try {
      const result = await storage.getStatsByStatus();
      res.json(result);
    } catch (error) {
      console.error("Erreur stats by-status:", error);
      res.status(500).json({ message: "Erreur statistiques statut" });
    }
  });

  router.get("/by-sector-cost", requireAuth, async (_req, res) => {
    try {
      const raw = await storage.getStatsBySectorCost();
      const result = raw.map(({ sector, amount }) => ({ sector, الكلفة: amount }));
      res.json(result);
    } catch (error) {
      console.error("Erreur stats by-sector-cost:", error);
      res.status(500).json({ message: "Erreur statistiques montant secteur" });
    }
  });

  router.get("/by-domain", requireAuth, async (_req, res) => {
    try {
      const result = await storage.getStatsByDomain();
      res.json(result);
    } catch (error) {
      console.error("Erreur stats by-domain:", error);
      res.status(500).json({ message: "Erreur statistiques المجال" });
    }
  });

  router.get("/by-province", requireAuth, async (_req, res) => {
    try {
      const result = await storage.getStatsByProvince();
      res.json(result);
    } catch (error) {
      console.error("Erreur stats by-province:", error);
      res.status(500).json({ message: "Erreur statistiques العمالة/الإقليم" });
    }
  });

  router.get("/by-year", requireAuth, async (_req, res) => {
    try {
      const raw = await storage.getStatsByYear();
      const result = raw.map(({ year, count }) => ({ year, العدد: count }));
      res.json(result);
    } catch (error) {
      console.error("Erreur stats by-year:", error);
      res.status(500).json({ message: "Erreur statistiques السنة" });
    }
  });

  router.get("/by-programme", requireAuth, async (_req, res) => {
    try {
      const result = await storage.getStatsByProgramme();
      res.json(result);
    } catch (error) {
      console.error("Erreur stats by-programme:", error);
      res.status(500).json({ message: "Erreur statistiques البرنامج" });
    }
  });

  return router;
}
