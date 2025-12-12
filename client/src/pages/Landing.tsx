import { FileText, Shield, Download, Clock, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const features = [
    {
      icon: Zap,
      title: "Download Automatizado",
      description:
        "Baixe NFS-e de forma automática, sem precisar acessar o portal manualmente.",
    },
    {
      icon: Download,
      title: "Download em Lote",
      description:
        "Selecione múltiplas notas e baixe todas de uma vez em um arquivo ZIP.",
    },
    {
      icon: Shield,
      title: "Acesso Seguro",
      description:
        "Sistema com autenticação e controle de acesso por função (admin/operador).",
    },
    {
      icon: Clock,
      title: "Histórico Completo",
      description:
        "Acompanhe todos os downloads realizados com data, hora e detalhes.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold" data-testid="text-logo">
              Download NFS-e
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={handleLogin} data-testid="button-login-header">
              Entrar
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-16 md:py-24 px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Sistema exclusivo G7 Serv</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Download Automatizado de{" "}
              <span className="text-primary">NFS-e</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Simplifique a gestão de Notas Fiscais de Serviço. Busque por CNPJ,
              baixe PDFs e XMLs, e mantenha tudo organizado em um só lugar.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" onClick={handleLogin} data-testid="button-login-hero">
                <FileText className="mr-2 h-5 w-5" />
                Acessar Sistema
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 md:px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Recursos do Sistema
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Desenvolvido para otimizar o trabalho do setor fiscal, com foco
                em produtividade e organização.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="border-0 bg-card">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-primary text-primary-foreground border-0">
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Pronto para começar?
                </h2>
                <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
                  Acesse o sistema e comece a baixar suas NFS-e de forma rápida e
                  organizada.
                </p>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={handleLogin}
                  data-testid="button-login-cta"
                >
                  Fazer Login
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-4 md:px-6">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} G7 Serv - Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}
