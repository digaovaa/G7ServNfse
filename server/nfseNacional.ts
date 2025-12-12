import * as https from "https";
import * as fs from "fs";
import * as forge from "node-forge";
import { gunzipSync } from "zlib";

const BASE_URL_PROD = "https://www.nfse.gov.br/api";
const BASE_URL_HOMOLOG = "https://www.producaorestrita.nfse.gov.br/api";

export interface CertificadoConfig {
  pfxBuffer: Buffer;
  senha: string;
}

export interface NfseNacionalResult {
  chaveAcesso: string;
  numero: string;
  dataEmissao: string;
  competencia: string;
  valor: number;
  cnpjPrestador: string;
  razaoSocialPrestador: string;
  cnpjTomador: string;
  razaoSocialTomador: string;
  descricaoServico: string;
  municipio: string;
  xml?: string;
}

export interface DistribuicaoParams {
  cnpjInteressado: string;
  ultNsu?: string;
  nsu?: string;
}

export class NfseNacionalService {
  private certPem: string | null = null;
  private keyPem: string | null = null;
  private httpsAgent: https.Agent | null = null;
  private ambiente: "producao" | "homologacao" = "producao";

  private get baseUrl(): string {
    return this.ambiente === "producao" ? BASE_URL_PROD : BASE_URL_HOMOLOG;
  }

  setAmbiente(ambiente: "producao" | "homologacao"): void {
    this.ambiente = ambiente;
  }

  async configurarCertificado(pfxBuffer: Buffer, senha: string): Promise<boolean> {
    try {
      const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);

      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

      const certBag = certBags[forge.pki.oids.certBag];
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];

      if (!certBag || !certBag[0] || !keyBag || !keyBag[0]) {
        throw new Error("Certificado ou chave privada nao encontrados no arquivo PFX");
      }

      const cert = certBag[0].cert;
      const key = keyBag[0].key;

      if (!cert || !key) {
        throw new Error("Certificado ou chave invalidos");
      }

      this.certPem = forge.pki.certificateToPem(cert);
      this.keyPem = forge.pki.privateKeyToPem(key);

      this.httpsAgent = new https.Agent({
        cert: this.certPem!,
        key: this.keyPem!,
        rejectUnauthorized: true,
      });

      const cn = cert.subject.getField("CN")?.value;
      const validoAte = cert.validity.notAfter;

      console.log("Certificado digital configurado para NFS-e Nacional");
      console.log("Subject:", cn);
      console.log("Validade:", validoAte);

      return true;
    } catch (error) {
      console.error("Erro ao processar certificado:", error);
      return false;
    }
  }

  async distribuicaoDFe(params: DistribuicaoParams): Promise<NfseNacionalResult[]> {
    if (!this.httpsAgent) {
      throw new Error("Certificado digital nao configurado");
    }

    const endpoint = params.nsu
      ? `${this.baseUrl}/DFe/${params.nsu}`
      : `${this.baseUrl}/DFe?ultNSU=${params.ultNsu || "0"}`;

    const response = await this.makeRequest("GET", endpoint);
    return this.parseDistribuicaoResponse(response);
  }

  async consultarNfsePorChave(chaveAcesso: string): Promise<{ xml: string; nfse: NfseNacionalResult } | null> {
    if (!this.httpsAgent) {
      throw new Error("Certificado digital nao configurado");
    }

    const endpoint = `${this.baseUrl}/nfse/${chaveAcesso}`;
    const response = await this.makeRequest("GET", endpoint);

    if (!response || !response.nfseXmlGZipB64) {
      return null;
    }

    const xmlGzipBuffer = Buffer.from(response.nfseXmlGZipB64, "base64");
    const xmlBuffer = gunzipSync(xmlGzipBuffer);
    const xml = xmlBuffer.toString("utf-8");

    return {
      xml,
      nfse: this.parseNfseXml(xml, chaveAcesso),
    };
  }

  async downloadDanfse(chaveAcesso: string): Promise<Buffer> {
    if (!this.httpsAgent) {
      throw new Error("Certificado digital nao configurado");
    }

    const endpoint = `${this.baseUrl}/danfse/${chaveAcesso}`;
    const response = await this.makeRequest("GET", endpoint, true);

    if (response.pdfB64) {
      return Buffer.from(response.pdfB64, "base64");
    }

    throw new Error("PDF nao disponivel");
  }

  async consultarNfsesPorPeriodo(
    cnpjPrestador: string,
    dataInicio: string,
    dataFim: string
  ): Promise<NfseNacionalResult[]> {
    const notas: NfseNacionalResult[] = [];
    let ultNsu = "0";
    let temMais = true;

    while (temMais) {
      const response = await this.distribuicaoDFe({
        cnpjInteressado: cnpjPrestador,
        ultNsu,
      });

      if (response.length === 0) {
        temMais = false;
        break;
      }

      for (const nota of response) {
        const dataEmissao = new Date(nota.dataEmissao);
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);

        if (dataEmissao >= inicio && dataEmissao <= fim) {
          notas.push(nota);
        }
      }

      ultNsu = response[response.length - 1].chaveAcesso.substring(0, 15);

      if (response.length < 50) {
        temMais = false;
      }
    }

    return notas;
  }

  async consultarNfsesPorTomador(
    cnpjPrestador: string,
    cnpjTomador: string,
    dataInicio?: string,
    dataFim?: string
  ): Promise<NfseNacionalResult[]> {
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje);
    trintaDiasAtras.setDate(hoje.getDate() - 30);

    const inicio = dataInicio || trintaDiasAtras.toISOString().split("T")[0];
    const fim = dataFim || hoje.toISOString().split("T")[0];

    const todasNotas = await this.consultarNfsesPorPeriodo(cnpjPrestador, inicio, fim);

    return todasNotas.filter(
      (nota) => nota.cnpjTomador.replace(/\D/g, "") === cnpjTomador.replace(/\D/g, "")
    );
  }

  private async makeRequest(method: string, url: string, isBinary = false): Promise<any> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);

      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method,
        agent: this.httpsAgent!,
        headers: {
          Accept: isBinary ? "application/pdf" : "application/json",
          "Content-Type": "application/json",
        },
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks);

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            if (isBinary) {
              resolve({ pdfB64: body.toString("base64") });
            } else {
              try {
                resolve(JSON.parse(body.toString()));
              } catch {
                resolve({});
              }
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body.toString()}`));
          }
        });
      });

      req.on("error", reject);
      req.end();
    });
  }

  private parseDistribuicaoResponse(response: any): NfseNacionalResult[] {
    const notas: NfseNacionalResult[] = [];

    if (!response || !response.docZip) {
      return notas;
    }

    for (const doc of response.docZip || []) {
      try {
        const xmlGzipBuffer = Buffer.from(doc.docZipB64, "base64");
        const xmlBuffer = gunzipSync(xmlGzipBuffer);
        const xml = xmlBuffer.toString("utf-8");

        notas.push(this.parseNfseXml(xml, doc.chNFSe || ""));
      } catch (error) {
        console.error("Erro ao processar documento:", error);
      }
    }

    return notas;
  }

  private parseNfseXml(xml: string, chaveAcesso: string): NfseNacionalResult {
    const extractTag = (tagName: string): string => {
      const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, "i");
      const match = xml.match(regex);
      return match ? match[1] : "";
    };

    return {
      chaveAcesso,
      numero: extractTag("nNFSe") || extractTag("NumeroNfse") || "",
      dataEmissao: extractTag("dhEmi") || extractTag("DataEmissao") || "",
      competencia: extractTag("cLocEmi") || "",
      valor: parseFloat(extractTag("vLiq") || extractTag("ValorServicos") || "0"),
      cnpjPrestador: extractTag("CNPJ") || "",
      razaoSocialPrestador: extractTag("xNome") || extractTag("RazaoSocial") || "",
      cnpjTomador: "",
      razaoSocialTomador: "",
      descricaoServico: extractTag("xServ") || extractTag("Discriminacao") || "",
      municipio: extractTag("cMunFG") || "",
      xml,
    };
  }

  isCertificadoConfigurado(): boolean {
    return this.httpsAgent !== null;
  }
}

export const nfseNacionalService = new NfseNacionalService();
