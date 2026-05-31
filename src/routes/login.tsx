import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { MailWarning } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Sala do Empreendedor" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resending, setResending] = useState(false);

  // Redireciona apenas APÓS hidratação concluída — evita loop login↔dashboard.
  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, authLoading, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNeedsConfirmation(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("not confirmed") || msg.includes("confirm")) {
        setNeedsConfirmation(true);
        return toast.error("E-mail ainda não confirmado. Verifique sua caixa de entrada.");
      }
      return toast.error("E-mail ou senha inválidos.");
    }
    toast.success("Bem-vindo!");
    // O useEffect acima fará o redirect quando o AuthProvider hidratar o user.
    // Não navegar aqui evita corrida entre router.invalidate() e o redirect.
  };

  const resend = async () => {
    if (!email) return toast.error("Informe seu e-mail acima.");
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setResending(false);
    if (error) return toast.error(error.message);
    toast.success("Reenviamos o link de confirmação.");
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Início</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="text-sm text-muted-foreground">Acesse sua conta da Sala do Empreendedor.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link to="/esqueci-senha" className="text-xs text-primary hover:underline">
                Esqueci minha senha
              </Link>
            </div>
            <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="min-h-11 w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        {needsConfirmation && (
          <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
            <div className="flex items-start gap-2">
              <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="space-y-2">
                <p className="text-foreground">
                  Confirme seu e-mail para acessar. Verifique a caixa de entrada e a pasta de spam.
                </p>
                <button
                  type="button"
                  onClick={resend}
                  disabled={resending}
                  className="font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {resending ? "Reenviando..." : "Reenviar link de confirmação"}
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link to="/cadastro" className="font-medium text-primary hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
