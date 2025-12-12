import {
  users,
  nfseMetadata,
  downloadLogs,
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

  // Download log operations
  createDownloadLog(log: InsertDownloadLog): Promise<DownloadLog>;
  getDownloadLogsByUser(userId: string): Promise<DownloadLog[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
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
}

export const storage = new DatabaseStorage();
