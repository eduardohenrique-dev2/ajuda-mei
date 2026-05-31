
-- ============= Fase 4: Avaliações (NPS), SLA, Auditoria LGPD =============

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ---------- Avaliações (NPS) ----------
CREATE TABLE public.avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL UNIQUE,
  mei_id uuid NOT NULL,
  nota smallint NOT NULL CHECK (nota BETWEEN 0 AND 10),
  comentario text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.avaliacoes TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;

ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mei cria avaliacao propria" ON public.avaliacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    mei_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
        AND t.mei_id = auth.uid()
        AND t.status IN ('resolvido','encerrado')
    )
  );

CREATE POLICY "ver avaliacoes" ON public.avaliacoes
  FOR SELECT TO authenticated
  USING (mei_id = auth.uid() OR public.is_staff(auth.uid()));

-- ---------- Audit log (LGPD) ----------
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  acao varchar(80) NOT NULL,
  recurso varchar(80) NOT NULL,
  recurso_id uuid,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_recurso ON public.audit_log (recurso, recurso_id);
CREATE INDEX idx_audit_log_actor ON public.audit_log (actor_id, criado_em DESC);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff log insert" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE POLICY "admin view audit" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------- SLA: escalonamento automático ----------
CREATE OR REPLACE FUNCTION public.escalate_stale_tickets()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alta_count int;
  urgente_count int;
BEGIN
  -- Tickets parados > 24h em 'novo' ou 'em_analise' com prioridade normal/baixa => alta
  WITH upd AS (
    UPDATE public.tickets
    SET prioridade = 'alta', atualizado_em = now()
    WHERE status IN ('novo','em_analise')
      AND prioridade IN ('baixa','normal')
      AND atualizado_em < now() - interval '24 hours'
    RETURNING 1
  )
  SELECT count(*) INTO alta_count FROM upd;

  -- Tickets parados > 72h em 'novo' ou 'em_analise' => urgente
  WITH upd2 AS (
    UPDATE public.tickets
    SET prioridade = 'urgente', atualizado_em = now()
    WHERE status IN ('novo','em_analise')
      AND prioridade = 'alta'
      AND atualizado_em < now() - interval '72 hours'
    RETURNING 1
  )
  SELECT count(*) INTO urgente_count FROM upd2;

  INSERT INTO public.audit_log (acao, recurso, detalhes)
  VALUES ('sla_escalation', 'tickets', jsonb_build_object('alta', alta_count, 'urgente', urgente_count));

  RETURN jsonb_build_object('alta', alta_count, 'urgente', urgente_count);
END;
$$;

-- Agenda execução a cada hora
SELECT cron.schedule(
  'sla-escalate-stale-tickets',
  '0 * * * *',
  $$ SELECT public.escalate_stale_tickets(); $$
);

-- ---------- Estende get_analytics com NPS ----------
CREATE OR REPLACE FUNCTION public.get_analytics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT jsonb_build_object(
    'total_30d', (SELECT count(*) FROM public.tickets WHERE criado_em >= now() - interval '30 days'),
    'abertos',   (SELECT count(*) FROM public.tickets WHERE status NOT IN ('resolvido','encerrado')),
    'resolvidos_30d', (SELECT count(*) FROM public.tickets WHERE status IN ('resolvido','encerrado') AND criado_em >= now() - interval '30 days'),
    'novos_hoje', (SELECT count(*) FROM public.tickets WHERE criado_em::date = current_date),
    'por_categoria', (
      SELECT coalesce(jsonb_object_agg(categoria, total), '{}'::jsonb)
      FROM (SELECT categoria::text, count(*)::int AS total FROM public.tickets WHERE criado_em >= now() - interval '30 days' GROUP BY categoria) c
    ),
    'por_status', (
      SELECT coalesce(jsonb_object_agg(status, total), '{}'::jsonb)
      FROM (SELECT status::text, count(*)::int AS total FROM public.tickets GROUP BY status) s
    ),
    'por_dia_14d', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('dia', dia, 'total', total) ORDER BY dia), '[]'::jsonb)
      FROM (SELECT to_char(criado_em::date, 'YYYY-MM-DD') AS dia, count(*)::int AS total FROM public.tickets WHERE criado_em >= now() - interval '14 days' GROUP BY criado_em::date) d
    ),
    'solucoes_ativas', (SELECT count(*) FROM public.solutions WHERE ativo = true),
    'nps', (
      SELECT jsonb_build_object(
        'total', count(*),
        'media', coalesce(round(avg(nota)::numeric, 2), 0),
        'promotores', count(*) FILTER (WHERE nota >= 9),
        'neutros', count(*) FILTER (WHERE nota BETWEEN 7 AND 8),
        'detratores', count(*) FILTER (WHERE nota <= 6)
      )
      FROM public.avaliacoes
      WHERE criado_em >= now() - interval '30 days'
    )
  ) INTO result;

  RETURN result;
END;
$$;
