
-- set search_path on remaining functions
alter function public.touch_updated_at() set search_path = public;
alter function public.generate_protocolo() set search_path = public;
alter function public.match_solutions(vector, int, float) set search_path = public;

-- restrict SECURITY DEFINER functions
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.is_staff(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.generate_protocolo() from public, anon;
revoke execute on function public.match_solutions(vector, int, float) from anon;
