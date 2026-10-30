-- Mural de seeds do Rota do Dragão (projeto Supabase "rota-do-dragao").
-- Qualquer visitante lê e envia; ninguém de fora edita ou apaga. Só números: não há texto livre.
-- Para remover uma seed: painel do Supabase > Table Editor > seeds > apagar a linha.
create table if not exists public.seeds (
  id uuid primary key default gen_random_uuid(),
  seed text not null check (seed ~ '^-?[0-9]{1,20}$'),
  edicao text not null check (edicao in ('java', 'bedrock')),
  versao text not null default 'outra' check (versao ~ '^([0-9]{1,2}(\.[0-9]{1,2}){1,2}|outra)$'),
  vila integer check (vila between 0 and 100000),
  portal integer check (portal between 0 and 100000),
  bastiao integer check (bastiao between 0 and 100000),
  fortaleza integer check (fortaleza between 0 and 100000),
  stronghold integer check (stronghold between 0 and 100000),
  criado_em timestamptz not null default now(),
  constraint seeds_unica unique (seed, edicao),
  constraint seeds_tres_distancias check (
    (vila is not null)::int + (portal is not null)::int + (bastiao is not null)::int
    + (fortaleza is not null)::int + (stronghold is not null)::int >= 3
  )
);

-- Com RLS ligado e sem regra de update ou delete, ninguém de fora consegue editar nem apagar.
alter table public.seeds enable row level security;
create policy seeds_leitura on public.seeds for select to anon, authenticated using (true);
create policy seeds_envio on public.seeds for insert to anon, authenticated with check (true);

-- A data e o id vêm sempre do servidor, e um freio segura enxurrada de envios.
create or replace function public.seeds_antes_de_inserir()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := gen_random_uuid();
  new.criado_em := now();
  if (select count(*) from public.seeds s where s.criado_em > now() - interval '10 minutes') >= 30 then
    raise exception 'muitas seeds em pouco tempo, tente mais tarde' using errcode = 'P0001';
  end if;
  if (select count(*) from public.seeds) >= 5000 then
    raise exception 'mural cheio' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger seeds_antes_de_inserir
  before insert on public.seeds
  for each row execute function public.seeds_antes_de_inserir();

create index if not exists seeds_criado_em_idx on public.seeds (criado_em desc);
