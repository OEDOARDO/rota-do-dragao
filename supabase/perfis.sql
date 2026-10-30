-- Perfis e top global do Rota do Dragão (projeto Supabase "rota-do-dragao").
-- Login por link mágico no e-mail (Supabase Auth). O e-mail fica só no Auth e nunca vai para esta tabela.
-- Qualquer visitante lê o ranking; cada pessoa só cria e edita o próprio perfil; ninguém apaga pelo site.
create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  apelido text not null check (apelido = btrim(apelido) and apelido ~ '^[A-Za-z0-9_À-ÿ ]{3,20}$'),
  edicao text not null default 'java' check (edicao in ('java', 'bedrock')),
  nick_java text check (nick_java ~ '^[A-Za-z0-9_]{3,16}$'),
  avatar text not null default 'olho' check (avatar in ('olho', 'perola', 'vara', 'balde')),
  tempo_ms integer check (tempo_ms between 60000 and 86400000),
  tempo_em timestamptz,
  criado_em timestamptz not null default now()
);

create unique index if not exists perfis_apelido_unico on public.perfis (lower(apelido));
create index if not exists perfis_tempo_idx on public.perfis (tempo_ms) where tempo_ms is not null;

alter table public.perfis enable row level security;
create policy perfis_leitura on public.perfis for select to anon, authenticated using (true);
create policy perfis_criar on public.perfis for insert to authenticated
  with check ((select auth.uid()) = id);
create policy perfis_editar on public.perfis for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- O servidor cuida das datas e só aceita tempo melhor que o anterior: o recorde nunca piora nem some.
create or replace function public.perfis_antes_de_gravar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.criado_em := now();
    new.tempo_em := case when new.tempo_ms is null then null else now() end;
    return new;
  end if;
  new.id := old.id;
  new.criado_em := old.criado_em;
  if new.tempo_ms is null or (old.tempo_ms is not null and new.tempo_ms >= old.tempo_ms) then
    new.tempo_ms := old.tempo_ms;
    new.tempo_em := old.tempo_em;
  else
    new.tempo_em := now();
  end if;
  return new;
end;
$$;

create trigger perfis_antes_de_gravar
  before insert or update on public.perfis
  for each row execute function public.perfis_antes_de_gravar();
