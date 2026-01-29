import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  date,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table with role-based access (admin, operador)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).default("operador").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// NFS-e metadata table
export const nfseMetadata = pgTable(
  "nfse_metadata",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    numeroNfse: integer("numero_nfse"),
    cnpjPrestador: varchar("cnpj_prestador", { length: 18 }),
    cnpjTomador: varchar("cnpj_tomador", { length: 18 }).notNull(),
    nomeTomador: varchar("nome_tomador", { length: 255 }),
    dataEmissao: date("data_emissao"),
    valor: decimal("valor", { precision: 10, scale: 2 }),
    descricao: text("descricao"),
    chaveAcesso: varchar("chave_acesso", { length: 50 }).unique(),
    statusNfse: varchar("status_nfse", { length: 20 }).default("emitida"),
    arquivoPdfPath: varchar("arquivo_pdf_path"),
    arquivoXmlPath: varchar("arquivo_xml_path"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_nfse_cnpj_tomador").on(table.cnpjTomador),
    index("idx_nfse_data_emissao").on(table.dataEmissao),
  ]
);

// System configuration table for persistent settings (certificates, etc.)
export const systemConfig = pgTable("system_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"), // For text values
  binaryValue: text("binary_value"), // Base64 encoded binary data (certificates)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Download logs table for audit trail
export const downloadLogs = pgTable(
  "download_logs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id),
    nfseId: varchar("nfse_id").references(() => nfseMetadata.id),
    tipoDownload: varchar("tipo_download", { length: 20 }),
    dataDownload: timestamp("data_download").defaultNow(),
    arquivoNome: varchar("arquivo_nome", { length: 255 }),
    cnpjTomador: varchar("cnpj_tomador", { length: 18 }),
    nomeTomador: varchar("nome_tomador", { length: 255 }),
  },
  (table) => [
    index("idx_download_logs_user").on(table.userId),
    index("idx_download_logs_date").on(table.dataDownload),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  downloadLogs: many(downloadLogs),
}));

export const nfseMetadataRelations = relations(nfseMetadata, ({ many }) => ({
  downloadLogs: many(downloadLogs),
}));

export const downloadLogsRelations = relations(downloadLogs, ({ one }) => ({
  user: one(users, {
    fields: [downloadLogs.userId],
    references: [users.id],
  }),
  nfse: one(nfseMetadata, {
    fields: [downloadLogs.nfseId],
    references: [nfseMetadata.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNfseMetadataSchema = createInsertSchema(nfseMetadata).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDownloadLogSchema = createInsertSchema(downloadLogs).omit({
  id: true,
  dataDownload: true,
});

// CNPJ validation schema
export const cnpjSearchSchema = z.object({
  cnpj: z
    .string()
    .min(14, "CNPJ deve ter 14 dígitos")
    .max(18, "CNPJ inválido")
    .transform((val) => val.replace(/\D/g, "")),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
});

export const batchDownloadSchema = z.object({
  nfseIds: z.array(z.string()).min(1, "Selecione pelo menos uma nota"),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertNfseMetadata = z.infer<typeof insertNfseMetadataSchema>;
export type NfseMetadata = typeof nfseMetadata.$inferSelect;
export type InsertDownloadLog = z.infer<typeof insertDownloadLogSchema>;
export type DownloadLog = typeof downloadLogs.$inferSelect;
