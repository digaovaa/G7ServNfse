import * as soap from "soap";
import * as https from "https";
import * as fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const forge = require("node-forge");
import { parseStringPromise, Builder } from "xml2js";

const WSDL_URL = "https://nfse.recife.pe.gov.br/WSNacional/nfse_v01.asmx?wsdl";
const ENDPOINT_URL = "https://nfse.recife.pe.gov.br/WSNacional/nfse_v01.asmx";

export interface CertificadoDigital {
  pfxBuffer: Buffer;
  senha: string;
}

export interface ConsultaNfseParams {
  cnpjPrestador: string;
  inscricaoMunicipal: string;
  dataInicio: string;
  dataFim: string;
  cnpjTomador?: string;
  numeroNfse?: string;
}

export interface NfseResult {
  numero: string;
  dataEmissao: string;
  valor: number;
  cnpjTomador: string;
  razaoSocialTomador: string;
  descricaoServico: string;
  codigoVerificacao: string;
  linkPdf: string;
  xml?: string;
}

export class NfseRecifeService {
  private certificado: CertificadoDigital | null = null;
  private httpsAgent: https.Agent | null = null;

  async configurarCertificado(pfxPath: string, senha: string): Promise<boolean> {
    try {
      const pfxBuffer = fs.readFileSync(pfxPath);
      return this.configurarCertificadoBuffer(pfxBuffer, senha);
    } catch (error) {
      console.error("Erro ao ler certificado:", error);
      return false;
    }
  }

  async configurarCertificadoBuffer(pfxBuffer: Buffer, senha: string): Promise<boolean> {
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

      const certPem = forge.pki.certificateToPem(cert);
      const keyPem = forge.pki.privateKeyToPem(key);

      this.httpsAgent = new https.Agent({
        cert: certPem,
        key: keyPem,
        rejectUnauthorized: true,
      });

      this.certificado = { pfxBuffer, senha };

      console.log("Certificado digital configurado com sucesso");
      console.log("Subject:", cert.subject.getField("CN")?.value);
      console.log("Validade:", cert.validity.notAfter);

      return true;
    } catch (error) {
      console.error("Erro ao processar certificado:", error);
      return false;
    }
  }

  async consultarNfse(params: ConsultaNfseParams): Promise<NfseResult[]> {
    if (!this.httpsAgent) {
      throw new Error("Certificado digital nao configurado");
    }

    const xmlConsulta = this.montarXmlConsultaNfse(params);

    try {
      const client = await soap.createClientAsync(WSDL_URL, {
        wsdl_options: { httpsAgent: this.httpsAgent },
        httpsAgent: this.httpsAgent,
        endpoint: ENDPOINT_URL,
      });

      const [result] = await client.ConsultarNfseAsync({
        nfseCabecMsg: this.getCabecalho(),
        nfseDadosMsg: xmlConsulta,
      });

      return this.parseResultadoConsulta(result);
    } catch (error: any) {
      console.error("Erro ao consultar NFS-e:", error.message);
      throw error;
    }
  }

  async consultarNfsePorPeriodo(
    cnpjPrestador: string,
    inscricaoMunicipal: string,
    dataInicio: string,
    dataFim: string
  ): Promise<NfseResult[]> {
    return this.consultarNfse({
      cnpjPrestador,
      inscricaoMunicipal,
      dataInicio,
      dataFim,
    });
  }

  async consultarNfsePorTomador(
    cnpjPrestador: string,
    inscricaoMunicipal: string,
    cnpjTomador: string,
    dataInicio?: string,
    dataFim?: string
  ): Promise<NfseResult[]> {
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje);
    trintaDiasAtras.setDate(hoje.getDate() - 30);

    return this.consultarNfse({
      cnpjPrestador,
      inscricaoMunicipal,
      cnpjTomador,
      dataInicio: dataInicio || trintaDiasAtras.toISOString().split("T")[0],
      dataFim: dataFim || hoje.toISOString().split("T")[0],
    });
  }

  async downloadPdfNfse(
    cnpjPrestador: string,
    inscricaoMunicipal: string,
    numeroNfse: string,
    codigoVerificacao: string
  ): Promise<Buffer> {
    const pdfUrl = `https://nfse.recife.pe.gov.br/nfse.aspx?nfse=${numeroNfse}&cv=${codigoVerificacao}&im=${inscricaoMunicipal}`;
    
    const response = await fetch(pdfUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/pdf",
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao baixar PDF: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  getLinkVisualizacao(numeroNfse: string, codigoVerificacao: string, inscricaoMunicipal: string): string {
    return `https://nfse.recife.pe.gov.br/nfse.aspx?nfse=${numeroNfse}&cv=${codigoVerificacao}&im=${inscricaoMunicipal}`;
  }

  private getCabecalho(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<cabecalho xmlns="http://www.abrasf.org.br/nfse.xsd" versao="1.00">
  <versaoDados>1.00</versaoDados>
</cabecalho>`;
  }

  private montarXmlConsultaNfse(params: ConsultaNfseParams): string {
    const builder = new Builder({ headless: true });

    const consulta: any = {
      ConsultarNfseEnvio: {
        $: { xmlns: "http://www.abrasf.org.br/nfse.xsd" },
        Prestador: {
          Cnpj: params.cnpjPrestador.replace(/\D/g, ""),
          InscricaoMunicipal: params.inscricaoMunicipal,
        },
        PeriodoEmissao: {
          DataInicial: params.dataInicio,
          DataFinal: params.dataFim,
        },
      },
    };

    if (params.cnpjTomador) {
      consulta.ConsultarNfseEnvio.Tomador = {
        CpfCnpj: {
          Cnpj: params.cnpjTomador.replace(/\D/g, ""),
        },
      };
    }

    if (params.numeroNfse) {
      consulta.ConsultarNfseEnvio.NumeroNfse = params.numeroNfse;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>${builder.buildObject(consulta)}`;
  }

  private async parseResultadoConsulta(result: any): Promise<NfseResult[]> {
    const notas: NfseResult[] = [];

    try {
      if (!result || !result.ConsultarNfseResposta) {
        return notas;
      }

      const resposta = result.ConsultarNfseResposta;

      if (resposta.ListaMensagemRetorno) {
        const mensagens = resposta.ListaMensagemRetorno.MensagemRetorno;
        if (Array.isArray(mensagens)) {
          for (const msg of mensagens) {
            console.warn(`Erro ${msg.Codigo}: ${msg.Mensagem}`);
          }
        } else if (mensagens) {
          console.warn(`Erro ${mensagens.Codigo}: ${mensagens.Mensagem}`);
        }
        return notas;
      }

      if (resposta.ListaNfse && resposta.ListaNfse.CompNfse) {
        const listaNotas = Array.isArray(resposta.ListaNfse.CompNfse)
          ? resposta.ListaNfse.CompNfse
          : [resposta.ListaNfse.CompNfse];

        for (const compNfse of listaNotas) {
          const nfse = compNfse.Nfse?.InfNfse;
          if (nfse) {
            notas.push({
              numero: nfse.Numero,
              dataEmissao: nfse.DataEmissao,
              valor: parseFloat(nfse.Servico?.Valores?.ValorServicos || "0"),
              cnpjTomador: nfse.TomadorServico?.IdentificacaoTomador?.CpfCnpj?.Cnpj || "",
              razaoSocialTomador: nfse.TomadorServico?.RazaoSocial || "",
              descricaoServico: nfse.Servico?.Discriminacao || "",
              codigoVerificacao: nfse.CodigoVerificacao || "",
              linkPdf: this.getLinkVisualizacao(
                nfse.Numero,
                nfse.CodigoVerificacao,
                nfse.PrestadorServico?.IdentificacaoPrestador?.InscricaoMunicipal || ""
              ),
            });
          }
        }
      }
    } catch (error) {
      console.error("Erro ao parsear resultado:", error);
    }

    return notas;
  }

  isCertificadoConfigurado(): boolean {
    return this.httpsAgent !== null;
  }
}

export const nfseRecifeService = new NfseRecifeService();
