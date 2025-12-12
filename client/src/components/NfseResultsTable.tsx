import { useState } from "react";
import { FileText, FileCode, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatDate, formatCurrency, formatCNPJ } from "@/lib/authUtils";
import type { NfseMetadata } from "@shared/schema";

interface NfseResultsTableProps {
  data: NfseMetadata[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDownload: (id: string, tipo: "pdf" | "xml") => void;
  isDownloading?: string | null;
}

export function NfseResultsTable({
  data,
  isLoading,
  selectedIds,
  onSelectionChange,
  onDownload,
  isDownloading,
}: NfseResultsTableProps) {
  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < data.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map((item) => item.id));
    }
  };

  const handleSelectItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "emitida":
        return <Badge variant="default">Emitida</Badge>;
      case "cancelada":
        return <Badge variant="destructive">Cancelada</Badge>;
      case "pendente":
        return <Badge variant="secondary">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status || "—"}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Resultados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-12 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Resultados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-1">Nenhuma nota encontrada</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Busque por um CNPJ para visualizar as NFS-e emitidas. Você pode
              filtrar por período para refinar os resultados.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Resultados
            <Badge variant="secondary" className="ml-2">
              {data.length} nota{data.length !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          {selectedIds.length > 0 && (
            <Badge variant="outline" className="gap-1">
              <Check className="h-3 w-3" />
              {selectedIds.length} selecionada{selectedIds.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 sticky left-0 bg-card z-10">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        (el as any).indeterminate = someSelected;
                      }
                    }}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todas"
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead className="min-w-[100px]">NFS-e</TableHead>
                <TableHead className="min-w-[200px]">Tomador</TableHead>
                <TableHead className="min-w-[120px]">Data Emissão</TableHead>
                <TableHead className="min-w-[100px] text-right">Valor</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[180px] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((nfse) => (
                <TableRow
                  key={nfse.id}
                  className={selectedIds.includes(nfse.id) ? "bg-muted/50" : ""}
                  data-testid={`row-nfse-${nfse.id}`}
                >
                  <TableCell className="sticky left-0 bg-inherit z-10">
                    <Checkbox
                      checked={selectedIds.includes(nfse.id)}
                      onCheckedChange={() => handleSelectItem(nfse.id)}
                      aria-label={`Selecionar NFS-e ${nfse.numeroNfse}`}
                      data-testid={`checkbox-nfse-${nfse.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-medium" data-testid={`text-numero-${nfse.id}`}>
                      #{nfse.numeroNfse}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium truncate max-w-[200px]" data-testid={`text-nome-${nfse.id}`}>
                        {nfse.nomeTomador || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatCNPJ(nfse.cnpjTomador)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm" data-testid={`text-data-${nfse.id}`}>
                      {nfse.dataEmissao ? formatDate(nfse.dataEmissao) : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium" data-testid={`text-valor-${nfse.id}`}>
                      {nfse.valor ? formatCurrency(nfse.valor) : "—"}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(nfse.statusNfse)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => onDownload(nfse.id, "pdf")}
                        disabled={!nfse.arquivoPdfPath || isDownloading === nfse.id}
                        data-testid={`button-download-pdf-${nfse.id}`}
                      >
                        {isDownloading === nfse.id ? (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <FileText className="h-3 w-3" />
                        )}
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => onDownload(nfse.id, "xml")}
                        disabled={!nfse.arquivoXmlPath || isDownloading === nfse.id}
                        data-testid={`button-download-xml-${nfse.id}`}
                      >
                        {isDownloading === nfse.id ? (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <FileCode className="h-3 w-3" />
                        )}
                        XML
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
