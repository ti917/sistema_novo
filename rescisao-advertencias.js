/* =====================================================================
   RESCISÃO × ADVERTÊNCIAS / URGÊNCIA  (pedido dos donos em 27/11/2026)
   ---------------------------------------------------------------------
   Regra (só para os tipos de TIPOS_COM_REGRA abaixo):
     - Pergunta se o colaborador foi orientado por CARTA DE ADVERTÊNCIA.
     - SIM  -> o sistema lê as advertências dele (tabela `advertencias`) e anexa as 3 últimas
               cartas assinadas. Se ele tiver menos de 3, só é aceito como DESLIGAMENTO URGENTE.
     - NÃO  -> só é aceito como DESLIGAMENTO URGENTE (com o motivo da urgência).
     - O pedido leva a flag de urgência / as cartas em dados_rescisao.advertencias_info e
       aparece para a Diretoria (quem aprova rescisões), para o RH e nas Solicitações.
     - Urgente OU sem 3 cartas SEMPRE passa pela aprovação da Diretoria (mesmo Admin dispensado).
   Não altera nenhuma tabela: tudo vai dentro do JSON dados_rescisao (perfis).
   Se algo falhar aqui, o lançamento da rescisão continua funcionando (falha aberta).
   ===================================================================== */
(function () {
    'use strict';
    if (window.RESC_ADV) return;

    // Tipos de desligamento que exigem a regra (fácil de ampliar: é só incluir o tipo na lista)
    const TIPOS_COM_REGRA = ['Pedido da Empresa'];
    const MIN_CARTAS = 3;

    const CFG = {
        gestor: { tipo: 'resc-tipo', colab: 'resc-colaborador', ancora: 'resc-motivo', form: 'form-rescisao' },
        admin:  { tipo: 'resc-admin-tipo', colab: 'resc-admin-colaborador', ancora: 'resc-admin-motivo', form: 'form-rescisao-admin' }
    };
    const estado = { gestor: null, admin: null };
    const seq = { gestor: 0, admin: 0 };

    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const $ = (id) => document.getElementById(id);
    const fmtData = (v) => {
        if (!v) return '-';
        const d = new Date(v);
        return isNaN(d) ? String(v) : d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    };

    // Carta "que vale": medida ESCRITA já CONCLUÍDA (assinada) — Advertência Escrita ou Suspensão, com documento.
    function cartaValida(a) {
        const g = String(a.gravidade || '');
        const escrita = /^Advert[eê]ncia Escrita/i.test(g) || /^Suspens/i.test(g);
        return a.status === 'Concluído' && escrita && !!(a.documento_assinado || a.carta_rh);
    }
    function resumoCarta(a) {
        const datas = Array.isArray(a.datas_ocorrencia) ? a.datas_ocorrencia.filter(Boolean) : [];
        return {
            id: a.id,
            data: a.created_at || null,
            tipo: a.gravidade || '',
            datas_ocorrencia: datas,
            motivo: String(a.motivo || '').slice(0, 600),
            documento: a.documento_assinado || a.carta_rh || ''
        };
    }

    function aplicavel(prefix) {
        const c = CFG[prefix];
        const t = $(c.tipo);
        return !!(t && TIPOS_COM_REGRA.includes(t.value));
    }
    function idColab(prefix) {
        const s = $(CFG[prefix].colab);
        return s && s.value ? s.value : '';
    }

    function garantirCaixa(prefix) {
        const c = CFG[prefix];
        let box = $('rescadv-' + prefix);
        if (box) return box;
        const ancora = $(c.ancora);
        if (!ancora) return null;
        const grupo = ancora.closest('.form-group') || ancora.parentElement;
        if (!grupo || !grupo.parentElement) return null;
        box = document.createElement('div');
        box.id = 'rescadv-' + prefix;
        box.style.cssText = 'display:none; margin: 0 0 18px 0;';
        grupo.parentElement.insertBefore(box, grupo);
        return box;
    }

    // ------------------------------------------------------------------ carregar + desenhar
    async function atualizar(prefix) {
        const box = garantirCaixa(prefix);
        if (!box) return;
        const meuSeq = ++seq[prefix];
        if (!aplicavel(prefix) || !idColab(prefix)) { box.style.display = 'none'; box.innerHTML = ''; estado[prefix] = null; return; }

        const id = idColab(prefix);
        const anterior = estado[prefix] && estado[prefix].id === id ? estado[prefix] : null;
        box.style.display = 'block';
        if (!anterior) box.innerHTML = '<div style="padding:12px; color: var(--cor-texto-secundario); font-size:0.85rem;"><i class="fa-solid fa-circle-notch fa-spin"></i> Conferindo as cartas de advertência do colaborador...</div>';

        let cartas = null, falhou = false, naoContam = 0;
        try {
            const r = await supabaseClient.from('advertencias')
                .select('id, gravidade, status, motivo, datas_ocorrencia, carta_rh, documento_assinado, created_at')
                .eq('colaborador_id', id).order('created_at', { ascending: false }).limit(200);
            if (r.error) throw r.error;
            const todas = r.data || [];
            cartas = todas.filter(cartaValida).map(resumoCarta);
            naoContam = todas.length - cartas.length;
        } catch (e) { console.warn('Rescisão×Advertências: falha ao ler advertências', e); falhou = true; }
        if (meuSeq !== seq[prefix]) return; // o usuário já mudou de colaborador/tipo

        estado[prefix] = {
            id, falhou, naoContam,
            total: cartas ? cartas.length : 0,
            ultimas: cartas ? cartas.slice(0, MIN_CARTAS) : [],
            orientado: anterior ? anterior.orientado : null,   // 'sim' | 'nao' | null
            urgente: anterior ? anterior.urgente : false,
            motivoUrg: anterior ? anterior.motivoUrg : ''
        };
        desenhar(prefix);
    }

    function precisaUrgencia(st) {
        if (!st) return false;
        if (st.falhou) return false;                 // não deu pra conferir: não trava
        if (st.orientado === 'nao') return true;
        if (st.orientado === 'sim' && st.total < MIN_CARTAS) return true;
        return false;
    }

    function desenhar(prefix) {
        const box = $('rescadv-' + prefix), st = estado[prefix];
        if (!box || !st) return;
        const exige = precisaUrgencia(st);
        if (exige) st.urgente = true;

        const radio = (valor, rotulo) => `<label style="display:inline-flex; align-items:center; gap:6px; margin-right:18px; cursor:pointer; font-weight:600;">
            <input type="radio" name="rescadv-orient-${prefix}" value="${valor}" ${st.orientado === valor ? 'checked' : ''} onchange="window.RESC_ADV._orientou('${prefix}','${valor}')"> ${rotulo}</label>`;

        let lista = '';
        if (st.orientado === 'sim') {
            if (st.falhou) {
                lista = `<div style="margin-top:10px; padding:10px 12px; border-radius:8px; background: rgba(255,152,0,0.1); border:1px solid #ff9800; font-size:0.82rem;"><i class="fa-solid fa-triangle-exclamation" style="color:#ff9800;"></i> Não consegui conferir as advertências deste colaborador agora. O pedido segue, mas vai para a <b>aprovação da Diretoria</b> marcado como "não verificado".</div>`;
            } else if (st.ultimas.length) {
                lista = `<div style="margin-top:10px; font-size:0.82rem; color: var(--cor-texto-secundario);">${st.ultimas.length === 1 ? 'A última carta assinada será' : 'As ' + st.ultimas.length + ' últimas cartas assinadas serão'} <b>anexada(s) ao pedido</b> automaticamente:</div>` +
                    st.ultimas.map((c, i) => `<div style="margin-top:6px; padding:8px 10px; border-radius:8px; background: rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.35); font-size:0.82rem; display:flex; gap:10px; justify-content:space-between; align-items:flex-start; flex-wrap:wrap;">
                        <div style="flex:1; min-width:200px;"><b style="color:#c4b5fd;">${i + 1}. ${esc(c.tipo)}</b> — ${fmtData(c.data)}<br><span style="color: var(--cor-texto-secundario);">${esc(c.motivo || 'Sem motivo registrado')}</span></div>
                        ${c.documento ? `<a href="${esc(c.documento)}" target="_blank" rel="noopener" style="color:#4fc3f7; font-weight:bold; text-decoration:none; white-space:nowrap;"><i class="fa-solid fa-file-pdf"></i> Ver carta</a>` : ''}</div>`).join('');
            } else {
                lista = `<div style="margin-top:10px; font-size:0.82rem; color: var(--cor-texto-secundario);">Nenhuma carta de advertência assinada encontrada para este colaborador.</div>`;
            }
            if (!st.falhou) {
                lista += st.total >= MIN_CARTAS
                    ? `<div style="margin-top:10px; padding:9px 12px; border-radius:8px; background: rgba(40,167,69,0.1); border:1px solid #28a745; font-size:0.82rem; color:#28a745;"><i class="fa-solid fa-circle-check"></i> Este colaborador tem ${st.total} carta(s) assinada(s). Pode seguir como desligamento normal.</div>`
                    : `<div style="margin-top:10px; padding:9px 12px; border-radius:8px; background: rgba(220,53,69,0.1); border:1px solid #dc3545; font-size:0.82rem; color:#dc3545;"><i class="fa-solid fa-circle-exclamation"></i> Este colaborador tem só <b>${st.total}</b> carta(s) assinada(s). São necessárias <b>${MIN_CARTAS}</b>. Sem elas, só é aceito como <b>desligamento urgente</b>.</div>`;
                if (st.naoContam > 0) lista += `<div style="margin-top:6px; font-size:0.74rem; color: var(--cor-texto-secundario);">(${st.naoContam} outra(s) medida(s) — verbal, em andamento ou sem carta assinada — não entram na contagem.)</div>`;
            }
        } else if (st.orientado === 'nao') {
            lista = `<div style="margin-top:10px; padding:9px 12px; border-radius:8px; background: rgba(220,53,69,0.1); border:1px solid #dc3545; font-size:0.82rem; color:#dc3545;"><i class="fa-solid fa-circle-exclamation"></i> Sem orientação por carta de advertência, o desligamento só é aceito como <b>urgente</b>.</div>`;
        }

        const urgChecked = st.urgente ? 'checked' : '';
        const urgTrava = exige ? 'disabled' : '';
        box.innerHTML = `
        <div style="border:1px solid var(--cor-advertencia, #8b5cf6); border-radius:12px; padding:14px 16px; background: rgba(139,92,246,0.05);">
            <div style="font-weight:800; color: var(--cor-advertencia, #8b5cf6); margin-bottom:8px;"><i class="fa-solid fa-gavel"></i> Cartas de advertência (exigência da Diretoria)</div>
            <div style="font-size:0.88rem; margin-bottom:8px;">O colaborador foi orientado através de carta de advertência? <span style="color: var(--cor-perigo);">*</span></div>
            <div>${radio('sim', 'Sim')}${radio('nao', 'Não')}</div>
            ${lista}
            <div style="margin-top:12px; padding-top:10px; border-top:1px dashed var(--cor-borda);">
                <label style="display:inline-flex; align-items:center; gap:8px; cursor:${exige ? 'not-allowed' : 'pointer'}; font-weight:700; color:#e74c3c;">
                    <input type="checkbox" id="rescadv-urg-${prefix}" ${urgChecked} ${urgTrava} onchange="window.RESC_ADV._urgente('${prefix}', this.checked)"> <i class="fa-solid fa-triangle-exclamation"></i> Desligamento URGENTE
                </label>
                <div style="font-size:0.76rem; color: var(--cor-texto-secundario); margin-top:3px;">${exige ? 'Marcado automaticamente: sem as 3 cartas só vale como urgente.' : 'Marque só se for um caso urgente. A Diretoria vê a flag e o motivo.'}</div>
                <div id="rescadv-urg-box-${prefix}" style="margin-top:8px; display:${st.urgente ? 'block' : 'none'};">
                    <label style="font-size:0.8rem; font-weight:700;">Motivo da urgência <span style="color: var(--cor-perigo);">*</span></label>
                    <textarea id="rescadv-urg-motivo-${prefix}" rows="2" maxlength="500" placeholder="Explique por que este desligamento é urgente..." style="width:100%; margin-top:4px; padding:10px 12px; border-radius:8px; border:1px solid var(--cor-borda); background: rgba(0,0,0,0.2); color: var(--cor-texto-principal); font-family:inherit;" oninput="window.RESC_ADV._motivoUrg('${prefix}', this.value)">${esc(st.motivoUrg)}</textarea>
                </div>
            </div>
        </div>`;
    }

    // ------------------------------------------------------------------ eventos da tela
    function orientou(prefix, valor) {
        const st = estado[prefix]; if (!st) return;
        st.orientado = valor;
        if (precisaUrgencia(st)) { st.urgente = true; st._urgAuto = true; }
        else if (st._urgAuto) { st.urgente = false; st._urgAuto = false; }   // só desmarca o que o próprio sistema marcou
        desenhar(prefix);
    }
    function urgente(prefix, marcado) {
        const st = estado[prefix]; if (!st) return;
        st.urgente = !!marcado;
        const b = $('rescadv-urg-box-' + prefix); if (b) b.style.display = st.urgente ? 'block' : 'none';
    }
    function motivoUrg(prefix, v) { const st = estado[prefix]; if (st) st.motivoUrg = v; }

    // ------------------------------------------------------------------ usado pelo envio do formulário
    // Retorna um texto de erro (HTML) se o formulário não pode ser enviado; senão null.
    function validar(prefix) {
        try {
            if (!aplicavel(prefix)) return null;
            const st = estado[prefix];
            if (!st || st.id !== idColab(prefix)) return 'Aguarde um instante: o sistema ainda está conferindo as <b>cartas de advertência</b> do colaborador.';
            if (!st.orientado) return 'Informe se o colaborador <b>foi orientado através de carta de advertência</b> (Sim ou Não).';
            const exige = precisaUrgencia(st);
            if (exige && !st.urgente) return 'Sem as ' + MIN_CARTAS + ' cartas de advertência, o desligamento só pode ser enviado como <b>URGENTE</b>.';
            if (st.urgente && String(st.motivoUrg || '').trim().length < 10) return 'Descreva o <b>motivo da urgência</b> do desligamento (mínimo de 10 letras).';
            return null;
        } catch (e) { console.warn('Rescisão×Advertências: falha ao validar', e); return null; }
    }

    // Objeto salvo no pedido (dentro de dados_rescisao). Vazio quando a regra não se aplica.
    function coletar(prefix) {
        try {
            if (!aplicavel(prefix)) return {};
            const st = estado[prefix];
            if (!st || st.id !== idColab(prefix)) return {};
            const info = {
                orientado_por_carta: st.orientado === 'sim',
                total_cartas: st.total,
                minimo: MIN_CARTAS,
                cartas: st.orientado === 'sim' ? st.ultimas : [],
                urgente: !!st.urgente,
                motivo_urgencia: st.urgente ? String(st.motivoUrg || '').trim() : '',
                nao_verificado: !!st.falhou,
                registrado_por: (typeof usuarioAtual !== 'undefined' && usuarioAtual) ? usuarioAtual.nome : null,
                registrado_em: new Date().toISOString()
            };
            return { advertencias_info: info };
        } catch (e) { console.warn('Rescisão×Advertências: falha ao coletar', e); return {}; }
    }

    // Este pedido precisa passar pela Diretoria mesmo que quem lança seja um Admin "dispensado"?
    function forcaDiretoria(prefix) {
        try {
            const i = coletar(prefix).advertencias_info;
            return !!(i && (i.urgente || i.nao_verificado || !i.orientado_por_carta || i.total_cartas < MIN_CARTAS));
        } catch (e) { return false; }
    }

    // ------------------------------------------------------------------ exibição (Solicitações, Diretoria, RH)
    function badgeHtml(resc) {
        try {
            const i = resc && resc.advertencias_info;
            if (!i) return '';
            const partes = [];
            if (i.urgente) partes.push('<span style="display:inline-block; background:#dc3545; color:#fff; font-weight:800; font-size:0.68rem; padding:2px 8px; border-radius:10px; margin-right:6px;"><i class="fa-solid fa-triangle-exclamation"></i> URGENTE</span>');
            if (i.orientado_por_carta === false) partes.push('<span style="font-size:0.72rem; color:#e67e22;"><i class="fa-solid fa-gavel"></i> Sem carta de advertência</span>');
            else if (i.orientado_por_carta && (i.total_cartas || 0) >= MIN_CARTAS) partes.push('<span style="font-size:0.72rem; color:#28a745;"><i class="fa-solid fa-gavel"></i> ' + MIN_CARTAS + ' cartas anexadas</span>');
            else if (i.orientado_por_carta) partes.push('<span style="font-size:0.72rem; color:#e67e22;"><i class="fa-solid fa-gavel"></i> Só ' + (i.total_cartas || 0) + ' carta(s)</span>');
            return partes.length ? '<br>' + partes.join('') : '';
        } catch (e) { return ''; }
    }

    function painelHtml(resc) {
        try {
            const i = resc && resc.advertencias_info;
            if (!i) return '';
            const cartas = (i.cartas || []).map((c, n) => `<div style="margin-top:6px; padding:8px 10px; border-radius:8px; background: rgba(139,92,246,0.08); border:1px solid rgba(139,92,246,0.35); font-size:0.82rem; display:flex; gap:10px; justify-content:space-between; align-items:flex-start; flex-wrap:wrap;">
                <div style="flex:1; min-width:200px;"><b style="color:#c4b5fd;">${n + 1}. ${esc(c.tipo)}</b> — ${fmtData(c.data)}<br><span style="color: var(--cor-texto-secundario);">${esc(c.motivo || '')}</span></div>
                ${c.documento ? `<a href="${esc(c.documento)}" target="_blank" rel="noopener" style="color:#4fc3f7; font-weight:bold; text-decoration:none; white-space:nowrap;"><i class="fa-solid fa-file-pdf"></i> Ver carta</a>` : ''}</div>`).join('');
            const urg = i.urgente
                ? `<div style="margin-bottom:8px; padding:10px 12px; border-radius:8px; background: rgba(220,53,69,0.12); border:1px solid #dc3545; font-size:0.85rem;"><b style="color:#dc3545;"><i class="fa-solid fa-triangle-exclamation"></i> DESLIGAMENTO URGENTE</b><br><b>Motivo da urgência:</b> ${esc(i.motivo_urgencia || '-')}</div>` : '';
            const resumo = i.orientado_por_carta === false
                ? 'O colaborador <b>não foi orientado</b> por carta de advertência.'
                : `O colaborador foi orientado por carta de advertência — <b>${i.total_cartas || 0}</b> carta(s) assinada(s) no sistema${(i.total_cartas || 0) < MIN_CARTAS ? ' (menos de ' + MIN_CARTAS + ')' : ''}.`;
            const nv = i.nao_verificado ? '<div style="margin-top:6px; font-size:0.78rem; color:#ff9800;"><i class="fa-solid fa-triangle-exclamation"></i> As advertências não puderam ser conferidas automaticamente no lançamento.</div>' : '';
            return `<div style="border:1px solid var(--cor-advertencia, #8b5cf6); border-radius:12px; padding:12px 14px; margin-bottom:14px; background: rgba(139,92,246,0.05);">
                <div style="font-weight:800; color: var(--cor-advertencia, #8b5cf6); margin-bottom:8px;"><i class="fa-solid fa-gavel"></i> Cartas de advertência</div>
                ${urg}<div style="font-size:0.85rem;">${resumo}</div>${cartas}${nv}</div>`;
        } catch (e) { return ''; }
    }

    // ------------------------------------------------------------------ ligação com as telas
    function ligar(prefix) {
        const c = CFG[prefix];
        const tipo = $(c.tipo), colab = $(c.colab), form = $(c.form);
        if (!tipo || !colab || colab._rescadvLigado) return !!(colab && colab._rescadvLigado);
        colab._rescadvLigado = true;
        tipo.addEventListener('change', () => atualizar(prefix));
        colab.addEventListener('change', () => atualizar(prefix));
        // a lista de colaboradores é refeita por código (sem evento): reage à troca das opções
        try { new MutationObserver(() => atualizar(prefix)).observe(colab, { childList: true }); } catch (e) {}
        if (form) form.addEventListener('reset', () => setTimeout(() => atualizar(prefix), 0));
        return true;
    }
    function iniciar() {
        let ok = 0;
        ['gestor', 'admin'].forEach((p) => { try { if (ligar(p)) ok++; } catch (e) { console.warn(e); } });
        return ok;
    }

    window.RESC_ADV = { validar, coletar, forcaDiretoria, badgeHtml, painelHtml, _orientou: orientou, _urgente: urgente, _motivoUrg: motivoUrg, _atualizar: atualizar, TIPOS_COM_REGRA, MIN_CARTAS };

    // As telas podem ser montadas depois do carregamento: tenta de novo por alguns segundos
    let tent = 0;
    const timer = setInterval(() => { tent++; if (iniciar() >= 2 || tent > 40) clearInterval(timer); }, 500);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
