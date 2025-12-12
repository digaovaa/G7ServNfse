import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { cnpjSearchSchema, batchDownloadSchema } from "@shared/schema";
import archiver from "archiver";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // NFS-e search endpoint
  app.get("/api/nfse", isAuthenticated, async (req: any, res) => {
    try {
      const { cnpj, dataInicio, dataFim } = req.query;

      if (!cnpj) {
        return res.status(400).json({ message: "CNPJ é obrigatório" });
      }

      const cleanCnpj = String(cnpj).replace(/\D/g, "");

      if (cleanCnpj.length !== 14) {
        return res.status(400).json({ message: "CNPJ deve ter 14 dígitos" });
      }

      const nfseList = await storage.getNfseByCnpj(
        cleanCnpj,
        dataInicio as string | undefined,
        dataFim as string | undefined
      );

      res.json(nfseList);
    } catch (error) {
      console.error("Error searching NFS-e:", error);
      res.status(500).json({ message: "Erro ao buscar NFS-e" });
    }
  });

  // Individual download endpoint
  app.get("/api/nfse/:id/download", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { tipo } = req.query;
      const userId = req.user.claims.sub;

      if (!tipo || !["pdf", "xml"].includes(tipo as string)) {
        return res.status(400).json({ message: "Tipo deve ser 'pdf' ou 'xml'" });
      }

      const nfse = await storage.getNfseById(id);
      if (!nfse) {
        return res.status(404).json({ message: "NFS-e não encontrada" });
      }

      const filePath = tipo === "pdf" ? nfse.arquivoPdfPath : nfse.arquivoXmlPath;
      if (!filePath) {
        return res.status(404).json({ message: `Arquivo ${tipo.toUpperCase()} não disponível` });
      }

      const objectStorageService = new ObjectStorageService();
      
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(filePath);
        
        // Generate standardized filename
        const cleanCnpj = nfse.cnpjTomador.replace(/\D/g, "");
        const cleanName = (nfse.nomeTomador || "Tomador")
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .replace(/\s+/g, "_")
          .slice(0, 30);
        const date = nfse.dataEmissao || new Date().toISOString().split("T")[0];
        const filename = `${cleanCnpj}_${cleanName}_${date}_NFS-e.${tipo}`;

        // Log the download
        await storage.createDownloadLog({
          userId,
          nfseId: id,
          tipoDownload: tipo as string,
          arquivoNome: filename,
          cnpjTomador: nfse.cnpjTomador,
          nomeTomador: nfse.nomeTomador,
        });

        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        await objectStorageService.downloadObject(objectFile, res);
      } catch (error) {
        if (error instanceof ObjectNotFoundError) {
          return res.status(404).json({ message: "Arquivo não encontrado no storage" });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error downloading NFS-e:", error);
      res.status(500).json({ message: "Erro ao baixar arquivo" });
    }
  });

  // Batch download endpoint
  app.post("/api/nfse/batch-download", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validation = batchDownloadSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: validation.error.errors 
        });
      }

      const { nfseIds } = validation.data;
      const nfseList = await storage.getNfseByIds(nfseIds);

      if (nfseList.length === 0) {
        return res.status(404).json({ message: "Nenhuma NFS-e encontrada" });
      }

      const objectStorageService = new ObjectStorageService();
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const zipFilename = `Download_Lote_${timestamp}.zip`;

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

      const archive = archiver("zip", { zlib: { level: 5 } });
      archive.pipe(res);

      for (const nfse of nfseList) {
        if (nfse.arquivoPdfPath) {
          try {
            const objectFile = await objectStorageService.getObjectEntityFile(
              nfse.arquivoPdfPath
            );
            
            const cleanCnpj = nfse.cnpjTomador.replace(/\D/g, "");
            const cleanName = (nfse.nomeTomador || "Tomador")
              .replace(/[^a-zA-Z0-9\s]/g, "")
              .replace(/\s+/g, "_")
              .slice(0, 30);
            const date = nfse.dataEmissao || now.toISOString().split("T")[0];
            const filename = `${cleanCnpj}_${cleanName}_${date}_NFS-e.pdf`;

            const stream = objectFile.createReadStream();
            archive.append(stream, { name: filename });
          } catch (error) {
            console.error(`Error adding file for NFS-e ${nfse.id}:`, error);
          }
        }
      }

      // Log batch download
      await storage.createDownloadLog({
        userId,
        nfseId: null,
        tipoDownload: "lote",
        arquivoNome: zipFilename,
        cnpjTomador: nfseList[0]?.cnpjTomador || null,
        nomeTomador: `${nfseList.length} notas`,
      });

      await archive.finalize();
    } catch (error) {
      console.error("Error creating batch download:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Erro ao gerar arquivo ZIP" });
      }
    }
  });

  // Download history endpoint
  app.get("/api/download-history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getDownloadLogsByUser(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching download history:", error);
      res.status(500).json({ message: "Erro ao buscar histórico" });
    }
  });

  // Public objects endpoint
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Private objects endpoint
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Admin authorization middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Não autorizado" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Acesso restrito a administradores" });
      }
      next();
    } catch (error) {
      res.status(500).json({ message: "Erro ao verificar permissões" });
    }
  };

  // Admin endpoints
  app.get("/api/admin/nfse-recent", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const nfseList = await storage.getRecentNfse(20);
      res.json(nfseList);
    } catch (error) {
      console.error("Error fetching recent NFS-e:", error);
      res.status(500).json({ message: "Erro ao buscar NFS-e recentes" });
    }
  });

  app.post(
    "/api/admin/nfse",
    isAuthenticated,
    isAdmin,
    upload.fields([
      { name: "pdf", maxCount: 1 },
      { name: "xml", maxCount: 1 },
    ]),
    async (req: any, res) => {
      try {
        const {
          numeroNfse,
          cnpjPrestador,
          cnpjTomador,
          nomeTomador,
          dataEmissao,
          valor,
          descricao,
          statusNfse,
        } = req.body;

        // Validate required fields
        if (!cnpjTomador || !numeroNfse || !dataEmissao) {
          return res.status(400).json({ message: "Campos obrigatórios faltando" });
        }

        const cleanCnpj = String(cnpjTomador).replace(/\D/g, "");
        if (cleanCnpj.length !== 14) {
          return res.status(400).json({ message: "CNPJ do tomador inválido" });
        }

        const parsedNumeroNfse = parseInt(String(numeroNfse), 10);
        if (isNaN(parsedNumeroNfse)) {
          return res.status(400).json({ message: "Número da NFS-e inválido" });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dataEmissao)) {
          return res.status(400).json({ message: "Data de emissão inválida (formato: YYYY-MM-DD)" });
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const objectStorageService = new ObjectStorageService();
        let arquivoPdfPath: string | null = null;
        let arquivoXmlPath: string | null = null;

        if (files?.pdf?.[0]) {
          const pdfFile = files.pdf[0];
          const relativePath = `nfse/${cleanCnpj}/${dataEmissao}_${parsedNumeroNfse}.pdf`;
          arquivoPdfPath = await objectStorageService.uploadToPrivate(relativePath, pdfFile.buffer);
        }

        if (files?.xml?.[0]) {
          const xmlFile = files.xml[0];
          const relativePath = `nfse/${cleanCnpj}/${dataEmissao}_${parsedNumeroNfse}.xml`;
          arquivoXmlPath = await objectStorageService.uploadToPrivate(relativePath, xmlFile.buffer);
        }

        const nfse = await storage.createNfse({
          numeroNfse: parsedNumeroNfse,
          cnpjPrestador: cnpjPrestador ? String(cnpjPrestador).replace(/\D/g, "") : null,
          cnpjTomador: cleanCnpj,
          nomeTomador: nomeTomador || null,
          dataEmissao: dataEmissao,
          valor: valor ? String(valor) : null,
          descricao: descricao || null,
          statusNfse: statusNfse || "emitida",
          arquivoPdfPath,
          arquivoXmlPath,
        });

        res.json(nfse);
      } catch (error) {
        console.error("Error creating NFS-e:", error);
        res.status(500).json({ message: "Erro ao criar NFS-e" });
      }
    }
  );

  return httpServer;
}
