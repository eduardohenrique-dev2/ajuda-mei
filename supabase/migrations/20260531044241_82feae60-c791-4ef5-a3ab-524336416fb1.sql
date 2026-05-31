-- Phase 3: attachments + chat history index + storage bucket

ALTER TABLE public.ticket_messages
  ADD COLUMN IF NOT EXISTS anexos jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS chat_history_sessao_idx
  ON public.chat_history (sessao_id, criado_em);

-- Storage bucket (private; access via signed URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: <ticket_id>/<uuid>.<ext>
-- MEI: pode ler/gravar arquivos de tickets que pertencem a ele.
-- Staff: pode tudo.

CREATE POLICY "mei view own ticket files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id::text = split_part(name, '/', 1)
      AND (t.mei_id = auth.uid() OR public.is_staff(auth.uid()))
  )
);

CREATE POLICY "mei upload own ticket files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id::text = split_part(name, '/', 1)
      AND (t.mei_id = auth.uid() OR public.is_staff(auth.uid()))
  )
);

CREATE POLICY "staff delete ticket files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND public.is_staff(auth.uid())
);

-- Sectors: permitir gerenciar — políticas já existem (staff manage sectors).
-- Profile: já permite update próprio.