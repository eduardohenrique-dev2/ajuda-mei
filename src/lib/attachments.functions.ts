import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Cria URL assinada de upload — o caller envia o binário direto para o Storage.
export const createUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ticket_id: string; filename: string }) =>
    z.object({
      ticket_id: z.string().uuid(),
      filename: z.string().trim().min(1).max(200),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    // Confirma que o usuário tem acesso ao ticket (RLS aplicará na storage também)
    const { data: tk, error: te } = await context.supabase
      .from("tickets")
      .select("id")
      .eq("id", data.ticket_id)
      .maybeSingle();
    if (te) throw new Error(te.message);
    if (!tk) throw new Error("Ticket não encontrado");

    const safeName = data.filename.replace(/[^\w.\-]+/g, "_").slice(0, 120);
    const path = `${data.ticket_id}/${crypto.randomUUID()}-${safeName}`;
    const { data: signed, error } = await context.supabase
      .storage.from("ticket-attachments")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const createDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) =>
    z.object({ path: z.string().trim().min(3).max(500) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase
      .storage.from("ticket-attachments")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
