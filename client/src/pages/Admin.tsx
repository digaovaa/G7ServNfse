import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Upload, FileText, Trash2 } from "lucide-react";
import { z } from "zod";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatCNPJ } from "@/lib/authUtils";
import type { NfseMetadata } from "@shared/schema";

const createNfseSchema = z.object({
  numeroNfse: z.string().min(1, "Numero da NFS-e e obrigatorio"),
  cnpjPrestador: z.string().min(14, "CNPJ do prestador e obrigatorio"),
  cnpjTomador: z.string().min(14, "CNPJ do tomador e obrigatorio"),
  nomeTomador: z.string().min(1, "Nome do tomador e obrigatorio"),
  dataEmissao: z.string().min(1, "Data de emissao e obrigatoria"),
  valor: z.string().min(1, "Valor e obrigatorio"),
  descricao: z.string().optional(),
  statusNfse: z.string().default("emitida"),
});

type CreateNfseForm = z.infer<typeof createNfseSchema>;

export default function Admin() {
  const { toast } = useToast();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [xmlFile, setXmlFile] = useState<File | null>(null);

  const form = useForm<CreateNfseForm>({
    resolver: zodResolver(createNfseSchema),
    defaultValues: {
      numeroNfse: "",
      cnpjPrestador: "",
      cnpjTomador: "",
      nomeTomador: "",
      dataEmissao: "",
      valor: "",
      descricao: "",
      statusNfse: "emitida",
    },
  });

  const { data: recentNfse = [] } = useQuery<NfseMetadata[]>({
    queryKey: ["/api/admin/nfse-recent"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateNfseForm) => {
      const formData = new FormData();
      formData.append("numeroNfse", data.numeroNfse);
      formData.append("cnpjPrestador", data.cnpjPrestador.replace(/\D/g, ""));
      formData.append("cnpjTomador", data.cnpjTomador.replace(/\D/g, ""));
      formData.append("nomeTomador", data.nomeTomador);
      formData.append("dataEmissao", data.dataEmissao);
      formData.append("valor", data.valor);
      if (data.descricao) formData.append("descricao", data.descricao);
      formData.append("statusNfse", data.statusNfse);
      if (pdfFile) formData.append("pdf", pdfFile);
      if (xmlFile) formData.append("xml", xmlFile);

      const response = await fetch("/api/admin/nfse", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Erro ao criar NFS-e");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "NFS-e criada com sucesso",
        description: "A nota fiscal foi adicionada ao sistema.",
      });
      form.reset();
      setPdfFile(null);
      setXmlFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/nfse-recent"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar NFS-e",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreateNfseForm) => {
    createMutation.mutate(data);
  };

  const handleCNPJChange = (
    field: "cnpjPrestador" | "cnpjTomador",
    value: string
  ) => {
    form.setValue(field, formatCNPJ(value));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Administracao</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as notas fiscais do sistema
          </p>
        </div>

        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Nova NFS-e
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="numeroNfse"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numero da NFS-e</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="2024001234"
                              className="font-mono"
                              data-testid="input-numero-nfse"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dataEmissao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Emissao</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="date"
                              data-testid="input-data-emissao"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cnpjPrestador"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ do Prestador</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="00.000.000/0000-00"
                              className="font-mono"
                              onChange={(e) =>
                                handleCNPJChange("cnpjPrestador", e.target.value)
                              }
                              data-testid="input-cnpj-prestador"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cnpjTomador"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ do Tomador</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="00.000.000/0000-00"
                              className="font-mono"
                              onChange={(e) =>
                                handleCNPJChange("cnpjTomador", e.target.value)
                              }
                              data-testid="input-cnpj-tomador"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="nomeTomador"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Tomador</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Nome do condominio ou empresa"
                            data-testid="input-nome-tomador"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="valor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor (R$)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              data-testid="input-valor"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="statusNfse"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="emitida">Emitida</SelectItem>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="cancelada">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descricao do Servico</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Descricao do servico prestado"
                            className="resize-none"
                            rows={3}
                            data-testid="input-descricao"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Arquivo PDF</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                          className="flex-1"
                          data-testid="input-pdf-file"
                        />
                        {pdfFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setPdfFile(null)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {pdfFile && (
                        <p className="text-xs text-muted-foreground">
                          {pdfFile.name}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Arquivo XML</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept=".xml"
                          onChange={(e) => setXmlFile(e.target.files?.[0] || null)}
                          className="flex-1"
                          data-testid="input-xml-file"
                        />
                        {xmlFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setXmlFile(null)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {xmlFile && (
                        <p className="text-xs text-muted-foreground">
                          {xmlFile.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="w-full"
                    data-testid="button-create-nfse"
                  >
                    {createMutation.isPending ? (
                      <>
                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Criar NFS-e
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {recentNfse.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  NFS-e Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentNfse.slice(0, 10).map((nfse) => (
                    <div
                      key={nfse.id}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    >
                      <div>
                        <p className="font-medium font-mono">
                          #{nfse.numeroNfse}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {nfse.nomeTomador}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{nfse.dataEmissao}</p>
                        <p className="text-sm text-muted-foreground">
                          {nfse.statusNfse}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
