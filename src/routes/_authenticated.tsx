import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMyRoles } from "@/lib/use-roles";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Ticket, BookOpen, LogOut, Building2, Inbox, BarChart3,
  ShieldCheck, User, MapPin, FileSearch, Menu, FolderArchive,
} from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { FullPageLoader } from "@/components/layout/FullPageLoader";

export const Route = createFileRoute("/_authenticated")({
  // Auth is gated client-side via useAuth() (status-aware, hydration-safe).
  // Never throw redirect() in beforeLoad based on a stale token — it caused
  // a dashboard ↔ login oscillation when the session hadn't hydrated yet.
  component: AuthenticatedLayout,
});

type NavItem = { to: string; label: string; icon: ComponentType<{ className?: string }> };

const meiNav: NavItem[] = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/tickets", label: "Meus tickets", icon: Ticket },
  { to: "/documentos", label: "Documentos", icon: FolderArchive },
  { to: "/solutions", label: "Soluções", icon: BookOpen },
  { to: "/perfil", label: "Meu perfil", icon: User },
];

const staffNav: NavItem[] = [
  { to: "/staff/tickets", label: "Fila de tickets", icon: Inbox },
  { to: "/staff/documentos", label: "Revisar documentos", icon: FolderArchive },
  { to: "/staff/solutions", label: "Gerir soluções", icon: BookOpen },
  { to: "/staff/sectors", label: "Setores", icon: MapPin },
];

const adminNav: NavItem[] = [
  { to: "/staff/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/staff/audit", label: "Auditoria LGPD", icon: FileSearch },
];

function NavList({
  items,
  pathname,
  label,
  onItemClick,
}: {
  items: NavItem[];
  pathname: string;
  label?: string;
  onItemClick?: () => void;
}) {
  return (
    <div>
      {label && (
        <p className="mb-2 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      )}
      <nav aria-label={label ?? "Navegação principal"} className="flex flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to as any}
              onClick={onItemClick}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function AuthenticatedLayout() {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Redireciona APENAS depois que a hidratação terminou.
  useEffect(() => {
    if (status === "unauthenticated") {
      navigate({
        to: "/login",
        search: { redirect: pathname } as never,
        replace: true,
      });
    }
  }, [status, navigate, pathname]);

  const { data: rolesData } = useMyRoles();
  const isStaff = !!rolesData?.isStaff;
  const isAdmin = !!rolesData?.isAdmin;
  const staffNavWithAdmin: NavItem[] = isAdmin
    ? [...staffNav, { to: "/staff/audit", label: "Auditoria LGPD", icon: FileSearch }]
    : staffNav;

  const [mobileOpen, setMobileOpen] = useState(false);

  // Fecha o drawer ao trocar de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Skeleton fullscreen enquanto auth hidrata, ou enquanto o redirect dispara.
  if (status === "loading" || !user) {
    return <FullPageLoader label="Verificando sua sessão..." />;
  }


  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const NavContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      <NavList items={meiNav} pathname={pathname} onItemClick={onItemClick} />
      {isStaff && (
        <NavList
          items={staffNavWithAdmin}
          pathname={pathname}
          label="Atendimento"
          onItemClick={onItemClick}
        />
      )}
    </>
  );

  const UserCard = () => (
    <div className="rounded-lg border border-sidebar-border bg-card/40 p-3">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary">
          {isStaff ? <ShieldCheck className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{user?.email}</p>
          <p className="text-[10px] text-muted-foreground">{isStaff ? "Atendente" : "MEI"}</p>
        </div>
      </div>
      <Button
        onClick={logout}
        variant="ghost"
        size="sm"
        aria-label="Sair da conta"
        className="mt-3 w-full justify-start text-muted-foreground"
      >
        <LogOut className="mr-2 h-4 w-4" aria-hidden="true" /> Sair
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-dvh w-full bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold" aria-hidden="true">SE</div>
          <span className="font-semibold tracking-tight">Sala do Empreendedor</span>
        </Link>

        <div className="mt-4 flex-1">
          <NavContent />
        </div>

        <div className="mt-auto">
          <UserCard />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBanner />

        {/* Header mobile */}
        <header className="flex items-center justify-between gap-2 border-b border-border/60 bg-card/30 px-4 py-3 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Abrir menu de navegação"
                className="min-h-11 min-w-11"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-0">
              <SheetHeader className="border-b border-sidebar-border p-4">
                <SheetTitle className="flex items-center gap-2 text-left">
                  <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground text-sm font-bold" aria-hidden="true">SE</div>
                  Sala do Empreendedor
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-4">
                <NavContent onItemClick={() => setMobileOpen(false)} />
              </div>
              <div className="border-t border-sidebar-border p-4">
                <UserCard />
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-xs font-bold" aria-hidden="true">SE</div>
            <span className="text-sm font-semibold">Sala do Empreendedor</span>
          </Link>

          <Button
            onClick={logout}
            variant="ghost"
            size="icon"
            aria-label="Sair da conta"
            className="min-h-11 min-w-11"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          <div className="mx-auto max-w-6xl p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {!isStaff && <ChatWidget />}
    </div>
  );
}
