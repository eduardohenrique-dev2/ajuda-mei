
-- Enum status
DO $$ BEGIN
  CREATE TYPE public.document_status AS ENUM ('uploaded','processing','pending_review','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticket_id uuid NULL,
  protocol_id varchar(64) NULL,
  tipo varchar(64) NOT NULL DEFAULT 'outro',
  file_name varchar(255) NOT NULL,
  file_path text NOT NULL,
  mime_type varchar(128) NOT NULL,
  file_size_bytes integer NOT NULL DEFAULT 0,
  ocr_text text NULL,
  extracted_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.document_status NOT NULL DEFAULT 'uploaded',
  version integer NOT NULL DEFAULT 1,
  parent_document_id uuid NULL REFERENCES public.documents(id) ON DELETE SET NULL,
  reviewed_by uuid NULL,
  reviewed_at timestamptz NULL,
  rejection_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_ticket ON public.documents(ticket_id);

GRANT SELECT, INSERT, UPDATE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner view documents" ON public.documents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "owner insert documents" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner update own pending documents" ON public.documents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('uploaded','processing','pending_review','rejected'));

CREATE POLICY "staff update any document" ON public.documents
  FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents','documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "owner read own documents files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_staff(auth.uid()))
  );

CREATE POLICY "owner upload own documents files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "owner delete own documents files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_staff(auth.uid()))
  );

-- Métricas de documentos para staff
CREATE OR REPLACE FUNCTION public.get_document_stats(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT jsonb_build_object(
    'enviados', (SELECT count(*) FROM public.documents WHERE created_at >= now() - (_days || ' days')::interval),
    'pendentes_revisao', (SELECT count(*) FROM public.documents WHERE status = 'pending_review'),
    'aprovados', (SELECT count(*) FROM public.documents WHERE status = 'approved' AND created_at >= now() - (_days || ' days')::interval),
    'rejeitados', (SELECT count(*) FROM public.documents WHERE status = 'rejected' AND created_at >= now() - (_days || ' days')::interval),
    'taxa_aprovacao', (
      SELECT CASE WHEN count(*) = 0 THEN 0
        ELSE round(100.0 * count(*) FILTER (WHERE status = 'approved') / count(*), 1)
      END
      FROM public.documents
      WHERE status IN ('approved','rejected') AND created_at >= now() - (_days || ' days')::interval
    ),
    'tempo_medio_validacao_min', (
      SELECT coalesce(round(avg(EXTRACT(EPOCH FROM (reviewed_at - created_at))/60.0)::numeric, 1), 0)
      FROM public.documents
      WHERE reviewed_at IS NOT NULL AND created_at >= now() - (_days || ' days')::interval
    ),
    'por_tipo', (
      SELECT coalesce(jsonb_object_agg(tipo, total), '{}'::jsonb)
      FROM (
        SELECT tipo, count(*)::int AS total
        FROM public.documents
        WHERE created_at >= now() - (_days || ' days')::interval
        GROUP BY tipo ORDER BY count(*) DESC LIMIT 10
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;
