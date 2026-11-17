-- Trilha de auditoria das assinaturas eletronicas (so ACRESCENTA: nao altera nenhuma tabela existente).
-- Cada assinatura concluida gera 1 linha: quem, CPF, quando, IP, dispositivo, hash SHA-256 do PDF
-- original e do PDF assinado, e o texto de consentimento. A linha NAO pode ser alterada nem apagada.
-- Para desfazer: drop table public.assinatura_registros;

create table if not exists public.assinatura_registros (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  tipo_documento text not null,          -- ex.: 'documentos_mensais'
  documento_id text not null,            -- id do registro assinado
  colaborador_id text,
  nome text,
  cpf text,
  empresa text,
  unidade text,
  assinado_em timestamptz not null,
  ip text,
  dispositivo text,                      -- user agent do navegador
  hash_original_sha256 text,             -- hash do PDF antes de assinar
  hash_assinado_sha256 text,             -- hash do PDF final assinado
  url_original text,
  url_assinado text,
  consentimento text,                    -- texto de aceite vigente na hora
  metodo text default 'desenho-eletronico'
);

create index if not exists assinatura_registros_doc_idx on public.assinatura_registros (tipo_documento, documento_id);
create index if not exists assinatura_registros_colab_idx on public.assinatura_registros (colaborador_id);

alter table public.assinatura_registros enable row level security;

-- Quem assina (link com token, sem login) so consegue INSERIR. Nao le, nao altera, nao apaga.
drop policy if exists "assinatura_registros_inserir" on public.assinatura_registros;
create policy "assinatura_registros_inserir" on public.assinatura_registros
  for insert to anon, authenticated with check (true);

-- Leitura so para Admin do RH (usa a mesma funcao que ja protege config_sistema).
drop policy if exists "assinatura_registros_ler_admin" on public.assinatura_registros;
create policy "assinatura_registros_ler_admin" on public.assinatura_registros
  for select to authenticated using (public.eh_admin_rh());

-- Sem policy de update/delete = ninguem altera ou apaga (trilha imutavel).
