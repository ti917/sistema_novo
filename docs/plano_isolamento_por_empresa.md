# Plano: isolamento por empresa no banco (sistema único para vários clientes)

Data: 24/11/2026 · Projeto Supabase: kefvwdxebzgedugqeimz (sa-east-1, produção)
Regra de ouro: **nada é aplicado direto na produção.** Tudo passa por uma cópia de teste, e cada mudança tem um "desfazer" pronto.

## 1. Onde estamos hoje (auditoria só de leitura, 24/11)
- 152 tabelas, todas com RLS ligado.
- 336 regras: 10 filtram por empresa, 139 são abertas (qualquer logado lê tudo), 187 são "outra regra" (a classificar).
- Já protegidas por empresa: perfis, salarios_base, unidades_oficiais, escalas_mensais, documentos_mensais, solicitacoes_alteracao, solicitacoes_ferias.
- Caminho até a empresa: 52 tabelas têm coluna empresa · 21 só unidade · 24 só colaborador · 54 sem vínculo nenhum.
- Ainda NÃO analisado: regras por papel (anon/authenticated/service_role), Storage (arquivos), funções RPC, views, Edge Functions.

## 2. Princípio técnico que torna isso seguro
Usar políticas **RESTRICTIVE** (restritivas) *por cima* das regras que já existem:
- As regras atuais continuam como estão; a nova só **acrescenta** uma condição ("e a linha é da minha empresa").
- Desfazer = `drop policy` da nova. Volta ao estado anterior na hora, sem perda de dado.
- Nenhuma coluna existente é apagada ou alterada. Colunas novas são opcionais e começam preenchidas por backfill.

## 3. Etapas

### Etapa 0 — Preparação (sem risco)
1. Confirmar backup/PITR ativo e fazer um backup manual antes de começar.
2. Criar **ambiente de teste**: projeto Supabase separado restaurado do backup (ou Supabase Branch). Custo e decisão: ver seção 6.
3. Apontar uma cópia do site (GitHub Pages de teste) para esse projeto.
4. Combinar a janela de aplicação em produção: fora do horário de ponto (madrugada de domingo).

### Etapa 1 — Inventário completo (só leitura)
1. Listar as 336 regras com papel, comando (select/insert/update/delete), USING e WITH CHECK.
2. Classificar as 187 "outra regra": por cargo, por usuário, por unidade?
3. Separar o que é de uso interno do sistema (service_role: Edge Functions, rotinas, Clara, WhatsApp) — essas **não são afetadas** por RLS — do que o navegador/app usa.
4. Mapear como o login identifica o usuário (auth.uid ↔ perfis) e como o quiosque/app de ponto autentica.
5. Levantar Storage: buckets de documentos, fotos de crachá, contratos — e as regras de cada um.
6. Levantar funções RPC e views (SECURITY DEFINER podem furar RLS).
7. Entregável: planilha tabela × (caminho até a empresa, regra atual, risco, ordem).

### Etapa 2 — Funções auxiliares (aditivas)
Criadas no teste primeiro:
- `empresas_do_usuario()` → lista de empresas do usuário (hoje guardada como texto separado por vírgula).
- `sou_super_admin()` → vê todas as empresas.
- `empresa_da_unidade(nome)` e `empresa_do_colaborador(id)`.
- Índices de apoio (perfis.id, unidades_oficiais.nome) para não deixar o sistema lento.
- Medir tempo das consultas mais pesadas (escala, ponto, benefícios) antes e depois.

### Etapa 3 — Políticas restritivas, em ondas (teste → produção)
Ordem do mais sensível ao menos:
- **Onda A — dados de pessoas, via colaborador:** ponto/batidas, banco de horas, advertências, avaliações, estabilidades, OBSA, documentos.
- **Onda B — via unidade:** ausências, horas extras/FT, notificações, escalas previstas, configurações de ponto/VR/VA/ASO/banco de horas.
- **Onda C — já têm coluna empresa mas estão abertas:** financeiro_*, comercial_*, almoxarifado, compras, patrimônio, secretaria_*.
- **Onda D — sem vínculo:** decidir caso a caso (config_sistema, cargos_oficiais, chamados, trocas_turno, eventos_rh…). Em geral: adicionar coluna `empresa` opcional, preencher (backfill) com a empresa atual, e só então restringir. Itens globais de verdade (ex.: tutoriais) ficam abertos de propósito.
Cada onda: aplicar no teste → rodar a bateria de testes (seção 4) → corrigir → aplicar em produção → monitorar 48 h → só então a próxima.

### Etapa 4 — Storage, RPCs, Edge Functions
- Regras de Storage por pasta/empresa (arquivos de colaboradores são o maior risco de vazamento).
- Revisar funções SECURITY DEFINER e views.
- Revisar Edge Functions: quando agem em nome de um cliente, devem filtrar pela empresa dele (service_role ignora RLS, então o filtro tem que estar no código).

### Etapa 5 — Ajustes no sistema (telas)
- Telas que consultam sem filtro passam a depender da regra do banco, mas devem continuar filtrando por conforto e velocidade.
- Cadastros novos (unidade, feriado, cargo…) já gravam a empresa. O feriado por unidade já foi feito assim (24/11).

### Etapa 6 — Onboarding de novo cliente
Fluxo único: cadastrar empresa → criar primeiro Super Admin dela → unidades/cargos → importar colaboradores. Roteiro testado antes de existir cliente real.

## 4. Bateria de testes de isolamento (obrigatória em cada onda)
Criar no ambiente de teste duas empresas fictícias (A e B) e perfis: Super Admin, Admin A, Gestor A, Gestor B, Colaborador A, Colaborador B, quiosque da unidade A, app Android.
- Admin A **não** lê nem altera nada da B (select, insert, update, delete) — testado pela API com o token de cada perfil.
- Gestor A só vê as unidades dele; Colaborador só vê o próprio.
- Super Admin continua vendo tudo.
- Fluxos que NÃO podem quebrar: login, escala, ponto (app, quiosque, Clara/WhatsApp), benefícios VR/VT/VA, férias, rescisão, financeiro, comercial, backup.
- Comparar contagem de linhas visíveis antes/depois para a empresa atual (tem que ser idêntica).
- Medir desempenho das telas pesadas.

## 5. Riscos e como evitamos
| Risco | Proteção |
|---|---|
| Regra errada bloqueia usuários legítimos | Teste antes; políticas restritivas desfazíveis com 1 comando; janela fora do horário |
| Sistema fica lento | Índices; medição antes/depois; funções STABLE |
| App/quiosque/Clara param | Teste explícito com cada um; Edge Functions usam service_role (não afetadas) |
| Vazamento por Storage ou RPC | Etapa 4 dedicada |
| Usuário com várias empresas | Função trata lista; testado |
| Mudança em produção sem volta | Script de reversão escrito e testado para cada onda |

## 6. Decisões que dependem de você
1. Ambiente de teste: criar um segundo projeto Supabase (recomendado) ou usar Branch. Pode gerar custo mensal — precisa da autorização da Daniela, como no plano do Supabase.
2. Qual horário de manutenção aceitável para aplicar em produção.
3. Se enquanto isso aparecer um cliente: instalação separada provisória.

## 7. Estimativa (esforço, não data fixa)
Etapa 0–1: poucos dias · Etapa 2: 1–2 dias · Etapa 3: 1–2 semanas (4 ondas, com monitoramento) · Etapa 4: ~1 semana · Etapas 5–6: ~1 semana. Total típico: 4 a 6 semanas, sem parar o sistema.

## 8. Primeiro passo concreto (quando você autorizar)
Etapa 1, itens 1–3 (só leitura no banco atual): gerar a planilha tabela × regra × risco. Não altera nada.
