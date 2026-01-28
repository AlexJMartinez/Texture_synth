import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPresetSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Preset API routes
  
  // Get all presets
  app.get("/api/presets", async (req, res) => {
    try {
      const presets = await storage.getAllPresets();
      res.json(presets);
    } catch (error) {
      console.error("Error fetching presets:", error);
      res.status(500).json({ error: "Failed to fetch presets" });
    }
  });

  // Create a new preset
  app.post("/api/presets", async (req, res) => {
    try {
      const parsed = insertPresetSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid preset data", details: parsed.error });
      }
      const preset = await storage.createPreset(parsed.data);
      res.status(201).json(preset);
    } catch (error) {
      console.error("Error creating preset:", error);
      res.status(500).json({ error: "Failed to create preset" });
    }
  });

  // Delete a preset
  app.delete("/api/presets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid preset ID" });
      }
      const deleted = await storage.deletePreset(id);
      if (!deleted) {
        return res.status(404).json({ error: "Preset not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting preset:", error);
      res.status(500).json({ error: "Failed to delete preset" });
    }
  });

  return httpServer;
}
