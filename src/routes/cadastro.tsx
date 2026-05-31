import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { maskCNPJ, maskPhoneBR, onlyDigits, isValidCNPJ, isValidPhoneBR } from "@/lib/masks";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro MEI — Sala do Empreendedor" }] }),
  component: SignupPage,
});

type FieldErrors = Partial<Record<"nome" | "cnpj" | "telefone" | "email" | "password", string>>;

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, authLoading, navigate]);

  const setErr = (key: keyof FieldErrors, msg?: string) =>
    setErrors((e) => ({ ...e, [key]: msg }));

  const validateNome = () => {
    if (nome.trim().length < 3) {
      setErr("nome", "Digite seu nome completo (mínimo 3 letras).");
      return false;
    }
    setErr("nome", undefined);
    return true;
  };
  const validateCnpj = () => {
    if (!isValidCNPJ(cnpj)) {
      setErr("cnpj", "CNPJ inválido. Confira os números informados.");
      return false;
    }
    setErr("cnpj", undefined);
    return true;
  };
  const validateTelefone = () => {
    if (telefone && !isValidPhoneBR(telefone)) {
      setErr("telefone", "Telefone inválido. Use DDD + número.");
      return false;
    }
    setErr("telefone", undefined);
    return true;
  };
  const validateEmail = () => {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!ok) {
      setErr("email", "Informe um e-mail válido.");
      return false;
    }
    setErr("email", undefined);
    return true;
  };
  const validatePassword = () => {
    if (password.length < 8) {
      setErr("password", "Senha deve ter ao menos 8 caracteres.");
      return false;
    }
    setErr("password", undefined);
    return true;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = [validateNome(), validateCnpj(), validateTelefone(), validateEmail(), validatePassword()].every(Boolean);
    if (!ok) {
      toast.error("Confira os campos destacados.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { nome: nome.trim(), cnpj: onlyDigits(cnpj), telefone: onlyDigits(telefone) },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Cadastro criado! Enviamos um link de confirmação para " + email, { duration: 6000 });
    navigate({ to: "/login", replace: true });
  };

  const fieldHint = (key: keyof FieldErrors) =>
    errors[key] ? (
      <p id={`${key}-error`} role="alert" className="text-xs text-destructive">
        {errors[key]}
      </p>
    ) : null;

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Início</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Cadastro MEI</h1>
        <p className="text-sm text-muted-foreground">
          Sua conta começará como <span className="text-warning">pendente de validação</span>. Um atendente confirma na primeira sessão.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              required
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={validateNome}
              aria-invalid={!!errors.nome}
              aria-describedby={errors.nome ? "nome-error" : undefined}
            />
            {fieldHint("nome")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              required
              value={cnpj}
              onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
              onBlur={validateCnpj}
              aria-invalid={!!errors.cnpj}
              aria-describedby={errors.cnpj ? "cnpj-error" : undefined}
            />
            {fieldHint("cnpj")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone (opcional)</Label>
            <Input
              id="telefone"
              type="tel"
              inputMode="tel"
              placeholder="(11) 99999-9999"
              autoComplete="tel"
              value={telefone}
              onChange={(e) => setTelefone(maskPhoneBR(e.target.value))}
              onBlur={validateTelefone}
              aria-invalid={!!errors.telefone}
              aria-describedby={errors.telefone ? "telefone-error" : undefined}
            />
            {fieldHint("telefone")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={validateEmail}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {fieldHint("email")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha (mín. 8 caracteres)</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={validatePassword}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            {fieldHint("password")}
          </div>

          <Button type="submit" className="min-h-11 w-full" disabled={loading}>
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
