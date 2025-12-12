import { FileText, LogOut, User, History, Home, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { user } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden font-semibold sm:inline-block" data-testid="text-app-title">
              Download NFS-e
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="/">
              <Button
                variant={location === "/" ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                data-testid="link-dashboard"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/historico">
              <Button
                variant={location === "/historico" ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                data-testid="link-history"
              >
                <History className="h-4 w-4" />
                Histórico
              </Button>
            </Link>
            {user?.role === "admin" && (
              <Link href="/admin">
                <Button
                  variant={location === "/admin" ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                  data-testid="link-admin"
                >
                  <Settings className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full"
                data-testid="button-user-menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.profileImageUrl || undefined}
                    alt={user?.firstName || "Usuário"}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user?.firstName && (
                    <p className="font-medium" data-testid="text-user-name">
                      {user.firstName} {user.lastName}
                    </p>
                  )}
                  {user?.email && (
                    <p
                      className="text-xs text-muted-foreground truncate max-w-[180px]"
                      data-testid="text-user-email"
                    >
                      {user.email}
                    </p>
                  )}
                  <Badge variant="secondary" className="w-fit mt-1" size="sm">
                    {user?.role === "admin" ? "Administrador" : "Operador"}
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
              <Link href="/" className="md:hidden">
                <DropdownMenuItem data-testid="menu-item-dashboard">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
              </Link>
              <Link href="/historico" className="md:hidden">
                <DropdownMenuItem data-testid="menu-item-history">
                  <History className="mr-2 h-4 w-4" />
                  Histórico
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
                data-testid="button-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
