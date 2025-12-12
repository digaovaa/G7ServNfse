import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Mail, CheckCircle, XCircle, Upload, Settings, Key } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface IntegracaoStatus {
  certificadoNacional: boolean;
  certificadoMunicipal: boolean;
  emailConfigurado: boolean;
}

export default function Configuracoes() {
  const { toast } = useToast();
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [senhaCertificado, setSenhaCertificado] = useState("");
  const [sistemaCertificado, setSistemaCertificado] = useState("nacional");

  const [emailApiKey, setEmailApiKey] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [emailFromName, setEmailFromName] = useState("");
  const [emailProvider, setEmailProvider] = useState("sendgrid");

  const { data: status, refetch: refetchStatus } = useQuery<IntegracaoStatus>({
    queryKey: ["/api/integracao/status"],
  });

  const certificadoMutation = useMutation({
    mutationFn: async () => {
      if (!certificadoFile || !senhaCertificado) {
        throw new Error("Selecione o certificado e informe a senha");
      }

      const formData = new FormData();
      formData.append("certificado", certificadoFile);
      formData.append("senha", senhaCertificado);
      formData.append("sistema", sistemaCertificado);

      const response = await fetch("/api/integracao/certificado", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao configurar certificado");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Certificado configurado",
        description: "O certificado digital foi configurado com sucesso.",
      });
      setCertificadoFile(null);
      setSenhaCertificado("");
      refetchStatus();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao configurar certificado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      if (!emailApiKey || !emailFrom) {
        throw new Error("API Key e email de origem sao obrigatorios");
      }

      const response = await fetch("/api/integracao/email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: emailApiKey,
          fromEmail: emailFrom,
          fromName: emailFromName || "Sistema NFS-e",
          provider: emailProvider,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao configurar email");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email configurado",
        description: "O servico de email foi configurado com sucesso.",
      });
      setEmailApiKey("");
      refetchStatus();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao configurar email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const StatusBadge = ({ configured }: { configured: boolean }) => (
    <Badge variant={configured ? "default" : "secondary"} className="gap-1">
      {configured ? (
        <>
          <CheckCircle className="h-3 w-3" />
          Configurado
        </>
      ) : (
        <>
          <XCircle className="h-3 w-3" />
          Nao configurado
        </>
      )}
    </Badge>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Configuracoes
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure a integracao com o portal NFS-e do governo
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>Certificado Digital</CardTitle>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    Nacional:
                    <StatusBadge configured={status?.certificadoNacional || false} />
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    Municipal:
                    <StatusBadge configured={status?.certificadoMunicipal || false} />
                  </div>
                </div>
              </div>
              <CardDescription>
                Faca upload do certificado A1 (.pfx ou .p12) para autenticar no portal NFS-e
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sistema</Label>
                <Select value={sistemaCertificado} onValueChange={setSistemaCertificado}>
                  <SelectTrigger data-testid="select-sistema-certificado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">NFS-e Nacional (gov.br)</SelectItem>
                    <SelectItem value="municipal">NFS-e Municipal (Recife)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Arquivo do Certificado (.pfx ou .p12)</Label>
                <Input
                  type="file"
                  accept=".pfx,.p12"
                  onChange={(e) => setCertificadoFile(e.target.files?.[0] || null)}
                  data-testid="input-certificado-file"
                />
                {certificadoFile && (
                  <p className="text-sm text-muted-foreground">{certificadoFile.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Senha do Certificado</Label>
                <Input
                  type="password"
                  value={senhaCertificado}
                  onChange={(e) => setSenhaCertificado(e.target.value)}
                  placeholder="Digite a senha do certificado"
                  data-testid="input-senha-certificado"
                />
              </div>

              <Button
                onClick={() => certificadoMutation.mutate()}
                disabled={certificadoMutation.isPending || !certificadoFile || !senhaCertificado}
                className="w-full"
                data-testid="button-configurar-certificado"
              >
                {certificadoMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Configurando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Configurar Certificado
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle>Servico de Email</CardTitle>
                </div>
                <StatusBadge configured={status?.emailConfigurado || false} />
              </div>
              <CardDescription>
                Configure o servico de email para enviar notas fiscais aos clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Provedor</Label>
                <Select value={emailProvider} onValueChange={setEmailProvider}>
                  <SelectTrigger data-testid="select-email-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="resend">Resend</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={emailApiKey}
                  onChange={(e) => setEmailApiKey(e.target.value)}
                  placeholder="Sua API Key do provedor de email"
                  data-testid="input-email-api-key"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email de Origem</Label>
                  <Input
                    type="email"
                    value={emailFrom}
                    onChange={(e) => setEmailFrom(e.target.value)}
                    placeholder="noreply@suaempresa.com"
                    data-testid="input-email-from"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nome do Remetente</Label>
                  <Input
                    type="text"
                    value={emailFromName}
                    onChange={(e) => setEmailFromName(e.target.value)}
                    placeholder="Sistema NFS-e"
                    data-testid="input-email-from-name"
                  />
                </div>
              </div>

              <Button
                onClick={() => emailMutation.mutate()}
                disabled={emailMutation.isPending || !emailApiKey || !emailFrom}
                className="w-full"
                data-testid="button-configurar-email"
              >
                {emailMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Configurando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Configurar Email
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informacoes do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Municipio:</span>
                  <span className="font-medium">Recife - PE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sistema Municipal:</span>
                  <span className="font-medium">nfse.recife.pe.gov.br</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sistema Nacional:</span>
                  <span className="font-medium">nfse.gov.br</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modelo:</span>
                  <span className="font-medium">ABRASF Nacional</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
