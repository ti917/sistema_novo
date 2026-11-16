-- =====================================================================
-- COMPRAS: pedidos de compra das unidades para o Financeiro (16/11/2026)
-- Rodar UMA vez no SQL Editor do Supabase. Pode rodar de novo sem problema (é idempotente).
--
-- O que cria (tudo NOVO, nada existente é alterado):
--   compras_catalogo        lista simples de produtos que o gestor escolhe (cadastrada só pelo Financeiro)
--   compras_pedidos         o pedido (unidade, gestor, situação)
--   compras_pedido_itens    itens do pedido (produto simples + quantidade) — SEM preço
--   compras_pedido_valores  produto/fornecedor/preço escolhido pelo Financeiro — SÓ o Financeiro lê
--   compras_vinculos        "aprendizado": produto do almoxarifado já escolhido pra cada item/unidade — só Financeiro
--   compras_teto            valor mensal estipulado por centro de custo — só Financeiro
--
-- Quem vê o quê:
--   Gestor: cria pedido, vê só os pedidos DELE e só nome/quantidade/situação (nunca preço, fornecedor ou teto).
--   Financeiro (mesma regra do resto do financeiro.html: public.eh_usuario_financeiro()): tudo.
--   Admin do RH: só lê pedidos/itens/catálogo (sem valores e sem teto).
--
-- PRA DESFAZER TUDO (só estas tabelas novas):
--   drop table if exists public.compras_pedido_valores, public.compras_pedido_itens, public.compras_pedidos,
--                         public.compras_vinculos, public.compras_teto, public.compras_catalogo cascade;
-- =====================================================================

-- 0) Função "é do Financeiro?" — já existe no seu banco (usada por outras telas). Só cria se estiver FALTANDO;
--    se já existir, NÃO mexe nela.
do $$
begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'eh_usuario_financeiro') then
    execute $f$
      create function public.eh_usuario_financeiro()
      returns boolean language sql stable security definer set search_path = public
      as $b$
        select exists (
          select 1 from public.perfis p
          where p.id = auth.uid()
            and (p.id = 'fa338e33-18c9-467e-bf3e-34880fd9324e'
                 or p.permissoes->>'sistemas_permitidos' in ('Financeiro', 'RH_Financeiro', 'Comercial_Financeiro', 'Todos'))
        )
      $b$
    $f$;
    revoke all on function public.eh_usuario_financeiro() from public, anon;
    grant execute on function public.eh_usuario_financeiro() to authenticated;
  end if;
end $$;

-- 1) Catálogo simples (o que o gestor enxerga: nome, categoria, como se pede)
create table if not exists public.compras_catalogo (
    id             uuid primary key default gen_random_uuid(),
    nome           text not null,
    categoria      text,
    unidade_pedido text not null default 'Unidade(s)',
    palavras_chave text,                       -- usadas pra achar produtos parecidos no almoxarifado (ex.: "PAPEL TOA")
    ativo          boolean not null default true,
    empresa        text,
    criado_por     text,
    criado_em      timestamptz not null default now()
);
create unique index if not exists compras_catalogo_nome_uniq on public.compras_catalogo (lower(nome), coalesce(empresa, ''));
alter table public.compras_catalogo enable row level security;
drop policy if exists compras_catalogo_select on public.compras_catalogo;
create policy compras_catalogo_select on public.compras_catalogo for select to authenticated using (true);
drop policy if exists compras_catalogo_escrita on public.compras_catalogo;
create policy compras_catalogo_escrita on public.compras_catalogo for all to authenticated
    using (public.eh_usuario_financeiro()) with check (public.eh_usuario_financeiro());

-- 2) Pedido
create table if not exists public.compras_pedidos (
    id               uuid primary key default gen_random_uuid(),
    criado_em        timestamptz not null default now(),
    atualizado_em    timestamptz not null default now(),
    gestor_id        uuid not null default auth.uid(),
    gestor_nome      text,
    empresa          text,
    unidade          text not null,            -- nome da unidade (como no RH)
    centro_custo_id  text,                     -- o Financeiro confirma na análise
    observacao       text,
    status           text not null default 'enviado'
                     check (status in ('enviado','aprovado','recusado','comprado','cancelado')),
    motivo_recusa    text,
    decidido_por     text,
    decidido_em      timestamptz
);
create index if not exists compras_pedidos_gestor_idx on public.compras_pedidos (gestor_id, criado_em desc);
create index if not exists compras_pedidos_status_idx on public.compras_pedidos (status, criado_em desc);
alter table public.compras_pedidos enable row level security;

drop policy if exists compras_pedidos_select on public.compras_pedidos;
create policy compras_pedidos_select on public.compras_pedidos for select to authenticated
using (
    gestor_id = auth.uid()
    or public.eh_usuario_financeiro()
    or exists (select 1 from public.perfis p where p.id = auth.uid() and p.perfil = 'Admin')
);
drop policy if exists compras_pedidos_insert on public.compras_pedidos;
create policy compras_pedidos_insert on public.compras_pedidos for insert to authenticated
with check (
    gestor_id = auth.uid()
    and status = 'enviado'
    and exists (select 1 from public.perfis p where p.id = auth.uid() and p.perfil in ('Gestor','Admin'))
);
-- Gestor só consegue CANCELAR o pedido dele enquanto ainda está "enviado". Financeiro altera tudo.
drop policy if exists compras_pedidos_update_gestor on public.compras_pedidos;
create policy compras_pedidos_update_gestor on public.compras_pedidos for update to authenticated
using (gestor_id = auth.uid() and status = 'enviado')
with check (gestor_id = auth.uid() and status in ('enviado','cancelado'));
drop policy if exists compras_pedidos_update_fin on public.compras_pedidos;
create policy compras_pedidos_update_fin on public.compras_pedidos for update to authenticated
using (public.eh_usuario_financeiro()) with check (public.eh_usuario_financeiro());

-- 3) Itens do pedido (sem preço)
create table if not exists public.compras_pedido_itens (
    id             uuid primary key default gen_random_uuid(),
    pedido_id      uuid not null references public.compras_pedidos(id) on delete cascade,
    catalogo_id    uuid references public.compras_catalogo(id) on delete set null,
    produto_nome   text not null,              -- foto do nome na hora do pedido
    unidade_pedido text,
    quantidade     numeric not null check (quantidade > 0),
    observacao     text
);
create index if not exists compras_pedido_itens_pedido_idx on public.compras_pedido_itens (pedido_id);
alter table public.compras_pedido_itens enable row level security;
drop policy if exists compras_itens_select on public.compras_pedido_itens;
create policy compras_itens_select on public.compras_pedido_itens for select to authenticated
using (
    public.eh_usuario_financeiro()
    or exists (select 1 from public.compras_pedidos p where p.id = pedido_id
               and (p.gestor_id = auth.uid()
                    or exists (select 1 from public.perfis x where x.id = auth.uid() and x.perfil = 'Admin')))
);
drop policy if exists compras_itens_insert on public.compras_pedido_itens;
create policy compras_itens_insert on public.compras_pedido_itens for insert to authenticated
with check (
    exists (select 1 from public.compras_pedidos p where p.id = pedido_id and p.gestor_id = auth.uid() and p.status = 'enviado')
);
drop policy if exists compras_itens_update_fin on public.compras_pedido_itens;
create policy compras_itens_update_fin on public.compras_pedido_itens for update to authenticated
using (public.eh_usuario_financeiro()) with check (public.eh_usuario_financeiro());

-- 4) Valores escolhidos pelo Financeiro (SÓ Financeiro)
create table if not exists public.compras_pedido_valores (
    id               uuid primary key default gen_random_uuid(),
    item_id          uuid not null unique references public.compras_pedido_itens(id) on delete cascade,
    pedido_id        uuid not null references public.compras_pedidos(id) on delete cascade,
    produto_escolhido text,                    -- nome do produto como está no almoxarifado (ou digitado na mão)
    fornecedor       text,
    medida           text,
    valor_unitario   numeric not null default 0,
    valor_total      numeric not null default 0,   -- quantidade do item x valor_unitario
    origem           text not null default 'almoxarifado' check (origem in ('almoxarifado','outra_unidade','manual')),
    escolhido_por    text,
    escolhido_em     timestamptz not null default now()
);
create index if not exists compras_valores_pedido_idx on public.compras_pedido_valores (pedido_id);
alter table public.compras_pedido_valores enable row level security;
drop policy if exists compras_valores_fin on public.compras_pedido_valores;
create policy compras_valores_fin on public.compras_pedido_valores for all to authenticated
    using (public.eh_usuario_financeiro()) with check (public.eh_usuario_financeiro());

-- 5) "Aprendizado": qual produto do almoxarifado vale pra cada item do catálogo em cada unidade (SÓ Financeiro)
create table if not exists public.compras_vinculos (
    id              uuid primary key default gen_random_uuid(),
    catalogo_id     uuid not null references public.compras_catalogo(id) on delete cascade,
    centro_custo_id text not null,
    produto_almox   text not null,
    fornecedor      text not null default '',
    usado_em        timestamptz not null default now(),
    unique (catalogo_id, centro_custo_id, produto_almox, fornecedor)
);
alter table public.compras_vinculos enable row level security;
drop policy if exists compras_vinculos_fin on public.compras_vinculos;
create policy compras_vinculos_fin on public.compras_vinculos for all to authenticated
    using (public.eh_usuario_financeiro()) with check (public.eh_usuario_financeiro());

-- 6) Teto mensal por centro de custo (SÓ Financeiro). Vale do mês "vigente_desde" em diante, todo mês,
--    até existir uma linha mais nova (ou seja: cadastra uma vez e só muda quando precisar).
create table if not exists public.compras_teto (
    id              uuid primary key default gen_random_uuid(),
    centro_custo_id text not null,
    vigente_desde   date not null,             -- sempre dia 1 do mês
    valor           numeric not null check (valor >= 0),
    criado_por      text,
    criado_em       timestamptz not null default now(),
    unique (centro_custo_id, vigente_desde)
);
alter table public.compras_teto enable row level security;
drop policy if exists compras_teto_fin on public.compras_teto;
create policy compras_teto_fin on public.compras_teto for all to authenticated
    using (public.eh_usuario_financeiro()) with check (public.eh_usuario_financeiro());
