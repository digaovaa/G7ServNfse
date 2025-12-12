import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { CNPJSearchForm } from "@/components/CNPJSearchForm";
import { NfseResultsTable } from "@/components/NfseResultsTable";
import { BatchDownloadBar } from "@/components/BatchDownloadBar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { NfseMetadata } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useState<{
    cnpj: string;
    dataInicio?: string;
    dataFim?: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: nfseData = [], isLoading: isSearching, error: searchError } = useQuery<NfseMetadata[]>({
    queryKey: ["/api/nfse", searchParams?.cnpj, searchParams?.dataInicio, searchParams?.dataFim] as const,
    queryFn: async ({ queryKey }) => {
      const [, cnpj, dataInicio, dataFim] = queryKey;
      if (!cnpj) throw new Error("CNPJ não informado");
      
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

  // Handle search errors
  useEffect(() => {
    if (searchError) {
      if (isUnauthorizedError(searchError as Error)) {
        toast({
          title: "Sessão expirada",
          description: "Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Erro na busca",
          description: "Não foi possível buscar as notas fiscais. Verifique o CNPJ e tente novamente.",
          variant: "destructive",
        });
      }
    }
  }, [searchError, toast]);

  const handleSearch = (cnpj: string, dataInicio?: string, dataFim?: string) => {
    setSelectedIds([]);
    setSearchParams({ cnpj, dataInicio, dataFim });
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
        title: "Download concluído",
        description: "O arquivo foi baixado com sucesso.",
      });
    },
    onError: (error) => {
      setDownloadingId(null);
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
        description: "Não foi possível baixar o arquivo. Tente novamente.",
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
        title: "Download em lote concluído",
        description: "O arquivo ZIP foi baixado com sucesso.",
      });
    },
    onError: (error) => {
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
        title: "Erro no download em lote",
        description: "Não foi possível gerar o arquivo ZIP. Tente novamente.",
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-page-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Busque notas fiscais por CNPJ do condomínio e faça downloads individuais ou em lote.
          </p>
        </div>

        <CNPJSearchForm onSearch={handleSearch} isLoading={isSearching} />

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
