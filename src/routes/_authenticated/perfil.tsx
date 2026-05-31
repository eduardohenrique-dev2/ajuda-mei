import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — Sala do Empreendedor" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const fetchMe = useServerFn(getMyProfile);
  const update = useServerFn(updateMyProfile);
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchMe() });

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setNome(profile.nome ?? "");
      setTelefone(profile.telefone ?? "");
      setCnpj(profile.cnpj ?? "");
    }
  }, [profile]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await update({ data: { nome, telefone, cnpj } });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Perfil atualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Mantenha seus dados atualizados para agilizar o atendimento.</p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <Field label="E-mail" value={profile?.email ?? ""} readOnly />
        <Field label="Status" value={profile?.status ?? "—"} readOnly />
        <Field label="Nome" value={nome} onChange={setNome} required maxLength={120} />
        <Field label="Telefone" value={telefone} onChange={setTelefone} placeholder="(11) 99999-9999" />
        <Field label="CNPJ" value={cnpj} onChange={setCnpj} placeholder="00.000.000/0001-00" />
        <Button type="submit" disabled={busy}>Salvar alterações</Button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, readOnly, ...rest }: {
  label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean;
  placeholder?: string; required?: boolean; maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={e => onChange?.(e.target.value)}
        readOnly={readOnly}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
        disabled={readOnly}
        {...rest}
      />
    </label>
  );
}
