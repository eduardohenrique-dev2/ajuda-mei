
-- Tabela de mensagens dentro de um ticket
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  autor_id uuid NOT NULL,
  papel varchar NOT NULL CHECK (papel IN ('mei','atendente','sistema')),
  mensagem text NOT NULL,
  interna boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id, criado_em);

GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- MEI vê mensagens não-internas dos próprios tickets; staff vê tudo
CREATE POLICY "ver mensagens do ticket"
ON public.ticket_messages FOR SELECT TO authenticated
USING (
  public.is_staff(auth.uid())
  OR (
    NOT interna
    AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.mei_id = auth.uid())
  )
);

-- MEI insere mensagens não-internas no próprio ticket (e como ele mesmo)
CREATE POLICY "mei envia mensagem"
ON public.ticket_messages FOR INSERT TO authenticated
WITH CHECK (
  autor_id = auth.uid()
  AND papel = 'mei'
  AND interna = false
  AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.mei_id = auth.uid())
);

-- Staff insere qualquer mensagem
CREATE POLICY "staff envia mensagem"
ON public.ticket_messages FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()) AND autor_id = auth.uid());

-- Função de métricas agregadas
CREATE OR REPLACE FUNCTION public.get_analytics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total_30d', (SELECT count(*) FROM public.tickets WHERE criado_em >= now() - interval '30 days'),
    'abertos',   (SELECT count(*) FROM public.tickets WHERE status NOT IN ('resolvido','encerrado')),
    'resolvidos_30d', (SELECT count(*) FROM public.tickets WHERE status IN ('resolvido','encerrado') AND criado_em >= now() - interval '30 days'),
    'novos_hoje', (SELECT count(*) FROM public.tickets WHERE criado_em::date = current_date),
    'por_categoria', (
      SELECT coalesce(jsonb_object_agg(categoria, total), '{}'::jsonb)
      FROM (
        SELECT categoria::text, count(*)::int AS total
        FROM public.tickets
        WHERE criado_em >= now() - interval '30 days'
        GROUP BY categoria
      ) c
    ),
    'por_status', (
      SELECT coalesce(jsonb_object_agg(status, total), '{}'::jsonb)
      FROM (
        SELECT status::text, count(*)::int AS total
        FROM public.tickets
        GROUP BY status
      ) s
    ),
    'por_dia_14d', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('dia', dia, 'total', total) ORDER BY dia), '[]'::jsonb)
      FROM (
        SELECT to_char(criado_em::date, 'YYYY-MM-DD') AS dia, count(*)::int AS total
        FROM public.tickets
        WHERE criado_em >= now() - interval '14 days'
        GROUP BY criado_em::date
      ) d
    ),
    'solucoes_ativas', (SELECT count(*) FROM public.solutions WHERE ativo = true)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_analytics() TO authenticated;
