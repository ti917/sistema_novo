-- =====================================================================
-- UNIFORME: pedidos de uniforme (gestor pede -> RH aprova -> gestor gera a entrega) (26/11/2026)
-- Rodar UMA vez no SQL Editor do Supabase. Pode rodar de novo sem problema (é idempotente).
--
-- O que cria (tudo NOVO — nenhuma tabela/coluna existente é alterada, nenhum dado de colaborador é tocado):
--   public.uniforme_pedidos          o pedido (colaborador, itens, tamanhos, motivo, situação)
--   public.uniforme_pedidos_guard()  trava de segurança: só o Admin aprova/recusa; o gestor só cancela o dele
--
-- Quem vê o quê:
--   Gestor: cria pedido, vê só os pedidos DELE, pode CANCELAR enquanto estiver pendente e
--           marcar como ENTREGUE quando gerar a entrega.
--   Admin (RH): vê todos, aprova e recusa.
--   Ninguém apaga pedido (não existe policy de delete).
--
-- PRA DESFAZER TUDO (só esta tabela nova):
--   drop table if exists public.uniforme_pedidos cascade;
--   drop function if exists public.uniforme_pedidos_guard();
-- =====================================================================

create table if not exists public.uniforme_pedidos (
    id               uuid primary key default gen_random_uuid(),
    criado_em        timestamptz not null default now(),
    gestor_id        uuid not null default auth.uid(),
    gestor_nome      text,
    colaborador_id   uuid not null,
    colaborador_nome text,
    unidade          text,
    empresa          text,
    itens            jsonb not null default '{}'::jsonb,   -- {camisa:2, calca:1, sapato:1, agasalho:0}
    tamanhos         jsonb not null default '{}'::jsonb,   -- {camisa:'M', calca:'42', agasalho:'G', sapato:'40'}
    motivo           text,                                  -- Admissão / Troca por desgaste / Perda / Tamanho errado / Outro
    observacao       text,
    status           text not null default 'pendente'
                     check (status in ('pendente','aprovado','recusado','entregue','cancelado')),
    decidido_por     text,
    decidido_em      timestamptz,
    motivo_recusa    text,
    entregue_por     text,
    entregue_em      timestamptz
);
create index if not exists uniforme_pedidos_gestor_idx  on public.uniforme_pedidos (gestor_id, criado_em desc);
create index if not exists uniforme_pedidos_status_idx  on public.uniforme_pedidos (status, criado_em desc);
create index if not exists uniforme_pedidos_colab_idx   on public.uniforme_pedidos (colaborador_id);
alter table public.uniforme_pedidos enable row level security;

-- Ver: o gestor que pediu, ou qualquer Admin
drop policy if exists uniforme_pedidos_select on public.uniforme_pedidos;
create policy uniforme_pedidos_select on public.uniforme_pedidos for select to authenticated
using (
    gestor_id = auth.uid()
    or exists (select 1 from public.perfis p where p.id = auth.uid() and p.perfil = 'Admin')
);

-- Criar: só em nome de si mesmo, sempre como "pendente"
drop policy if exists uniforme_pedidos_insert on public.uniforme_pedidos;
create policy uniforme_pedidos_insert on public.uniforme_pedidos for insert to authenticated
with check (
    gestor_id = auth.uid()
    and status = 'pendente'
    and exists (select 1 from public.perfis p where p.id = auth.uid() and p.perfil in ('Gestor','Admin'))
);

-- Alterar: Admin altera tudo; gestor só mexe nos pedidos dele (a trava abaixo limita o que ele pode mudar)
drop policy if exists uniforme_pedidos_update_admin on public.uniforme_pedidos;
create policy uniforme_pedidos_update_admin on public.uniforme_pedidos for update to authenticated
using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.perfil = 'Admin'))
with check (exists (select 1 from public.perfis p where p.id = auth.uid() and p.perfil = 'Admin'));

drop policy if exists uniforme_pedidos_update_gestor on public.uniforme_pedidos;
create policy uniforme_pedidos_update_gestor on public.uniforme_pedidos for update to authenticated
using (gestor_id = auth.uid())
with check (gestor_id = auth.uid());

-- Trava de segurança (vale também para chamadas diretas na API):
--   * quem não é Admin NÃO consegue aprovar, recusar nem mudar itens/colaborador;
--   * o gestor só faz: pendente -> cancelado   e   aprovado -> entregue;
--   * pedido já entregue/cancelado/recusado não muda mais (nem pelo Admin), para não duplicar entrega.
create or replace function public.uniforme_pedidos_guard()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
    v_admin boolean;
begin
    select exists (select 1 from public.perfis p where p.id = auth.uid() and p.perfil = 'Admin') into v_admin;

    if old.status in ('entregue','cancelado','recusado') and new.status is distinct from old.status then
        raise exception 'Este pedido já foi finalizado (%) e não pode mudar de situação.', old.status;
    end if;

    if not v_admin then
        if new.colaborador_id is distinct from old.colaborador_id
           or new.itens is distinct from old.itens
           or new.tamanhos is distinct from old.tamanhos
           or new.gestor_id is distinct from old.gestor_id then
            raise exception 'Só o RH pode alterar os dados do pedido.';
        end if;
        if new.status is distinct from old.status
           and not ((old.status = 'pendente' and new.status = 'cancelado')
                 or (old.status = 'aprovado' and new.status = 'entregue')) then
            raise exception 'Você não tem permissão para mudar este pedido de % para %.', old.status, new.status;
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists uniforme_pedidos_guard_trg on public.uniforme_pedidos;
create trigger uniforme_pedidos_guard_trg before update on public.uniforme_pedidos
for each row execute function public.uniforme_pedidos_guard();

-- Conferência (só leitura): deve retornar a tabela vazia e as 4 policies
-- select count(*) from public.uniforme_pedidos;
-- select policyname, cmd from pg_policies where tablename = 'uniforme_pedidos' order by 1;
