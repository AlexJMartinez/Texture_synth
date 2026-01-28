import { users, presets, type User, type InsertUser, type DbPreset, type InsertPreset } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Preset operations
  getAllPresets(): Promise<DbPreset[]>;
  getPreset(id: number): Promise<DbPreset | undefined>;
  createPreset(preset: InsertPreset): Promise<DbPreset>;
  deletePreset(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllPresets(): Promise<DbPreset[]> {
    return db.select().from(presets).orderBy(desc(presets.createdAt));
  }

  async getPreset(id: number): Promise<DbPreset | undefined> {
    const [preset] = await db.select().from(presets).where(eq(presets.id, id));
    return preset || undefined;
  }

  async createPreset(preset: InsertPreset): Promise<DbPreset> {
    const [created] = await db.insert(presets).values(preset).returning();
    return created;
  }

  async deletePreset(id: number): Promise<boolean> {
    const result = await db.delete(presets).where(eq(presets.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
