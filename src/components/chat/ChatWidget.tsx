import { useState, useRef, useEffect, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X, Send, ExternalLink, FileText } from "lucide-react";
import { classifyIntent } from "@/lib/ai.functions";
import { searchSolutions } from "@/lib/solutions.functions";
import { createTicket } from "@/lib/tickets.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Msg =
  | { role: "user"; text: string }
  | { role: "bot"; text: string; solution?: { id: string; titulo: string; descricao: string; link_oficial?: string | null } }
  | { role: "system"; text: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "bot", text: "Olá! Sou o assistente da Sala do Empreendedor. Em que posso ajudar hoje? (Ex: \"como pagar DAS atrasado\")" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const classify = useServerFn(classifyIntent);
  const search = useServerFn(searchSolutions);
  const create = useServerFn(createTicket);
  const queryClient = useQueryClient();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text }]);
    setBusy(true);

    try {
      const [intent, results] = await Promise.all([
        classify({ data: { message: text } }),
        search({ data: { query: text, limit: 1 } }),
      ]);

      const top = results[0];
      if (top && top.similarity >= 0.75) {
        setMessages(m => [...m, {
          role: "bot",
          text: `Encontrei isto na base oficial (relevância ${(top.similarity * 100).toFixed(0)}%):`,
          solution: top,
        }]);
      } else {
        // Abrir ticket automático
        const ticket = await create({ data: {
          titulo: intent.titulo_curto,
          descricao: text,
          categoria: intent.categoria,
          canal: "web",
        }});
        queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
        setMessages(m => [...m, {
          role: "system",
          text: `Não encontrei uma resposta direta na base. Abri o ticket ${ticket.protocolo} — um atendente vai retornar em breve.`,
        }]);
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      toast.error(msg);
      setMessages(m => [...m, { role: "bot", text: "Tive um problema para processar. Tente novamente." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Fechar chat" : "Abrir chat"}
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <header className="flex items-center justify-between border-b border-border bg-popover px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <p className="text-sm font-medium">Assistente da Sala</p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Beta</span>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <MsgBubble key={i} msg={m} />
            ))}
            {busy && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                pensando...
              </div>
            )}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite sua dúvida..."
              maxLength={500}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              disabled={busy}
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

function MsgBubble({ msg }: { msg: Msg }) {
  if (msg.role === "system") {
    return (
      <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <p className="text-foreground">{msg.text}</p>
        </div>
      </div>
    );
  }
  if (msg.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
        {msg.text}
      </div>
    );
  }
  return (
    <div className="mr-auto max-w-[90%] space-y-2">
      <div className="rounded-2xl rounded-bl-sm bg-popover px-3 py-2 text-sm">{msg.text}</div>
      {msg.solution && (
        <div className="rounded-lg border border-border bg-background p-3 text-sm">
          <p className="font-medium">{msg.solution.titulo}</p>
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{msg.solution.descricao}</p>
          {msg.solution.link_oficial && (
            <a href={msg.solution.link_oficial} target="_blank" rel="noreferrer"
               className="mt-2 inline-flex items-center gap-1 text-xs text-info hover:underline">
              Abrir link oficial <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
