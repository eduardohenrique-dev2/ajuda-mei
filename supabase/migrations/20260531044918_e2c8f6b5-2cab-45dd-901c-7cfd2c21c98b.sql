
REVOKE EXECUTE ON FUNCTION public.escalate_stale_tickets() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_stale_tickets() TO service_role;
