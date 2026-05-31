import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { myRoles } from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/staff")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: StaffGuard,
});

function StaffGuard() {
  const fetchRoles = useServerFn(myRoles);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-roles-guard"],
    queryFn: () => fetchRoles(),
  });

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Verificando permissões...</div>;
  }
  if (error || !data?.isStaff) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6">
        <h2 className="font-medium text-destructive">Acesso restrito</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta área é apenas para atendentes, gestores e administradores.
        </p>
      </div>
    );
  }
  return <Outlet />;
}
