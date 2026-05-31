
-- Extensions
create extension if not exists vector;
create extension if not exists pgcrypto;

-- Enums
create type public.app_role as enum ('mei', 'atendente', 'gestor', 'admin');
create type public.ticket_status as enum ('novo', 'em_analise', 'aguardando_mei', 'resolvido', 'encerrado');
create type public.ticket_channel as enum ('web', 'whatsapp', 'presencial');
create type public.ticket_priority as enum ('baixa', 'normal', 'alta', 'urgente');
create type public.mei_status as enum ('pendente_validacao', 'verificado');
create type public.solution_category as enum (
  'declaracao_anual','das','parcelamento','regularizacao',
  'funcionarios','notas_fiscais','cadastro','pendencias',
  'outros_setores','outros'
);

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome varchar(200) not null,
  cnpj varchar(20),
  telefone varchar(20),
  email varchar(200),
  status public.mei_status not null default 'pendente_validacao',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "users view own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('atendente','gestor','admin')
  )
$$;

create policy "users view own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));

-- Update profile RLS so staff can view all
create policy "staff view all profiles" on public.profiles
  for select to authenticated using (public.is_staff(auth.uid()));

-- Trigger: create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email, cnpj, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    new.email,
    new.raw_user_meta_data->>'cnpj',
    new.raw_user_meta_data->>'telefone'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'mei')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- sectors
create table public.sectors (
  id uuid primary key default gen_random_uuid(),
  nome varchar(200) not null,
  descricao text,
  telefone varchar(20),
  email varchar(200),
  endereco text,
  horario varchar(200),
  site varchar(500),
  categoria varchar(50) not null,
  palavras_chave text[] not null default '{}',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
grant select on public.sectors to authenticated, anon;
grant insert, update, delete on public.sectors to authenticated;
grant all on public.sectors to service_role;
alter table public.sectors enable row level security;

create policy "anyone reads active sectors" on public.sectors
  for select using (ativo = true);
create policy "staff manage sectors" on public.sectors
  for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- solutions
create table public.solutions (
  id uuid primary key default gen_random_uuid(),
  titulo varchar(200) not null,
  categoria public.solution_category not null,
  descricao text not null,
  passo_a_passo jsonb not null default '[]'::jsonb,
  link_oficial varchar(500),
  setor_id uuid references public.sectors(id) on delete set null,
  tags text[] not null default '{}',
  palavras_chave text[] not null default '{}',
  embedding vector(768),
  ativo boolean not null default true,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
grant select on public.solutions to authenticated, anon;
grant insert, update, delete on public.solutions to authenticated;
grant all on public.solutions to service_role;
alter table public.solutions enable row level security;

create policy "anyone reads active solutions" on public.solutions
  for select using (ativo = true);
create policy "staff manage solutions" on public.solutions
  for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create index solutions_categoria_idx on public.solutions(categoria);
create index solutions_embedding_idx on public.solutions
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Semantic search RPC
create or replace function public.match_solutions(
  query_embedding vector(768),
  match_count int default 5,
  min_similarity float default 0.0
)
returns table (
  id uuid,
  titulo varchar,
  categoria public.solution_category,
  descricao text,
  passo_a_passo jsonb,
  link_oficial varchar,
  similarity float
)
language sql stable
as $$
  select s.id, s.titulo, s.categoria, s.descricao, s.passo_a_passo, s.link_oficial,
         1 - (s.embedding <=> query_embedding) as similarity
  from public.solutions s
  where s.ativo = true and s.embedding is not null
    and 1 - (s.embedding <=> query_embedding) >= min_similarity
  order by s.embedding <=> query_embedding
  limit match_count;
$$;

-- tickets
create sequence public.ticket_protocolo_seq;

create or replace function public.generate_protocolo()
returns text language plpgsql as $$
declare
  n int;
begin
  n := nextval('public.ticket_protocolo_seq');
  return 'SAE-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 5, '0');
end;
$$;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  protocolo varchar(20) unique not null default public.generate_protocolo(),
  mei_id uuid not null references auth.users(id) on delete cascade,
  atendente_id uuid references auth.users(id) on delete set null,
  categoria public.solution_category not null default 'outros',
  titulo varchar(200) not null,
  descricao text not null,
  status public.ticket_status not null default 'novo',
  canal public.ticket_channel not null default 'web',
  prioridade public.ticket_priority not null default 'normal',
  solucao_sugerida_id uuid references public.solutions(id) on delete set null,
  setor_id uuid references public.sectors(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  encerrado_em timestamptz
);
grant select, insert, update on public.tickets to authenticated;
grant all on public.tickets to service_role;
alter table public.tickets enable row level security;

create policy "mei view own tickets" on public.tickets
  for select to authenticated using (mei_id = auth.uid() or public.is_staff(auth.uid()));
create policy "mei create own tickets" on public.tickets
  for insert to authenticated with check (mei_id = auth.uid());
create policy "staff update tickets" on public.tickets
  for update to authenticated using (public.is_staff(auth.uid()));
create policy "mei update own open tickets" on public.tickets
  for update to authenticated using (mei_id = auth.uid() and status in ('novo','aguardando_mei'));

create index tickets_status_criado_idx on public.tickets(status, criado_em desc);
create index tickets_mei_idx on public.tickets(mei_id);

-- chat_history
create table public.chat_history (
  id uuid primary key default gen_random_uuid(),
  sessao_id varchar(100) not null,
  mei_id uuid references auth.users(id) on delete set null,
  ticket_id uuid references public.tickets(id) on delete set null,
  canal public.ticket_channel not null default 'web',
  papel varchar(20) not null check (papel in ('user','bot','atendente')),
  mensagem text not null,
  intent_detectado varchar(100),
  criado_em timestamptz not null default now()
);
grant select, insert on public.chat_history to authenticated;
grant all on public.chat_history to service_role;
alter table public.chat_history enable row level security;

create policy "user view own chat" on public.chat_history
  for select to authenticated using (mei_id = auth.uid() or public.is_staff(auth.uid()));
create policy "user insert own chat" on public.chat_history
  for insert to authenticated with check (mei_id = auth.uid() or mei_id is null);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end; $$;

create trigger touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger touch_solutions before update on public.solutions
  for each row execute function public.touch_updated_at();
create trigger touch_tickets before update on public.tickets
  for each row execute function public.touch_updated_at();
