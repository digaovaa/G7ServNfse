import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BatchDownloadBarProps {
  selectedCount: number;
  onDownload: () => void;
  onClear: () => void;
  isLoading?: boolean;
}

export function BatchDownloadBar({
  selectedCount,
  onDownload,
  onClear,
  isLoading,
}: BatchDownloadBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium" data-testid="text-selected-count">
              {selectedCount} nota{selectedCount !== 1 ? "s" : ""} selecionada
              {selectedCount !== 1 ? "s" : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              Clique para baixar em lote
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onClear}
            disabled={isLoading}
            data-testid="button-clear-selection"
          >
            <X className="mr-2 h-4 w-4" />
            Limpar
          </Button>
          <Button
            onClick={onDownload}
            disabled={isLoading}
            data-testid="button-batch-download"
          >
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Gerando ZIP...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Baixar Selecionadas em ZIP
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
