// =========================================================================
// 🔁 REPASSES ENTRE CENTROS DE CUSTO (Financeiro <-> Secretaria)
// Arquivo ÚNICO usado pelo financeiro.html e pelo secretaria.html (RH não usa).
//  • "Repassar valor": tira do centro aberto (despesa) e entra no centro de destino (receita), os dois de uma vez.
//  • "Repasses": lista dos repasses do centro, com Corrigir (valor/data) e Estornar (o valor volta pra origem).
// Toda a gravação é feita pelas funções do banco fn_repasse_* (sql_extra/repasses_centros.sql), que gravam os dois
// lados na MESMA transação. Este arquivo não escreve direto em lançamento nenhum.
// =========================================================================
(function () {
    'use strict';
    const R = { cfg: null, estilo: false };

    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const fmtData = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
    const fmtDataHora = (iso) => { try { return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }); } catch (e) { return ''; } };
    const sb = () => (R.cfg && typeof R.cfg.sb === 'function') ? R.cfg.sb() : null;
    const alerta = (m, t) => { try { if (R.cfg && R.cfg.alerta) R.cfg.alerta(m, t || 'sucesso'); else console.log(m); } catch (e) { console.log(m); } };

    // "1.234,56" / "1234,56" / "1234.56" -> número
    function lerMoeda(t) {
        let s = String(t == null ? '' : t).replace(/[^\d,.]/g, '');
        if (!s) return NaN;
        if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
        else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
        return parseFloat(s);
    }
    function mascaraMoeda(el) {
        const dig = el.value.replace(/\D/g, '');
        if (!dig) { el.value = ''; return; }
        el.value = (parseInt(dig, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function msgErro(e) {
        const m = (e && (e.message || e.details || e.hint)) ? String(e.message || e.details || e.hint) : String(e || 'Erro');
        if (/fn_repasse|PGRST202|does not exist|financeiro_repasses|schema cache/i.test(m)) return 'Os repasses ainda não foram ativados no banco: falta rodar o SQL repasses_centros.sql no Supabase. (' + m + ')';
        return m;
    }

    function css() {
        if (R.estilo) return; R.estilo = true;
        const st = document.createElement('style');
        st.textContent = `
        .rep-ov { position:fixed; inset:0; background:rgba(8,6,20,.72); z-index:2147483000; display:flex; align-items:center; justify-content:center; padding:18px; }
        .rep-card { background:#ffffff; color:#1f2937; width:100%; max-width:560px; max-height:92vh; overflow:auto; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.45); padding:22px 24px; font-family:inherit; }
        .rep-card.larga { max-width:980px; }
        .rep-card h2 { margin:0 0 4px; font-size:1.15rem; color:#111827; display:flex; align-items:center; gap:10px; }
        .rep-card .rep-sub { color:#6b7280; font-size:.84rem; margin-bottom:14px; line-height:1.45; }
        .rep-card label { display:block; font-size:.74rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:#4b5563; margin:12px 0 5px; }
        .rep-card input, .rep-card select, .rep-card textarea { width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #cbd5e1; border-radius:9px; font-size:.95rem; background:#fff; color:#111827; font-family:inherit; }
        .rep-card input:focus, .rep-card select:focus, .rep-card textarea:focus { outline:2px solid #6366f1; outline-offset:1px; }
        .rep-linha2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .rep-acoes { display:flex; gap:10px; justify-content:flex-end; margin-top:18px; flex-wrap:wrap; }
        .rep-btn { border:1px solid #cbd5e1; background:#f8fafc; color:#1f2937; padding:10px 18px; border-radius:10px; font-weight:700; cursor:pointer; font-size:.9rem; }
        .rep-btn:hover { background:#eef2f7; }
        .rep-btn.pri { background:#4f46e5; border-color:#4f46e5; color:#fff; }
        .rep-btn.pri:hover { background:#4338ca; }
        .rep-btn.perigo { background:#dc2626; border-color:#dc2626; color:#fff; }
        .rep-btn.perigo:hover { background:#b91c1c; }
        .rep-btn:disabled { opacity:.55; cursor:not-allowed; }
        .rep-btn.mini { padding:5px 10px; font-size:.76rem; border-radius:8px; }
        .rep-resumo { background:#f1f5f9; border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; margin-top:6px; font-size:.92rem; line-height:1.75; }
        .rep-resumo .seta { color:#4f46e5; font-weight:800; }
        .rep-aviso { background:#fffbeb; border:1px solid #fcd34d; color:#92400e; border-radius:10px; padding:10px 12px; font-size:.82rem; margin-top:12px; line-height:1.45; }
        .rep-tab { width:100%; border-collapse:collapse; font-size:.85rem; }
        .rep-tab th { text-align:left; font-size:.7rem; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; padding:8px 10px; border-bottom:2px solid #e5e7eb; white-space:nowrap; }
        .rep-tab td { padding:10px; border-bottom:1px solid #eef2f7; vertical-align:top; }
        .rep-chip { display:inline-block; padding:3px 9px; border-radius:999px; font-size:.7rem; font-weight:800; }
        .rep-chip.ok { background:#dcfce7; color:#166534; } .rep-chip.est { background:#e5e7eb; color:#4b5563; }
        .rep-chip.env { background:#fee2e2; color:#991b1b; } .rep-chip.rec { background:#dbeafe; color:#1e40af; }
        .rep-card #rep-corpo { color:#1f2937; font-size:.9rem; margin-bottom:0; }
        .rep-x { float:right; cursor:pointer; color:#6b7280; font-size:1.2rem; line-height:1; background:none; border:none; }
        /* TEMA ESCURO (o claro é o padrão acima) */
        html:not([data-theme="light"]) .rep-card { background:#1b1630; color:#e8e4f5; border:1px solid rgba(255,255,255,.12); color-scheme:dark; }
        html:not([data-theme="light"]) .rep-card h2 { color:#f3f0fb; }
        html:not([data-theme="light"]) .rep-card .rep-sub { color:#a9a2c7; }
        html:not([data-theme="light"]) .rep-card label { color:#b9b2d6; }
        html:not([data-theme="light"]) .rep-card input, html:not([data-theme="light"]) .rep-card select, html:not([data-theme="light"]) .rep-card textarea { background:#120e22; color:#f3f0fb; border-color:rgba(255,255,255,.18); }
        html:not([data-theme="light"]) .rep-card ::placeholder { color:#7d76a0; }
        html:not([data-theme="light"]) .rep-btn { background:#2a2347; border-color:rgba(255,255,255,.18); color:#ece9f7; }
        html:not([data-theme="light"]) .rep-btn:hover { background:#352d5c; }
        html:not([data-theme="light"]) .rep-btn.pri { background:#6366f1; border-color:#6366f1; color:#fff; }
        html:not([data-theme="light"]) .rep-btn.pri:hover { background:#4f46e5; }
        html:not([data-theme="light"]) .rep-btn.perigo { background:#dc2626; border-color:#dc2626; color:#fff; }
        html:not([data-theme="light"]) .rep-resumo { background:#120e22; border-color:rgba(255,255,255,.14); color:#ece9f7; }
        html:not([data-theme="light"]) .rep-resumo .seta { color:#a5b4fc; }
        html:not([data-theme="light"]) .rep-aviso { background:rgba(245,158,11,.12); border-color:rgba(245,158,11,.45); color:#fcd34d; }
        html:not([data-theme="light"]) .rep-tab th { color:#a9a2c7; border-bottom-color:rgba(255,255,255,.16); }
        html:not([data-theme="light"]) .rep-tab td { border-bottom-color:rgba(255,255,255,.08); }
        html:not([data-theme="light"]) .rep-chip.ok { background:rgba(34,197,94,.18); color:#86efac; }
        html:not([data-theme="light"]) .rep-chip.est { background:rgba(255,255,255,.12); color:#cfc9e6; }
        html:not([data-theme="light"]) .rep-chip.env { background:rgba(239,68,68,.2); color:#fca5a5; }
        html:not([data-theme="light"]) .rep-chip.rec { background:rgba(59,130,246,.2); color:#93c5fd; }
        html:not([data-theme="light"]) .rep-card #rep-corpo { color:#e8e4f5; }
        html:not([data-theme="light"]) .rep-x { color:#b9b2d6; }
        html:not([data-theme="light"]) .rep-card [style*="#991b1b"], html:not([data-theme="light"]) .rep-card [style*="#b91c1c"] { color:#fca5a5 !important; }
        html:not([data-theme="light"]) .rep-card [style*="#1e40af"] { color:#93c5fd !important; }
        html:not([data-theme="light"]) .rep-card [style*="#6b7280"] { color:#a9a2c7 !important; }
        `;
        document.head.appendChild(st);
    }

    function abrir(html, larga) {
        css();
        const ov = document.createElement('div');
        ov.className = 'rep-ov';
        ov.innerHTML = '<div class="rep-card' + (larga ? ' larga' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
        document.body.appendChild(ov);
        ov.fechar = () => ov.remove();
        const x = ov.querySelector('.rep-x'); if (x) x.onclick = ov.fechar;
        return ov;
    }

    // ------------------------------------------------------------------ REPASSAR
    // ctx = { tabela: 'financeiro_lancamentos' | 'secretaria_lancamentos', centroId, centroNome }
    async function abrirRepassar(ctx) {
        const cli = sb(); if (!cli) return alerta('Sistema ainda carregando. Tente de novo.', 'aviso');
        if (!ctx || !ctx.centroId) return alerta('Abra um centro de custo antes de repassar.', 'aviso');
        let destinos = [];
        try {
            const r = await cli.rpc('fn_repasse_destinos');
            if (r.error) throw r.error;
            destinos = (r.data || []).filter((d) => String(d.id) !== String(ctx.centroId));
        } catch (e) { return alerta(msgErro(e), 'erro'); }
        if (!destinos.length) return alerta('Não há outro centro de custo para receber o repasse.', 'aviso');

        const grupo = (tab, tit) => {
            const L = destinos.filter((d) => d.tabela === tab);
            return L.length ? '<optgroup label="' + tit + '">' + L.map((d) => '<option value="' + esc(d.tabela + '|' + d.id) + '">' + esc(d.nome) + (d.empresa ? ' (' + esc(d.empresa) + ')' : '') + '</option>').join('') + '</optgroup>' : '';
        };
        const ov = abrir(
            '<button class="rep-x" title="Fechar">&times;</button>' +
            '<h2><i class="fa-solid fa-right-left" style="color:#4f46e5"></i> Repassar valor</h2>' +
            '<div class="rep-sub">Sai como <b>despesa</b> de <b>' + esc(ctx.centroNome) + '</b> e entra como <b>receita</b> no centro de destino. Os dois lançamentos são criados juntos.</div>' +
            '<label>Centro de destino</label><select id="rep-dest"><option value="">Selecione…</option>' + grupo('financeiro_lancamentos', 'Financeiro') + grupo('secretaria_lancamentos', 'Secretaria') + '</select>' +
            '<div class="rep-linha2"><div><label>Valor (R$)</label><input id="rep-valor" inputmode="numeric" placeholder="0,00" autocomplete="off"></div>' +
            '<div><label>Data do repasse</label><input id="rep-data" type="date" value="' + hoje() + '"></div></div>' +
            '<label>Observação (opcional)</label><input id="rep-obs" maxlength="140" placeholder="Ex.: reembolso de despesas do mês">' +
            '<div class="rep-acoes"><button class="rep-btn" id="rep-cancelar">Cancelar</button><button class="rep-btn pri" id="rep-seguir">Revisar repasse</button></div>');
        ov.querySelector('#rep-valor').addEventListener('input', (e) => mascaraMoeda(e.target));
        ov.querySelector('#rep-cancelar').onclick = ov.fechar;
        ov.querySelector('#rep-seguir').onclick = () => {
            const sel = ov.querySelector('#rep-dest').value;
            const valor = lerMoeda(ov.querySelector('#rep-valor').value);
            const data = ov.querySelector('#rep-data').value;
            const obs = ov.querySelector('#rep-obs').value.trim();
            if (!sel) return alerta('Escolha o centro de destino.', 'aviso');
            if (!(valor > 0)) return alerta('Informe um valor maior que zero.', 'aviso');
            if (!data) return alerta('Informe a data do repasse.', 'aviso');
            const [tab, id] = sel.split('|');
            const dest = destinos.find((d) => String(d.id) === id && d.tabela === tab);
            revisar(ov, ctx, dest, valor, data, obs);
        };
    }

    function revisar(ov, ctx, dest, valor, data, obs) {
        ov.querySelector('.rep-card').innerHTML =
            '<button class="rep-x" title="Fechar">&times;</button>' +
            '<h2><i class="fa-solid fa-clipboard-check" style="color:#4f46e5"></i> Confirme o repasse</h2>' +
            '<div class="rep-sub">Confira os dados. Depois de confirmar, os dois lançamentos são criados.</div>' +
            '<div class="rep-resumo"><div><b>De:</b> ' + esc(ctx.centroNome) + ' <span style="color:#991b1b">(despesa)</span></div>' +
            '<div><b>Para:</b> ' + esc(dest.nome) + ' <span style="color:#1e40af">(receita)</span></div>' +
            '<div><b>Valor:</b> ' + brl(valor) + '</div><div><b>Data:</b> ' + fmtData(data) + '</div>' + (obs ? '<div><b>Obs.:</b> ' + esc(obs) + '</div>' : '') + '</div>' +
            '<div class="rep-aviso"><i class="fa-solid fa-circle-info"></i> Se errar o valor ou quiser cancelar, use <b>Repasses</b> no centro de custo: <b>Corrigir</b> ajusta os dois lados e <b>Estornar</b> devolve o valor para a origem.</div>' +
            '<div class="rep-acoes"><button class="rep-btn" id="rep-voltar">Voltar</button><button class="rep-btn pri" id="rep-ok"><i class="fa-solid fa-check"></i> Confirmar repasse</button></div>';
        ov.querySelector('.rep-x').onclick = ov.fechar;
        ov.querySelector('#rep-voltar').onclick = () => { ov.fechar(); abrirRepassar(ctx); };
        const ok = ov.querySelector('#rep-ok');
        ok.onclick = async () => {
            ok.disabled = true; ok.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gravando…';
            try {
                const r = await sb().rpc('fn_repasse_criar', {
                    p_origem_tabela: ctx.tabela, p_origem_centro: ctx.centroId,
                    p_destino_tabela: dest.tabela, p_destino_centro: dest.id,
                    p_valor: valor, p_data: data, p_obs: obs || null
                });
                if (r.error) throw r.error;
                ov.fechar();
                alerta('Repasse de ' + brl(valor) + ' para ' + dest.nome + ' registrado.', 'sucesso');
                if (R.cfg && R.cfg.aoMudar) R.cfg.aoMudar();
            } catch (e) {
                ok.disabled = false; ok.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar repasse';
                alerta('Nada foi gravado. ' + msgErro(e), 'erro');
            }
        };
    }

    // ------------------------------------------------------------------ LISTA / CORRIGIR / ESTORNAR
    async function abrirLista(ctx) {
        const cli = sb(); if (!cli) return alerta('Sistema ainda carregando. Tente de novo.', 'aviso');
        if (!ctx || !ctx.centroId) return alerta('Abra um centro de custo antes.', 'aviso');
        const ov = abrir('<button class="rep-x" title="Fechar">&times;</button><h2><i class="fa-solid fa-clock-rotate-left" style="color:#4f46e5"></i> Repasses de ' + esc(ctx.centroNome) + '</h2><div class="rep-sub" id="rep-corpo">Carregando…</div>', true);
        try {
            const r = await cli.from('financeiro_repasses').select('*')
                .or('origem_centro_id.eq.' + ctx.centroId + ',destino_centro_id.eq.' + ctx.centroId)
                .order('criado_em', { ascending: false }).limit(300);
            if (r.error) throw r.error;
            const lista = r.data || [];
            const corpo = ov.querySelector('#rep-corpo');
            if (!lista.length) { corpo.innerHTML = 'Nenhum repasse neste centro de custo ainda.'; return; }
            const ativos = lista.filter((x) => x.status === 'Ativo');
            const enviado = ativos.filter((x) => String(x.origem_centro_id) === String(ctx.centroId)).reduce((s, x) => s + Number(x.valor), 0);
            const recebido = ativos.filter((x) => String(x.destino_centro_id) === String(ctx.centroId)).reduce((s, x) => s + Number(x.valor), 0);
            corpo.innerHTML =
                '<div style="display:flex; gap:14px; flex-wrap:wrap; margin-bottom:12px;"><div class="rep-resumo" style="flex:1; min-width:180px; margin:0;"><b>Enviado (ativos):</b><br><span style="color:#991b1b; font-size:1.1rem; font-weight:800;">' + brl(enviado) + '</span></div>' +
                '<div class="rep-resumo" style="flex:1; min-width:180px; margin:0;"><b>Recebido (ativos):</b><br><span style="color:#1e40af; font-size:1.1rem; font-weight:800;">' + brl(recebido) + '</span></div></div>' +
                '<div style="overflow-x:auto;"><table class="rep-tab"><thead><tr><th>Data</th><th>Movimento</th><th>Valor</th><th>Observação</th><th>Situação</th><th></th></tr></thead><tbody>' +
                lista.map((x) => {
                    const saiu = String(x.origem_centro_id) === String(ctx.centroId);
                    const mov = saiu ? '<span class="rep-chip env">ENVIADO</span> para <b>' + esc(x.destino_centro_nome) + '</b>' : '<span class="rep-chip rec">RECEBIDO</span> de <b>' + esc(x.origem_centro_nome) + '</b>';
                    const sit = x.status === 'Ativo'
                        ? '<span class="rep-chip ok">ATIVO</span><div style="font-size:.72rem; color:#6b7280; margin-top:3px;">por ' + esc(x.criado_por || '') + ' em ' + fmtDataHora(x.criado_em) + (x.corrigido_em ? '<br>corrigido por ' + esc(x.corrigido_por || '') + ' em ' + fmtDataHora(x.corrigido_em) + (x.valor_original ? ' (era ' + brl(x.valor_original) + ')' : '') : '') + '</div>'
                        : '<span class="rep-chip est">ESTORNADO</span><div style="font-size:.72rem; color:#6b7280; margin-top:3px;">por ' + esc(x.estornado_por || '') + ' em ' + fmtDataHora(x.estornado_em) + (x.motivo_estorno ? '<br>Motivo: ' + esc(x.motivo_estorno) : '') + '</div>';
                    const acoes = x.status === 'Ativo' ? '<button class="rep-btn mini" data-corrigir="' + esc(x.id) + '">Corrigir</button> <button class="rep-btn mini perigo" data-estornar="' + esc(x.id) + '">Estornar</button>' : '';
                    return '<tr><td style="white-space:nowrap">' + fmtData(x.data_repasse) + '</td><td>' + mov + '</td><td style="white-space:nowrap; font-weight:800;">' + brl(x.valor) + '</td><td>' + esc(x.observacao || '') + '</td><td>' + sit + '</td><td style="white-space:nowrap">' + acoes + '</td></tr>';
                }).join('') + '</tbody></table></div>';
            corpo.querySelectorAll('[data-corrigir]').forEach((b) => { b.onclick = () => corrigir(lista.find((x) => String(x.id) === b.getAttribute('data-corrigir')), ctx, ov); });
            corpo.querySelectorAll('[data-estornar]').forEach((b) => { b.onclick = () => estornar(lista.find((x) => String(x.id) === b.getAttribute('data-estornar')), ctx, ov); });
        } catch (e) { ov.querySelector('#rep-corpo').innerHTML = '<span style="color:#b91c1c">' + esc(msgErro(e)) + '</span>'; }
    }

    function corrigir(rep, ctx, ovLista) {
        if (!rep) return;
        const ov = abrir(
            '<button class="rep-x" title="Fechar">&times;</button>' +
            '<h2><i class="fa-solid fa-pen" style="color:#4f46e5"></i> Corrigir repasse</h2>' +
            '<div class="rep-sub">' + esc(rep.origem_centro_nome) + ' <span class="seta">→</span> ' + esc(rep.destino_centro_nome) + '. A correção muda os <b>dois lados</b> de uma vez.</div>' +
            '<div class="rep-linha2"><div><label>Valor (R$)</label><input id="rep-c-valor" inputmode="numeric" autocomplete="off" value="' + Number(rep.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '"></div>' +
            '<div><label>Data do repasse</label><input id="rep-c-data" type="date" value="' + String(rep.data_repasse).slice(0, 10) + '"></div></div>' +
            '<label>Observação</label><input id="rep-c-obs" maxlength="140" value="' + esc(rep.observacao || '') + '">' +
            '<div class="rep-acoes"><button class="rep-btn" id="rep-c-cancelar">Cancelar</button><button class="rep-btn pri" id="rep-c-ok">Salvar correção</button></div>');
        ov.querySelector('#rep-c-valor').addEventListener('input', (e) => mascaraMoeda(e.target));
        ov.querySelector('#rep-c-cancelar').onclick = ov.fechar;
        const ok = ov.querySelector('#rep-c-ok');
        ok.onclick = async () => {
            const valor = lerMoeda(ov.querySelector('#rep-c-valor').value), data = ov.querySelector('#rep-c-data').value, obs = ov.querySelector('#rep-c-obs').value.trim();
            if (!(valor > 0)) return alerta('Informe um valor maior que zero.', 'aviso');
            if (!data) return alerta('Informe a data.', 'aviso');
            ok.disabled = true; ok.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando…';
            try {
                const r = await sb().rpc('fn_repasse_corrigir', { p_repasse: rep.id, p_valor: valor, p_data: data, p_obs: obs || null });
                if (r.error) throw r.error;
                ov.fechar(); ovLista.fechar();
                alerta('Repasse corrigido nos dois centros.', 'sucesso');
                if (R.cfg && R.cfg.aoMudar) R.cfg.aoMudar();
                abrirLista(ctx);
            } catch (e) { ok.disabled = false; ok.textContent = 'Salvar correção'; alerta('Nada foi alterado. ' + msgErro(e), 'erro'); }
        };
    }

    function estornar(rep, ctx, ovLista) {
        if (!rep) return;
        const ov = abrir(
            '<button class="rep-x" title="Fechar">&times;</button>' +
            '<h2><i class="fa-solid fa-rotate-left" style="color:#dc2626"></i> Estornar repasse</h2>' +
            '<div class="rep-resumo"><div><b>' + brl(rep.valor) + '</b> em ' + fmtData(rep.data_repasse) + '</div><div>' + esc(rep.origem_centro_nome) + ' <span class="seta">→</span> ' + esc(rep.destino_centro_nome) + '</div></div>' +
            '<div class="rep-aviso"><i class="fa-solid fa-triangle-exclamation"></i> O valor <b>volta para ' + esc(rep.origem_centro_nome) + '</b>: a despesa da origem e a receita do destino deixam de existir, juntas. O repasse fica guardado como <b>Estornado</b> (quem, quando e o motivo).</div>' +
            '<label>Motivo do estorno (obrigatório)</label><input id="rep-e-motivo" maxlength="160" placeholder="Ex.: valor enviado errado">' +
            '<div class="rep-acoes"><button class="rep-btn" id="rep-e-cancelar">Cancelar</button><button class="rep-btn perigo" id="rep-e-ok">Estornar repasse</button></div>');
        ov.querySelector('#rep-e-cancelar').onclick = ov.fechar;
        const ok = ov.querySelector('#rep-e-ok');
        ok.onclick = async () => {
            const motivo = ov.querySelector('#rep-e-motivo').value.trim();
            if (motivo.length < 3) return alerta('Informe o motivo do estorno.', 'aviso');
            ok.disabled = true; ok.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Estornando…';
            try {
                const r = await sb().rpc('fn_repasse_estornar', { p_repasse: rep.id, p_motivo: motivo });
                if (r.error) throw r.error;
                ov.fechar(); ovLista.fechar();
                alerta('Repasse estornado: o valor voltou para ' + rep.origem_centro_nome + '.', 'sucesso');
                if (R.cfg && R.cfg.aoMudar) R.cfg.aoMudar();
                abrirLista(ctx);
            } catch (e) { ok.disabled = false; ok.textContent = 'Estornar repasse'; alerta('Nada foi alterado. ' + msgErro(e), 'erro'); }
        };
    }

    // lançamento criado por um repasse (marcado com grupo_id "REP-...") não é editado/excluído pela tela normal
    const ehRepasse = (l) => !!(l && typeof l.grupo_id === 'string' && l.grupo_id.indexOf('REP-') === 0);
    function bloqueio() { alerta('Este lançamento foi criado por um repasse entre centros. Para corrigir ou cancelar, use o botão "Repasses" do centro de custo (Corrigir / Estornar).', 'aviso'); }

    window.REPASSES = { configurar: (c) => { R.cfg = c; }, abrirRepassar, abrirLista, ehRepasse, bloqueio, _lerMoeda: lerMoeda };
})();
