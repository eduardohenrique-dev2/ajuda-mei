import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useMyRoles } from "@/lib/use-roles";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Ticket, BookOpen, LogOut, Building2, Inbox, BarChart3, ShieldCheck, User, MapPin } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

const meiNav = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/tickets", label: "Meus tickets", icon: Ticket },
  { to: "/solutions", label: "Soluções", icon: BookOpen },
  { to: "/perfil", label: "Meu perfil", icon: User },
];

const staffNav = [
  { to: "/staff/tickets", label: "Fila de tickets", icon: Inbox },
  { to: "/staff/solutions", label: "Gerir soluções", icon: BookOpen },
  { to: "/staff/sectors", label: "Setores", icon: MapPin },
  { to: "/staff/analytics", label: "Analytics", icon: BarChart3 },
];

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

function NavList({ items, pathname, label }: { items: NavItem[]; pathname: string; label?: string }) {
  return (
    <div>
      {label && (
        <p className="mb-2 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      )}
      <nav className="flex flex-col gap-1">
        {items.map(item => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to as any}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const { data: rolesData } = useMyRoles();
  const isStaff = !!rolesData?.isStaff;

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold">SE</div>
          <span className="font-semibold tracking-tight">Sala do Empreendedor</span>
        </Link>

        <div className="mt-4">
          <NavList items={meiNav} pathname={pathname} />
          {isStaff && <NavList items={staffNav} pathname={pathname} label="Atendimento" />}
        </div>

        <div className="mt-auto rounded-lg border border-sidebar-border bg-card/40 p-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary">
              {isStaff ? <ShieldCheck className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{user?.email}</p>
              <p className="text-[10px] text-muted-foreground">{isStaff ? "Atendente" : "MEI"}</p>
            </div>
          </div>
          <Button onClick={logout} variant="ghost" size="sm" className="mt-3 w-full justify-start text-muted-foreground">
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-between border-b border-border/60 bg-card/30 px-6 py-3 md:hidden">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-xs font-bold">SE</div>
            <span className="text-sm font-semibold">Sala do Empreendedor</span>
          </Link>
          <Button onClick={logout} variant="ghost" size="sm"><LogOut className="h-4 w-4" /></Button>
        </header>

        <div className="mx-auto max-w-6xl p-6">
          <Outlet />
        </div>
      </main>

      {!isStaff && <ChatWidget />}
    </div>
  );
}
