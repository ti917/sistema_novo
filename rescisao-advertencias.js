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

    // ------------------------------------------------------------------ visual
    function css() {
        if (document.getElementById('rescadv-css')) return;
        const st = document.createElement('style'); st.id = 'rescadv-css';
        st.textContent = `
        .rescadv { --ra-cor: #8b5cf6; border: 1px solid rgba(139,92,246,.45); border-radius: 16px; padding: 18px 20px; background: linear-gradient(180deg, rgba(139,92,246,.10), rgba(139,92,246,.03)); box-shadow: 0 6px 22px rgba(0,0,0,.12); }
        .rescadv-topo { display:flex; align-items:center; gap:14px; margin-bottom:14px; flex-wrap:wrap; }
        .rescadv-ico { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; color:#fff; background: linear-gradient(135deg,#8b5cf6,#6d28d9); box-shadow:0 4px 12px rgba(109,40,217,.35); flex-shrink:0; }
        .rescadv-tit { flex:1; min-width:200px; }
        .rescadv-tit > b { display:block; font-size:1.02rem; color: var(--cor-texto-principal); }
        .rescadv-tit span { font-size:.78rem; color: var(--cor-texto-secundario); }
        .rescadv-pill { font-size:.74rem; font-weight:800; padding:6px 12px; border-radius:999px; border:1px solid; white-space:nowrap; }
        .rescadv-pill.ok { color:#16a34a; background:rgba(34,197,94,.12); border-color:rgba(34,197,94,.5); }
        .rescadv-pill.alerta { color:#dc2626; background:rgba(239,68,68,.10); border-color:rgba(239,68,68,.5); }
        .rescadv-pill.neutro { color: var(--cor-texto-secundario); background:rgba(127,127,127,.10); border-color:rgba(127,127,127,.35); }
        .rescadv-perg { font-size:.9rem; font-weight:700; margin:4px 0 10px; color: var(--cor-texto-principal); }
        .rescadv-seg { display:grid; grid-template-columns:1fr 1fr; gap:10px; max-width:420px; }
        .rescadv-seg label { position:relative; cursor:pointer; margin:0; }
        .rescadv-seg input { position:absolute; opacity:0; inset:0; cursor:pointer; }
        .rescadv-seg span { display:flex; align-items:center; justify-content:center; gap:8px; padding:12px 14px; border-radius:12px; font-weight:800; font-size:.92rem; border:2px solid var(--cor-borda); background: rgba(127,127,127,.07); color: var(--cor-texto-secundario); transition:.15s; }
        .rescadv-seg label:hover span { border-color: rgba(139,92,246,.6); }
        .rescadv-seg input:checked + span.sim { border-color:#16a34a; background:rgba(34,197,94,.14); color:#16a34a; }
        .rescadv-seg input:checked + span.nao { border-color:#dc2626; background:rgba(239,68,68,.12); color:#dc2626; }
        .rescadv-sub { margin:16px 0 8px; font-size:.78rem; font-weight:800; letter-spacing:.04em; text-transform:uppercase; color: var(--cor-texto-secundario); }
        .rescadv-cartas { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:10px; }
        .rescadv-carta { position:relative; border-radius:12px; padding:12px 14px 12px 52px; border:1px solid rgba(139,92,246,.4); background: rgba(139,92,246,.08); min-height:86px; display:flex; flex-direction:column; gap:4px; }
        .rescadv-carta .n { position:absolute; left:12px; top:12px; width:30px; height:30px; border-radius:50%; background:#8b5cf6; color:#fff; font-weight:900; display:flex; align-items:center; justify-content:center; font-size:.85rem; }
        .rescadv-carta .t { font-weight:800; font-size:.86rem; color: var(--cor-texto-principal); line-height:1.25; }
        .rescadv-carta .d { font-size:.72rem; color: var(--cor-texto-secundario); }
        .rescadv-carta .m { font-size:.78rem; color: var(--cor-texto-principal); opacity:.85; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .rescadv-carta a { align-self:flex-start; margin-top:2px; font-size:.76rem; font-weight:800; color:#3b82f6; text-decoration:none; }
        .rescadv-carta a:hover { text-decoration:underline; }
        .rescadv-carta.vazia { border:2px dashed rgba(220,38,38,.45); background: rgba(220,38,38,.04); padding-left:14px; align-items:center; justify-content:center; text-align:center; color:#dc2626; font-weight:700; font-size:.8rem; }
        .rescadv-msg { margin-top:12px; padding:11px 14px; border-radius:12px; font-size:.84rem; display:flex; gap:10px; align-items:flex-start; line-height:1.4; border:1px solid; }
        .rescadv-msg.ok { color:#16a34a; background:rgba(34,197,94,.10); border-color:rgba(34,197,94,.45); }
        .rescadv-msg.erro { color:#dc2626; background:rgba(239,68,68,.08); border-color:rgba(239,68,68,.45); }
        .rescadv-msg.aviso { color:#d97706; background:rgba(245,158,11,.10); border-color:rgba(245,158,11,.45); }
        .rescadv-msg i { margin-top:2px; }
        .rescadv-msg small { display:block; opacity:.85; margin-top:2px; }
        .rescadv-urg { margin-top:16px; display:flex; align-items:center; gap:14px; padding:14px 16px; border-radius:14px; border:1px solid var(--cor-borda); background: rgba(127,127,127,.06); cursor:pointer; transition:.15s; }
        .rescadv-urg.on { border-color:#dc2626; background:rgba(239,68,68,.09); }
        .rescadv-urg.trava { cursor:not-allowed; }
        .rescadv-urg .ic { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:rgba(127,127,127,.15); color: var(--cor-texto-secundario); flex-shrink:0; }
        .rescadv-urg.on .ic { background:#dc2626; color:#fff; }
        .rescadv-urg .tx { flex:1; min-width:0; }
        .rescadv-urg .tx b { display:block; font-size:.92rem; color: var(--cor-texto-principal); }
        .rescadv-urg .tx span { font-size:.76rem; color: var(--cor-texto-secundario); }
        .rescadv-sw { position:relative; width:48px; height:26px; flex-shrink:0; }
        .rescadv-sw input { position:absolute; opacity:0; inset:0; margin:0; cursor:inherit; z-index:2; }
        .rescadv-sw i { position:absolute; inset:0; border-radius:999px; background:rgba(127,127,127,.4); transition:.15s; }
        .rescadv-sw i::after { content:''; position:absolute; top:3px; left:3px; width:20px; height:20px; border-radius:50%; background:#fff; transition:.15s; box-shadow:0 1px 3px rgba(0,0,0,.35); }
        .rescadv-sw input:checked + i { background:#dc2626; }
        .rescadv-sw input:checked + i::after { left:25px; }
        `;
        document.head.appendChild(st);
    }

    function cartaHtml(c, i) {
        return `<div class="rescadv-carta"><span class="n">${i + 1}</span>
            <div class="t">${esc(c.tipo || 'Advertência')}</div><div class="d"><i class="fa-regular fa-calendar"></i> ${fmtData(c.data)}</div>
            <div class="m" title="${esc(c.motivo || '')}">${esc(c.motivo || 'Sem motivo registrado')}</div>
            ${c.documento ? `<a href="${esc(c.documento)}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf"></i> Ver carta assinada</a>` : ''}</div>`;
    }

    function desenhar(prefix) {
        css();
        const box = $('rescadv-' + prefix), st = estado[prefix];
        if (!box || !st) return;
        const exige = precisaUrgencia(st);
        if (exige) st.urgente = true;

        // selo do canto: andamento das cartas
        let pill = '<span class="rescadv-pill neutro">Responda abaixo</span>';
        if (st.falhou) pill = '<span class="rescadv-pill neutro">Não verificado</span>';
        else if (st.total >= MIN_CARTAS) pill = `<span class="rescadv-pill ok"><i class="fa-solid fa-circle-check"></i> ${MIN_CARTAS} de ${MIN_CARTAS} cartas</span>`;
        else pill = `<span class="rescadv-pill alerta"><i class="fa-solid fa-circle-exclamation"></i> ${st.total} de ${MIN_CARTAS} cartas</span>`;

        let corpo = '';
        if (st.orientado === 'sim') {
            if (st.falhou) {
                corpo = `<div class="rescadv-msg aviso"><i class="fa-solid fa-triangle-exclamation"></i><div>Não consegui conferir as advertências deste colaborador agora.<small>O pedido segue, mas vai para a aprovação da Diretoria marcado como "não verificado".</small></div></div>`;
            } else {
                const slots = [];
                for (let i = 0; i < MIN_CARTAS; i++) slots.push(st.ultimas[i] ? cartaHtml(st.ultimas[i], i) : `<div class="rescadv-carta vazia"><span><i class="fa-regular fa-file-circle-xmark"></i><br>Carta ${i + 1} não encontrada</span></div>`);
                corpo = `<div class="rescadv-sub">${st.ultimas.length ? 'Cartas anexadas automaticamente ao pedido' : 'Cartas encontradas'}</div><div class="rescadv-cartas">${slots.join('')}</div>`;
                corpo += st.total >= MIN_CARTAS
                    ? `<div class="rescadv-msg ok"><i class="fa-solid fa-circle-check"></i><div><b>Tudo certo.</b> O colaborador tem ${st.total} carta(s) assinada(s). Pode seguir como desligamento normal.</div></div>`
                    : `<div class="rescadv-msg erro"><i class="fa-solid fa-circle-exclamation"></i><div><b>Faltam ${MIN_CARTAS - st.total} carta(s).</b> São necessárias ${MIN_CARTAS} cartas assinadas. Sem elas, só é aceito como <b>desligamento urgente</b>.</div></div>`;
                if (st.naoContam > 0) corpo += `<div style="margin-top:6px; font-size:.72rem; color: var(--cor-texto-secundario);">${st.naoContam} outra(s) medida(s) (verbal, em andamento ou sem carta assinada) não entram na contagem.</div>`;
            }
        } else if (st.orientado === 'nao') {
            corpo = `<div class="rescadv-msg erro"><i class="fa-solid fa-circle-exclamation"></i><div><b>Sem orientação por carta de advertência.</b> Nesse caso o desligamento só é aceito como <b>urgente</b>.</div></div>`;
        }

        const rotuloMot = st.urgente ? 'Motivo da urgência' : 'Justificativa do desligamento';
        box.innerHTML = `
        <div class="rescadv">
            <div class="rescadv-topo">
                <div class="rescadv-ico"><i class="fa-solid fa-gavel"></i></div>
                <div class="rescadv-tit"><b>Cartas de advertência</b><span>Exigência da Diretoria para o Pedido da Empresa</span></div>
                ${pill}
            </div>
            <div class="rescadv-perg">O colaborador foi orientado através de carta de advertência? <span style="color: var(--cor-perigo);">*</span></div>
            <div class="rescadv-seg">
                <label><input type="radio" name="rescadv-orient-${prefix}" value="sim" ${st.orientado === 'sim' ? 'checked' : ''} onchange="window.RESC_ADV._orientou('${prefix}','sim')"><span class="sim"><i class="fa-solid fa-check"></i> Sim</span></label>
                <label><input type="radio" name="rescadv-orient-${prefix}" value="nao" ${st.orientado === 'nao' ? 'checked' : ''} onchange="window.RESC_ADV._orientou('${prefix}','nao')"><span class="nao"><i class="fa-solid fa-xmark"></i> Não</span></label>
            </div>
            ${corpo}
            <label class="rescadv-urg ${st.urgente ? 'on' : ''} ${exige ? 'trava' : ''}" id="rescadv-urgcard-${prefix}">
                <span class="ic"><i class="fa-solid ${exige ? 'fa-lock' : 'fa-bolt'}"></i></span>
                <span class="tx"><b>Desligamento urgente</b><span>${exige ? 'Marcado automaticamente: sem as ' + MIN_CARTAS + ' cartas, só vale como urgente. Explique a urgência no campo "Motivo do Desligamento" logo abaixo.' : 'Marque só se for um caso urgente. Explique a urgência no campo "Motivo do Desligamento" logo abaixo.'}</span></span>
                <span class="rescadv-sw"><input type="checkbox" id="rescadv-urg-${prefix}" ${st.urgente ? 'checked' : ''} ${exige ? 'disabled' : ''} onchange="window.RESC_ADV._urgente('${prefix}', this.checked)"><i></i></span>
            </label>
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
        const card = $('rescadv-urgcard-' + prefix); if (card) card.classList.toggle('on', st.urgente);
    }
    function motivoUrg() { /* o motivo é o campo "Motivo do Desligamento" do próprio formulário */ }
    function textoMotivo(prefix) {
        const el = $(CFG[prefix].ancora);
        return el ? String(el.value || '').trim() : '';
    }

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
            if (textoMotivo(prefix).length < 10) return st.urgente
                ? 'Descreva o <b>motivo da urgência</b> no campo <b>Motivo do Desligamento</b> (mínimo de 10 letras).'
                : 'Preencha o <b>Motivo do Desligamento</b> (mínimo de 10 letras). O motivo é sempre obrigatório.';
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
                motivo_urgencia: st.urgente ? textoMotivo(prefix) : '',
                justificativa: textoMotivo(prefix),
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
            // 27/11/2026: nos tipos com a regra (Pedido da Empresa), TODO pedido passa pela Diretoria — inclusive o lançado
            // por Admin/RH, mesmo que ele esteja na lista de "dispensados". (Só vale se houver aprovadores de rescisão configurados.)
            return !!coletar(prefix).advertencias_info;
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
            css();
            const total = i.total_cartas || 0;
            const pill = i.nao_verificado ? '<span class="rescadv-pill neutro">Não verificado</span>'
                : (total >= MIN_CARTAS ? `<span class="rescadv-pill ok"><i class="fa-solid fa-circle-check"></i> ${MIN_CARTAS} de ${MIN_CARTAS} cartas</span>`
                    : `<span class="rescadv-pill alerta"><i class="fa-solid fa-circle-exclamation"></i> ${total} de ${MIN_CARTAS} cartas</span>`);
            const mesmo = (x) => String(x || '').trim() === String(resc.motivo || '').trim();
            const urg = i.urgente
                ? `<div class="rescadv-msg erro" style="margin:0 0 12px;"><i class="fa-solid fa-bolt"></i><div><b>DESLIGAMENTO URGENTE</b><small>${i.motivo_urgencia && !mesmo(i.motivo_urgencia) ? '<b>Motivo da urgência:</b> ' + esc(i.motivo_urgencia) : 'A urgência está explicada no <b>Motivo</b> do pedido.'}</small></div></div>` : '';
            const resumo = i.orientado_por_carta === false
                ? '<b>Não foi orientado</b> por carta de advertência.'
                : `Foi orientado por carta de advertência: <b>${total}</b> carta(s) assinada(s) no sistema${total < MIN_CARTAS ? ' (menos de ' + MIN_CARTAS + ')' : ''}.`;
            const cartas = (i.cartas || []).length ? `<div class="rescadv-sub">Cartas anexadas</div><div class="rescadv-cartas">${i.cartas.map(cartaHtml).join('')}</div>` : '';
            const just = (!i.urgente && i.justificativa && !mesmo(i.justificativa))
                ? `<div class="rescadv-msg aviso" style="color: var(--cor-texto-principal); background: rgba(127,127,127,.08); border-color: var(--cor-borda);"><i class="fa-solid fa-comment-dots"></i><div><b>Justificativa de quem lançou</b><small style="opacity:1;">${esc(i.justificativa)}</small></div></div>` : '';
            const nv = i.nao_verificado ? '<div class="rescadv-msg aviso"><i class="fa-solid fa-triangle-exclamation"></i><div>As advertências não puderam ser conferidas automaticamente no lançamento.</div></div>' : '';
            return `<div class="rescadv" style="margin-bottom:14px;">
                <div class="rescadv-topo" style="margin-bottom:10px;"><div class="rescadv-ico"><i class="fa-solid fa-gavel"></i></div><div class="rescadv-tit"><b>Cartas de advertência</b><span>${resumo}</span></div>${pill}</div>
                ${urg}${cartas}${just}${nv}</div>`;
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
