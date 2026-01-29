import {
  users,
  nfseMetadata,
  downloadLogs,
  systemConfig,
  type User,
  type UpsertUser,
  type NfseMetadata,
  type InsertNfseMetadata,
  type DownloadLog,
  type InsertDownloadLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // NFS-e operations
  getNfseById(id: string): Promise<NfseMetadata | undefined>;
  getNfseByCnpj(
    cnpjTomador: string,
    dataInicio?: string,
    dataFim?: string
  ): Promise<NfseMetadata[]>;
  createNfse(nfse: InsertNfseMetadata): Promise<NfseMetadata>;
  getNfseByIds(ids: string[]): Promise<NfseMetadata[]>;
  getRecentNfse(limit: number): Promise<NfseMetadata[]>;

  // Download log operations
  createDownloadLog(log: InsertDownloadLog): Promise<DownloadLog>;
  getDownloadLogsByUser(userId: string): Promise<DownloadLog[]>;

  // System config operations
  saveConfig(key: string, value?: string, binaryValue?: string): Promise<void>;
  getConfig(key: string): Promise<{ value?: string; binaryValue?: string } | null>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First try to find existing user by id or email
    const existingById = userData.id ? await db
      .select()
      .from(users)
      .where(eq(users.id, userData.id))
      .then(rows => rows[0]) : undefined;

    const existingByEmail = userData.email ? await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
      .then(rows => rows[0]) : undefined;

    // Don't overwrite role if user already exists (preserve admin status)
    const updateData = {
      ...userData,
      updatedAt: new Date(),
    };
    // Remove role from update to preserve existing role
    delete (updateData as any).role;

    if (existingById) {
      // Update existing user by id (preserve role)
      const [user] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userData.id!))
        .returning();
      return user;
    } else if (existingByEmail) {
      // Update existing user by email (preserve role)
      const [user] = await db
        .update(users)
        .set({
          id: userData.id,
          ...updateData,
        })
        .where(eq(users.email, userData.email!))
        .returning();
      return user;
    } else {
      // Insert new user with default role
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    }
  }

  // NFS-e operations
  async getNfseById(id: string): Promise<NfseMetadata | undefined> {
    const [nfse] = await db
      .select()
      .from(nfseMetadata)
      .where(eq(nfseMetadata.id, id));
    return nfse;
  }

  async getNfseByCnpj(
    cnpjTomador: string,
    dataInicio?: string,
    dataFim?: string
  ): Promise<NfseMetadata[]> {
    const conditions = [eq(nfseMetadata.cnpjTomador, cnpjTomador)];

    if (dataInicio) {
      conditions.push(gte(nfseMetadata.dataEmissao, dataInicio));
    }
    if (dataFim) {
      conditions.push(lte(nfseMetadata.dataEmissao, dataFim));
    }

    const results = await db
      .select()
      .from(nfseMetadata)
      .where(and(...conditions))
      .orderBy(desc(nfseMetadata.dataEmissao));

    return results;
  }

  async createNfse(nfse: InsertNfseMetadata): Promise<NfseMetadata> {
    const [created] = await db.insert(nfseMetadata).values(nfse).returning();
    return created;
  }

  async getNfseByIds(ids: string[]): Promise<NfseMetadata[]> {
    if (ids.length === 0) return [];

    const results: NfseMetadata[] = [];
    for (const id of ids) {
      const nfse = await this.getNfseById(id);
      if (nfse) results.push(nfse);
    }
    return results;
  }

  async getRecentNfse(limit: number): Promise<NfseMetadata[]> {
    const results = await db
      .select()
      .from(nfseMetadata)
      .orderBy(desc(nfseMetadata.createdAt))
      .limit(limit);
    return results;
  }

  // Download log operations
  async createDownloadLog(log: InsertDownloadLog): Promise<DownloadLog> {
    const [created] = await db.insert(downloadLogs).values(log).returning();
    return created;
  }

  async getDownloadLogsByUser(userId: string): Promise<DownloadLog[]> {
    const results = await db
      .select()
      .from(downloadLogs)
      .where(eq(downloadLogs.userId, userId))
      .orderBy(desc(downloadLogs.dataDownload))
      .limit(100);
    return results;
  }

  // System config operations
  async saveConfig(key: string, value?: string, binaryValue?: string): Promise<void> {
    await db
      .insert(systemConfig)
      .values({ key, value, binaryValue, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemConfig.key,
        set: { value, binaryValue, updatedAt: new Date() },
      });
  }

  async getConfig(key: string): Promise<{ value?: string; binaryValue?: string } | null> {
    const [result] = await db
      .select({ value: systemConfig.value, binaryValue: systemConfig.binaryValue })
      .from(systemConfig)
      .where(eq(systemConfig.key, key));
    if (!result) return null;
    return { value: result.value ?? undefined, binaryValue: result.binaryValue ?? undefined };
  }
}

export const storage = new DatabaseStorage();
