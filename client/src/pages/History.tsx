import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, History as HistoryIcon, FileText, FileCode, Package } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatCNPJ, isUnauthorizedError } from "@/lib/authUtils";

interface DownloadLogWithDetails {
  id: string;
  userId: string | null;
  nfseId: string | null;
  tipoDownload: string | null;
  dataDownload: string | null;
  arquivoNome: string | null;
  cnpjTomador: string | null;
  nomeTomador: string | null;
}

export default function History() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Sessão expirada",
        description: "Fazendo login novamente...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: logs = [], isLoading } = useQuery<DownloadLogWithDetails[]>({
    queryKey: ["/api/download-history"],
    enabled: isAuthenticated,
  });

  const getTypeBadge = (tipo: string | null) => {
    switch (tipo) {
      case "pdf":
        return (
          <Badge variant="default" className="gap-1">
            <FileText className="h-3 w-3" />
            PDF
          </Badge>
        );
      case "xml":
        return (
          <Badge variant="secondary" className="gap-1">
            <FileCode className="h-3 w-3" />
            XML
          </Badge>
        );
      case "lote":
        return (
          <Badge variant="outline" className="gap-1">
            <Package className="h-3 w-3" />
            Lote
          </Badge>
        );
      default:
        return <Badge variant="outline">{tipo || "—"}</Badge>;
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRedownload = async (log: DownloadLogWithDetails) => {
    if (!log.nfseId || log.tipoDownload === "lote") {
      toast({
        title: "Não disponível",
        description: "O download em lote não pode ser refeito desta forma.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/nfse/${log.nfseId}/download?tipo=${log.tipoDownload}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("401: Unauthorized");
        }
        throw new Error("Falha ao baixar arquivo");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = log.arquivoNome || `nfse.${log.tipoDownload}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download concluído",
        description: "O arquivo foi baixado com sucesso.",
      });
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Sessão expirada",
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
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-page-title">
            Histórico de Downloads
          </h1>
          <p className="text-muted-foreground">
            Acompanhe todos os downloads realizados e refaça downloads anteriores.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HistoryIcon className="h-5 w-5 text-primary" />
              Downloads Recentes
              {logs.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {logs.length} registro{logs.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 flex-1" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <HistoryIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg mb-1">
                  Nenhum download realizado
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Quando você baixar notas fiscais, elas aparecerão aqui para
                  consulta e redownload.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Data/Hora</TableHead>
                      <TableHead className="min-w-[200px]">Condomínio</TableHead>
                      <TableHead className="min-w-[100px]">Tipo</TableHead>
                      <TableHead className="min-w-[200px]">Arquivo</TableHead>
                      <TableHead className="min-w-[100px] text-center">
                        Ação
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                        <TableCell>
                          <span
                            className="font-mono text-sm"
                            data-testid={`text-date-${log.id}`}
                          >
                            {formatDateTime(log.dataDownload)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p
                              className="font-medium truncate max-w-[200px]"
                              data-testid={`text-nome-${log.id}`}
                            >
                              {log.nomeTomador || "—"}
                            </p>
                            {log.cnpjTomador && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {formatCNPJ(log.cnpjTomador)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(log.tipoDownload)}</TableCell>
                        <TableCell>
                          <span
                            className="font-mono text-xs truncate max-w-[180px] inline-block"
                            title={log.arquivoNome || undefined}
                            data-testid={`text-arquivo-${log.id}`}
                          >
                            {log.arquivoNome || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRedownload(log)}
                            disabled={log.tipoDownload === "lote"}
                            title={
                              log.tipoDownload === "lote"
                                ? "Downloads em lote não podem ser refeitos"
                                : "Baixar novamente"
                            }
                            data-testid={`button-redownload-${log.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
