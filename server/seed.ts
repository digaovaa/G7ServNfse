import { db } from "./db";
import { nfseMetadata } from "@shared/schema";

const sampleNfseData = [
  {
    id: "nfse-001",
    numeroNfse: "2024001234",
    cnpjPrestador: "12345678000195",
    nomePrestador: "Empresa Contabil LTDA",
    cnpjTomador: "98765432000188",
    nomeTomador: "Condominio Residencial Aurora",
    dataEmissao: "2024-12-01",
    valorServico: "1500.00",
    valorTotal: "1575.00",
    descricaoServico: "Servicos de administracao condominial",
    status: "emitida",
    arquivoPdfPath: null,
    arquivoXmlPath: null,
  },
  {
    id: "nfse-002",
    numeroNfse: "2024001235",
    cnpjPrestador: "12345678000195",
    nomePrestador: "Empresa Contabil LTDA",
    cnpjTomador: "98765432000188",
    nomeTomador: "Condominio Residencial Aurora",
    dataEmissao: "2024-11-01",
    valorServico: "1500.00",
    valorTotal: "1575.00",
    descricaoServico: "Servicos de administracao condominial",
    status: "emitida",
    arquivoPdfPath: null,
    arquivoXmlPath: null,
  },
  {
    id: "nfse-003",
    numeroNfse: "2024001236",
    cnpjPrestador: "12345678000195",
    nomePrestador: "Empresa Contabil LTDA",
    cnpjTomador: "98765432000188",
    nomeTomador: "Condominio Residencial Aurora",
    dataEmissao: "2024-10-01",
    valorServico: "1500.00",
    valorTotal: "1575.00",
    descricaoServico: "Servicos de administracao condominial",
    status: "emitida",
    arquivoPdfPath: null,
    arquivoXmlPath: null,
  },
  {
    id: "nfse-004",
    numeroNfse: "2024001300",
    cnpjPrestador: "12345678000195",
    nomePrestador: "Empresa Contabil LTDA",
    cnpjTomador: "11222333000144",
    nomeTomador: "Condominio Edificio Solar",
    dataEmissao: "2024-12-05",
    valorServico: "2200.00",
    valorTotal: "2310.00",
    descricaoServico: "Servicos de consultoria fiscal",
    status: "emitida",
    arquivoPdfPath: null,
    arquivoXmlPath: null,
  },
  {
    id: "nfse-005",
    numeroNfse: "2024001301",
    cnpjPrestador: "12345678000195",
    nomePrestador: "Empresa Contabil LTDA",
    cnpjTomador: "11222333000144",
    nomeTomador: "Condominio Edificio Solar",
    dataEmissao: "2024-11-05",
    valorServico: "2200.00",
    valorTotal: "2310.00",
    descricaoServico: "Servicos de consultoria fiscal",
    status: "emitida",
    arquivoPdfPath: null,
    arquivoXmlPath: null,
  },
  {
    id: "nfse-006",
    numeroNfse: "2024001400",
    cnpjPrestador: "12345678000195",
    nomePrestador: "Empresa Contabil LTDA",
    cnpjTomador: "55666777000122",
    nomeTomador: "Condominio Vila Verde",
    dataEmissao: "2024-12-10",
    valorServico: "1800.00",
    valorTotal: "1890.00",
    descricaoServico: "Assessoria contabil mensal",
    status: "emitida",
    arquivoPdfPath: null,
    arquivoXmlPath: null,
  },
];

async function seed() {
  console.log("Seeding NFS-e data...");

  for (const nfse of sampleNfseData) {
    try {
      await db.insert(nfseMetadata).values(nfse).onConflictDoNothing();
      console.log(`Inserted NFS-e: ${nfse.numeroNfse}`);
    } catch (error) {
      console.error(`Error inserting NFS-e ${nfse.numeroNfse}:`, error);
    }
  }

  console.log("Seed complete!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
