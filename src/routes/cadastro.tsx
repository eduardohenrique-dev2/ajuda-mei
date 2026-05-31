import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  maskCPF, maskCNPJ, maskPhoneBR, onlyDigits,
  isValidCPF, isValidCNPJ, isValidPhoneBR,
} from "@/lib/masks";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro MEI — Sala do Empreendedor" }] }),
  component: SignupPage,
});

type DocType = "cpf" | "cnpj";
type FieldErrors = Partial<Record<"nome" | "documento" | "telefone" | "email" | "password", string>>;

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [nome, setNome] = useState("");
  const [docType, setDocType] = useState<DocType>("cnpj");
  const [documento, setDocumento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cnae, setCnae] = useState("");
  const [notificacoes, setNotificacoes] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, authLoading, navigate]);

  const setErr = (key: keyof FieldErrors, msg?: string) =>
    setErrors((e) => ({ ...e, [key]: msg }));

  const validateNome = () => {
    if (nome.trim().length < 3) { setErr("nome", "Digite seu nome completo (mínimo 3 letras)."); return false; }
    setErr("nome", undefined); return true;
  };
  const validateDocumento = () => {
    const ok = docType === "cpf" ? isValidCPF(documento) : isValidCNPJ(documento);
    if (!ok) { setErr("documento", `${docType.toUpperCase()} inválido. Confira os números.`); return false; }
    setErr("documento", undefined); return true;
  };
  const validateTelefone = () => {
    if (!isValidPhoneBR(telefone)) { setErr("telefone", "Telefone obrigatório. Use DDD + número."); return false; }
    setErr("telefone", undefined); return true;
  };
  const validateEmail = () => {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!ok) { setErr("email", "Informe um e-mail válido."); return false; }
    setErr("email", undefined); return true;
  };
  const validatePassword = () => {
    if (password.length < 8) { setErr("password", "Senha deve ter ao menos 8 caracteres."); return false; }
    setErr("password", undefined); return true;
  };

  const onChangeDoc = (raw: string) =>
    setDocumento(docType === "cpf" ? maskCPF(raw) : maskCNPJ(raw));

  const switchDocType = (next: DocType) => {
    setDocType(next);
    setDocumento("");
    setErr("documento", undefined);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = [validateNome(), validateDocumento(), validateTelefone(), validateEmail(), validatePassword()].every(Boolean);
    if (!ok) { toast.error("Confira os campos destacados."); return; }

    setLoading(true);
    const meta: Record<string, string | boolean> = {
      nome: nome.trim(),
      telefone: onlyDigits(telefone),
      notificacoes,
    };
    if (docType === "cpf") meta.cpf = onlyDigits(documento);
    else meta.cnpj = onlyDigits(documento);
    if (cnae.trim()) meta.cnae = onlyDigits(cnae);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: meta,
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Cadastro criado! Enviamos um link de confirmação para " + email, { duration: 6000 });
    navigate({ to: "/login", replace: true });
  };

  const fieldHint = (key: keyof FieldErrors) =>
    errors[key] ? (
      <p id={`${key}-error`} role="alert" className="text-xs text-destructive">{errors[key]}</p>
    ) : null;

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Início</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Crie sua conta</h1>
        <p className="text-sm text-muted-foreground">
          Use CPF (pessoa física) ou CNPJ (MEI). Leva menos de 1 minuto.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" required autoComplete="name" value={nome}
              onChange={(e) => setNome(e.target.value)} onBlur={validateNome}
              aria-invalid={!!errors.nome}
              aria-describedby={errors.nome ? "nome-error" : undefined} />
            {fieldHint("nome")}
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <Label htmlFor="documento">Documento</Label>
              <div role="tablist" aria-label="Tipo de documento" className="inline-flex rounded-md border border-border bg-background p-0.5 text-xs">
                {(["cnpj", "cpf"] as DocType[]).map((t) => (
                  <button key={t} type="button" role="tab" aria-selected={docType === t}
                    onClick={() => switchDocType(t)}
                    className={`rounded px-2.5 py-1 transition ${docType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <Input id="documento" inputMode="numeric" required value={documento}
              placeholder={docType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
              onChange={(e) => onChangeDoc(e.target.value)} onBlur={validateDocumento}
              aria-invalid={!!errors.documento}
              aria-describedby={errors.documento ? "documento-error" : undefined} />
            {fieldHint("documento")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" type="tel" inputMode="tel" required autoComplete="tel"
              placeholder="(11) 99999-9999" value={telefone}
              onChange={(e) => setTelefone(maskPhoneBR(e.target.value))} onBlur={validateTelefone}
              aria-invalid={!!errors.telefone}
              aria-describedby={errors.telefone ? "telefone-error" : undefined} />
            {fieldHint("telefone")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} onBlur={validateEmail}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined} />
            {fieldHint("email")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha (mín. 8 caracteres)</Label>
            <PasswordInput id="password" autoComplete="new-password" required minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)} onBlur={validatePassword}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined} />
            {fieldHint("password")}
          </div>

          <details className="rounded-md border border-border bg-background/50 px-3 py-2 text-sm">
            <summary className="cursor-pointer text-muted-foreground">Opcional · CNAE e notificações</summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="cnae" className="text-xs">CNAE principal</Label>
                <Input id="cnae" inputMode="numeric" placeholder="Ex.: 4781400" value={cnae}
                  onChange={(e) => setCnae(onlyDigits(e.target.value).slice(0, 7))} />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={notificacoes}
                  onChange={(e) => setNotificacoes(e.target.checked)}
                  className="h-4 w-4 rounded border-border" />
                Quero receber notificações sobre pendências e novidades
              </label>
            </div>
          </details>

          <Button type="submit" className="min-h-11 w-full" disabled={loading}>
            {loading ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Ou{" "}
          <Link to="/solucoes" className="underline hover:text-foreground">explore sem cadastro</Link>
        </p>
      </div>
    </div>
  );
}
