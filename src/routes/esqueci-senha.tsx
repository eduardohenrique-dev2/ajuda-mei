import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => ({ meta: [{ title: "Recuperar senha — Sala do Empreendedor" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Enviamos um link de recuperação para seu e-mail.");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm">
        <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">← Voltar ao login</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground">
          Informe o e-mail da sua conta. Enviaremos um link para você definir uma nova senha.
        </p>

        {sent ? (
          <div className="mt-6 rounded-md border border-success/40 bg-success/10 p-4 text-sm">
            Link enviado para <strong>{email}</strong>. Verifique sua caixa de entrada e a pasta de spam.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
