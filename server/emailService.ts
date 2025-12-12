interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
}

export class EmailService {
  private config: EmailConfig | null = null;
  private provider: "sendgrid" | "resend" = "sendgrid";

  configure(apiKey: string, fromEmail: string, fromName: string = "Sistema NFS-e"): void {
    this.config = { apiKey, fromEmail, fromName };
  }

  setProvider(provider: "sendgrid" | "resend"): void {
    this.provider = provider;
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.apiKey.length > 0;
  }

  async sendNfseEmail(
    to: string,
    tomadorNome: string,
    nfseNumero: string,
    dataEmissao: string,
    valor: string,
    pdfBuffer: Buffer
  ): Promise<boolean> {
    if (!this.config) {
      throw new Error("Servico de email nao configurado");
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Roboto', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1976D2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .label { color: #666; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 16px; font-weight: 500; color: #1976D2; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nota Fiscal de Servicos Eletronica</h1>
    </div>
    <div class="content">
      <p>Prezado(a) <strong>${tomadorNome}</strong>,</p>
      <p>Segue em anexo a Nota Fiscal de Servicos Eletronica referente ao servico prestado.</p>
      
      <div class="info-box">
        <div class="label">Numero da NFS-e</div>
        <div class="value">${nfseNumero}</div>
      </div>
      
      <div class="info-box">
        <div class="label">Data de Emissao</div>
        <div class="value">${dataEmissao}</div>
      </div>
      
      <div class="info-box">
        <div class="label">Valor Total</div>
        <div class="value">R$ ${valor}</div>
      </div>
      
      <p>O arquivo PDF da nota fiscal esta anexo a este email.</p>
      <p>Qualquer duvida, entre em contato conosco.</p>
    </div>
    <div class="footer">
      <p>Este email foi enviado automaticamente pelo Sistema de NFS-e.</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to,
      toName: tomadorNome,
      subject: `NFS-e ${nfseNumero} - ${dataEmissao}`,
      htmlContent,
      attachments: [
        {
          filename: `NFSe_${nfseNumero}.pdf`,
          content: pdfBuffer.toString("base64"),
          type: "application/pdf",
        },
      ],
    });
  }

  async sendEmail(params: SendEmailParams): Promise<boolean> {
    if (!this.config) {
      throw new Error("Servico de email nao configurado");
    }

    if (this.provider === "sendgrid") {
      return this.sendViaSendGrid(params);
    } else {
      return this.sendViaResend(params);
    }
  }

  private async sendViaSendGrid(params: SendEmailParams): Promise<boolean> {
    const payload: any = {
      personalizations: [
        {
          to: [{ email: params.to, name: params.toName }],
          subject: params.subject,
        },
      ],
      from: {
        email: this.config!.fromEmail,
        name: this.config!.fromName,
      },
      content: [
        {
          type: "text/html",
          value: params.htmlContent,
        },
      ],
    };

    if (params.attachments && params.attachments.length > 0) {
      payload.attachments = params.attachments.map((att) => ({
        content: att.content,
        filename: att.filename,
        type: att.type,
        disposition: "attachment",
      }));
    }

    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config!.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 202) {
        console.log(`Email enviado para ${params.to}`);
        return true;
      }

      const error = await response.text();
      console.error("Erro SendGrid:", error);
      return false;
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      return false;
    }
  }

  private async sendViaResend(params: SendEmailParams): Promise<boolean> {
    const payload: any = {
      from: `${this.config!.fromName} <${this.config!.fromEmail}>`,
      to: [params.to],
      subject: params.subject,
      html: params.htmlContent,
    };

    if (params.attachments && params.attachments.length > 0) {
      payload.attachments = params.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
      }));
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config!.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`Email enviado para ${params.to}`);
        return true;
      }

      const error = await response.text();
      console.error("Erro Resend:", error);
      return false;
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
