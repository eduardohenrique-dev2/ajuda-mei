import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro MEI — Sala do Empreendedor" }] }),
  component: SignupPage,
});

function formatCNPJ(v: string) {
  return v.replace(/\D/g, "")
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, authLoading, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (nome.trim().length < 3) return toast.error("Informe seu nome completo");
    const cnpjDigits = cnpj.replace(/\D/g, "");
    if (cnpjDigits.length !== 14) return toast.error("CNPJ inválido");

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { nome, cnpj: cnpjDigits, telefone },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Cadastro criado! Enviamos um link de confirmação para " + email, { duration: 6000 });
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Início</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Cadastro MEI</h1>
        <p className="text-sm text-muted-foreground">
          Sua conta começará como <span className="text-warning">pendente de validação</span>. Um atendente confirma na primeira sessão.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" required value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input id="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" required
              value={cnpj} onChange={e => setCnpj(formatCNPJ(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone (opcional)</Label>
            <Input id="telefone" type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha (mín. 6 caracteres)</Label>
            <PasswordInput id="password" autoComplete="new-password" required minLength={6}
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
