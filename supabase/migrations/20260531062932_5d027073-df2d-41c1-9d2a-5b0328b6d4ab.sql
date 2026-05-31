
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, nome, email, cnpj, cpf, telefone, cnae, notificacoes)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    new.email,
    new.raw_user_meta_data->>'cnpj',
    new.raw_user_meta_data->>'cpf',
    new.raw_user_meta_data->>'telefone',
    new.raw_user_meta_data->>'cnae',
    coalesce((new.raw_user_meta_data->>'notificacoes')::boolean, true)
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'mei')
  on conflict do nothing;

  return new;
end;
$$;
