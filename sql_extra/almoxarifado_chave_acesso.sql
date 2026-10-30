-- Guarda a chave de acesso (44 digitos) da NF-e nas notas do Almoxarifado, pra o
-- sistema bloquear o lancamento da MESMA nota duas vezes. Rodar uma vez no SQL Editor.
alter table public.almoxarifado_notas add column if not exists chave_acesso text;
create index if not exists almoxarifado_notas_chave_acesso_idx on public.almoxarifado_notas (chave_acesso);
