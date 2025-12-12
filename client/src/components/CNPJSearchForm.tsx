import { useState } from "react";
import { Search, X, Calendar, Globe } from "lucide-react";
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
import { formatCNPJ, validateCNPJ } from "@/lib/authUtils";

interface CNPJSearchFormProps {
  onSearch: (cnpj: string, dataInicio?: string, dataFim?: string) => void;
  onSearchPortal?: (cnpj: string, dataInicio?: string, dataFim?: string, sistema?: "nacional" | "municipal") => void;
  isLoading?: boolean;
  isPortalLoading?: boolean;
  portalDisponivel?: boolean;
}

export function CNPJSearchForm({ onSearch, onSearchPortal, isLoading, isPortalLoading, portalDisponivel }: CNPJSearchFormProps) {
  const [cnpj, setCnpj] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [sistema, setSistema] = useState<"nacional" | "municipal">("nacional");
  const [error, setError] = useState("");

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpj(formatted);
    if (error) setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanCnpj = cnpj.replace(/\D/g, "");
    
    if (cleanCnpj.length !== 14) {
      setError("CNPJ deve ter 14 digitos");
      return;
    }
    
    setError("");
    onSearch(cleanCnpj, dataInicio || undefined, dataFim || undefined);
  };

  const handleSearchPortal = () => {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    
    if (cleanCnpj.length !== 14) {
      setError("CNPJ deve ter 14 digitos");
      return;
    }
    
    setError("");
    if (onSearchPortal) {
      onSearchPortal(cleanCnpj, dataInicio || undefined, dataFim || undefined, sistema);
    }
  };

  const handleClear = () => {
    setCnpj("");
    setDataInicio("");
    setDataFim("");
    setError("");
  };

  const today = new Date().toISOString().split("T")[0];
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-primary" />
          Buscar NFS-e por CNPJ
        </CardTitle>
        {portalDisponivel && (
          <CardDescription>
            Busque nas notas salvas localmente ou diretamente no portal do governo
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ do Prestador</Label>
            <div className="relative">
              <Input
                id="cnpj"
                type="text"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={handleCNPJChange}
                className={`font-mono ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
                data-testid="input-cnpj"
                aria-describedby={error ? "cnpj-error" : undefined}
              />
              {cnpj && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => {
                    setCnpj("");
                    setError("");
                  }}
                  data-testid="button-clear-cnpj"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {error && (
              <p id="cnpj-error" className="text-sm text-destructive" data-testid="text-cnpj-error">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Digite o CNPJ do prestador para buscar as notas fiscais emitidas
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data Inicio
              </Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                min={ninetyDaysAgo}
                max={dataFim || today}
                data-testid="input-data-inicio"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data Fim
              </Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                min={dataInicio || ninetyDaysAgo}
                max={today}
                data-testid="input-data-fim"
              />
            </div>
          </div>

          {portalDisponivel && (
            <div className="space-y-2">
              <Label>Sistema do Portal</Label>
              <Select value={sistema} onValueChange={(v) => setSistema(v as "nacional" | "municipal")}>
                <SelectTrigger data-testid="select-sistema">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nacional">NFS-e Nacional (gov.br)</SelectItem>
                  <SelectItem value="municipal">NFS-e Municipal (Recife)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={isLoading} data-testid="button-search">
              {isLoading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar Local
                </>
              )}
            </Button>
            {portalDisponivel && onSearchPortal && (
              <Button
                type="button"
                variant="outline"
                disabled={isLoading || isPortalLoading}
                onClick={handleSearchPortal}
                className="gap-2"
                data-testid="button-search-portal"
              >
                {isPortalLoading ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4" />
                    Buscar no Portal
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              disabled={isLoading}
              data-testid="button-clear"
            >
              Limpar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
