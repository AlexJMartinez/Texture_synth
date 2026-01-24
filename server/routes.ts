import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerAIRandomizeRoutes } from "./routes/ai-randomize";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // Register AI randomize routes
  registerAIRandomizeRoutes(app);

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  return httpServer;
}
