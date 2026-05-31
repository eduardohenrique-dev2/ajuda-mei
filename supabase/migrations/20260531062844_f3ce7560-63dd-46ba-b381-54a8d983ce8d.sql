
-- 1) Adiciona CPF opcional ao profile (CPF OU CNPJ)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf varchar(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cnae varchar(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notificacoes boolean NOT NULL DEFAULT true;

-- 2) Tabela de analytics events (rastreio de uso)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name varchar(60) NOT NULL,
  user_id uuid,
  session_id varchar(80),
  url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events (event_name, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events (user_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_criado_em ON public.analytics_events (criado_em DESC);

-- 3) GRANTs — tabela escrita só pelo backend (supabaseAdmin) e lida por staff
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;

-- 4) RLS — staff lê tudo, ninguém grava pelo client (apenas service_role/admin)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff view analytics events"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- 5) Função agregadora para dashboard BI
CREATE OR REPLACE FUNCTION public.get_event_stats(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.analytics_events WHERE criado_em >= now() - (_days || ' days')::interval),
    'por_evento', (
      SELECT coalesce(jsonb_object_agg(event_name, total), '{}'::jsonb)
      FROM (
        SELECT event_name, count(*)::int AS total
        FROM public.analytics_events
        WHERE criado_em >= now() - (_days || ' days')::interval
        GROUP BY event_name
      ) e
    ),
    'usuarios_unicos', (
      SELECT count(DISTINCT user_id) FROM public.analytics_events
      WHERE criado_em >= now() - (_days || ' days')::interval AND user_id IS NOT NULL
    ),
    'sessoes_unicas', (
      SELECT count(DISTINCT session_id) FROM public.analytics_events
      WHERE criado_em >= now() - (_days || ' days')::interval AND session_id IS NOT NULL
    )
  ) INTO result;

  RETURN result;
END;
$$;
