-- Protege a lista de Super Admins no banco: so o Administrador Raiz altera a linha chave='super_admins'
-- da config_sistema. Nao mexe em nenhuma outra chave. Chamadas sem usuario logado
-- (painel do Supabase / service role) continuam liberadas.
-- Para desfazer: drop trigger trg_proteger_super_admins on public.config_sistema;

create or replace function public.proteger_super_admins()
returns trigger
language plpgsql
as $$
declare
  alvo boolean := false;
begin
  if TG_OP in ('UPDATE','DELETE') and old.chave = 'super_admins' then alvo := true; end if;
  if TG_OP in ('INSERT','UPDATE') and new.chave = 'super_admins' then alvo := true; end if;

  if alvo and auth.uid() is not null
     and auth.uid() <> 'fa338e33-18c9-467e-bf3e-34880fd9324e'::uuid then
    raise exception 'Apenas o Administrador Raiz pode alterar os Super Admins';
  end if;

  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_super_admins on public.config_sistema;
create trigger trg_proteger_super_admins
before insert or update or delete on public.config_sistema
for each row execute function public.proteger_super_admins();
