import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { CNPJSearchForm } from "@/components/CNPJSearchForm";
import { NfseResultsTable } from "@/components/NfseResultsTable";
import { BatchDownloadBar } from "@/components/BatchDownloadBar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Globe, RefreshCw, Mail, Send, Settings } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { NfseMetadata } from "@shared/schema";

interface IntegracaoStatus {
  certificadoNacional: boolean;
  certificadoMunicipal: boolean;
  emailConfigurado: boolean;
}

interface PortalNfse {
  numero?: string;
  chaveAcesso: string;
  dataEmissao: string;
  valor: number;
  tomador: {
    cnpj?: string;
    cpf?: string;
    nome: string;
    email?: string;
  };
  prestador?: {
    cnpj: string;
    nome: string;
  };
  descricaoServico?: string;
  status?: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useState<{
    cnpj: string;
    dataInicio?: string;
    dataFim?: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [portalResults, setPortalResults] = useState<PortalNfse[]>([]);

  const { data: status } = useQuery<IntegracaoStatus>({
    queryKey: ["/api/integracao/status"],
    staleTime: 60000,
  });

  const { data: nfseData = [], isLoading: isSearching, error: searchError } = useQuery<NfseMetadata[]>({
    queryKey: ["/api/nfse", searchParams?.cnpj, searchParams?.dataInicio, searchParams?.dataFim] as const,
    queryFn: async ({ queryKey }) => {
      const [, cnpj, dataInicio, dataFim] = queryKey;
      if (!cnpj) throw new Error("CNPJ nao informado");
      
      const params = new URLSearchParams();
      params.set("cnpj", cnpj);
      if (dataInicio) params.set("dataInicio", dataInicio);
      if (dataFim) params.set("dataFim", dataFim);
      
      const res = await fetch(`/api/nfse?${params.toString()}`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) throw new Error("401: Unauthorized");
        const text = await res.text();
        throw new Error(text || "Erro ao buscar notas");
      }
      return res.json();
    },
    enabled: !!searchParams?.cnpj,
  });

  useEffect(() => {
    if (searchError) {
      if (isUnauthorizedError(searchError as Error)) {
        toast({
          title: "Sessao expirada",
          description: "Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Erro na busca",
          description: "Nao foi possivel buscar as notas fiscais. Verifique o CNPJ e tente novamente.",
          variant: "destructive",
        });
      }
    }
  }, [searchError, toast]);

  const searchPortalMutation = useMutation({
    mutationFn: async (params: { cnpj: string; dataInicio?: string; dataFim?: string; sistema: string }) => {
      const queryParams = new URLSearchParams();
      queryParams.set("cnpjPrestador", params.cnpj);
      if (params.dataInicio) queryParams.set("dataInicio", params.dataInicio);
      if (params.dataFim) queryParams.set("dataFim", params.dataFim);
      queryParams.set("sistema", params.sistema);

      const response = await fetch(`/api/portal/nfse?${queryParams.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao consultar portal");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setPortalResults(data);
      toast({
        title: "Consulta realizada",
        description: `Encontradas ${data.length} notas fiscais no portal.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na consulta ao portal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearch = (cnpj: string, dataInicio?: string, dataFim?: string) => {
    setSelectedIds([]);
    setPortalResults([]);
    setSearchParams({ cnpj, dataInicio, dataFim });
  };

  const handleSearchPortal = (cnpj: string, dataInicio?: string, dataFim?: string, sistema: "nacional" | "municipal" = "nacional") => {
    setSelectedIds([]);
    setPortalResults([]);
    setSearchParams(null);
    searchPortalMutation.mutate({ cnpj, dataInicio, dataFim, sistema });
  };

  const downloadMutation = useMutation({
    mutationFn: async ({ id, tipo }: { id: string; tipo: "pdf" | "xml" }) => {
      setDownloadingId(id);
      const response = await fetch(`/api/nfse/${id}/download?tipo=${tipo}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("401: Unauthorized");
        }
        throw new Error("Falha ao baixar arquivo");
      }
      
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `nfse_${id}.${tipo}`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = match[1];
        }
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { id, tipo };
    },
    onSuccess: () => {
      setDownloadingId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/download-history"] });
      toast({
        title: "Download concluido",
        description: "O arquivo foi baixado com sucesso.",
      });
    },
    onError: (error) => {
      setDownloadingId(null);
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Sessao expirada",
          description: "Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro no download",
        description: "Nao foi possivel baixar o arquivo. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const downloadPortalPdfMutation = useMutation({
    mutationFn: async (chave: string) => {
      setDownloadingId(chave);
      const response = await fetch(`/api/portal/nfse/${encodeURIComponent(chave)}/pdf`, {
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao baixar PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NFSe_${chave}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return chave;
    },
    onSuccess: () => {
      setDownloadingId(null);
      toast({
        title: "Download concluido",
        description: "O PDF foi baixado com sucesso.",
      });
    },
    onError: (error: Error) => {
      setDownloadingId(null);
      toast({
        title: "Erro no download",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (nota: PortalNfse) => {
      const response = await fetch("/api/portal/nfse/enviar-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chaveAcesso: nota.chaveAcesso,
          emailDestino: nota.tomador.email,
          tomadorNome: nota.tomador.nome,
          numero: nota.numero,
          dataEmissao: nota.dataEmissao,
          valor: nota.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao enviar email");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email enviado",
        description: "A nota fiscal foi enviada por email com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const batchDownloadMutation = useMutation({
    mutationFn: async (nfseIds: string[]) => {
      const response = await fetch("/api/nfse/batch-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nfseIds }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("401: Unauthorized");
        }
        throw new Error("Falha ao gerar arquivo ZIP");
      }
      
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `nfse_lote_${new Date().toISOString().split("T")[0]}.zip`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = match[1];
        }
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return nfseIds;
    },
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["/api/download-history"] });
      toast({
        title: "Download em lote concluido",
        description: "O arquivo ZIP foi baixado com sucesso.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Sessao expirada",
          description: "Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro no download em lote",
        description: "Nao foi possivel gerar o arquivo ZIP. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleDownload = (id: string, tipo: "pdf" | "xml") => {
    downloadMutation.mutate({ id, tipo });
  };

  const handleBatchDownload = () => {
    if (selectedIds.length === 0) return;
    batchDownloadMutation.mutate(selectedIds);
  };

  const certificadoConfigurado = status?.certificadoNacional || status?.certificadoMunicipal;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-page-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Busque notas fiscais por CNPJ do condominio e faca downloads individuais ou em lote.
          </p>
        </div>

        {user?.role === "admin" && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Status da Integracao</CardTitle>
                </div>
                <Link href="/configuracoes">
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-goto-settings">
                    <Settings className="h-4 w-4" />
                    Configurar
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Portal Nacional:</span>
                  <Badge variant={status?.certificadoNacional ? "default" : "secondary"} className="gap-1">
                    {status?.certificadoNacional ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Conectado
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        Nao configurado
                      </>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Portal Municipal:</span>
                  <Badge variant={status?.certificadoMunicipal ? "default" : "secondary"} className="gap-1">
                    {status?.certificadoMunicipal ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Conectado
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        Nao configurado
                      </>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <Badge variant={status?.emailConfigurado ? "default" : "secondary"} className="gap-1">
                    {status?.emailConfigurado ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Configurado
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        Nao configurado
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <CNPJSearchForm 
          onSearch={handleSearch} 
          isLoading={isSearching}
          isPortalLoading={searchPortalMutation.isPending}
          onSearchPortal={certificadoConfigurado ? handleSearchPortal : undefined}
          portalDisponivel={!!certificadoConfigurado}
        />

        {portalResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Resultados do Portal NFS-e
              </CardTitle>
              <CardDescription>
                {portalResults.length} nota(s) encontrada(s) no portal do governo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Numero</th>
                      <th className="text-left py-2 px-3 font-medium">Data</th>
                      <th className="text-left py-2 px-3 font-medium">Tomador</th>
                      <th className="text-right py-2 px-3 font-medium">Valor</th>
                      <th className="text-center py-2 px-3 font-medium">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portalResults.map((nota) => (
                      <tr key={nota.chaveAcesso} className="border-b hover-elevate">
                        <td className="py-2 px-3" data-testid={`text-numero-${nota.numero || nota.chaveAcesso}`}>
                          {nota.numero || "-"}
                        </td>
                        <td className="py-2 px-3">
                          {new Date(nota.dataEmissao).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-2 px-3">
                          <div>
                            <div className="font-medium">{nota.tomador.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {nota.tomador.cnpj || nota.tomador.cpf}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {nota.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadPortalPdfMutation.mutate(nota.chaveAcesso)}
                              disabled={downloadingId === nota.chaveAcesso}
                              data-testid={`button-download-${nota.chaveAcesso}`}
                            >
                              {downloadingId === nota.chaveAcesso ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                "PDF"
                              )}
                            </Button>
                            {nota.tomador.email && status?.emailConfigurado && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendEmailMutation.mutate(nota)}
                                disabled={sendEmailMutation.isPending}
                                className="gap-1"
                                data-testid={`button-email-${nota.chaveAcesso}`}
                              >
                                <Send className="h-3 w-3" />
                                Email
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <NfseResultsTable
          data={nfseData}
          isLoading={isSearching && !!searchParams}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onDownload={handleDownload}
          isDownloading={downloadingId}
        />
      </main>

      <BatchDownloadBar
        selectedCount={selectedIds.length}
        onDownload={handleBatchDownload}
        onClear={() => setSelectedIds([])}
        isLoading={batchDownloadMutation.isPending}
      />
    </div>
  );
}
