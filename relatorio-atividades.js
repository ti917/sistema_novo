// =========================================================================
// 📝 RELATÓRIO DE ATIVIDADES (lado do Gestor)
// Editor tipo Word em folha A4 (vertical) com a folha timbrada da Soul:
//  • cabeçalho (logo + nome), marca d'água e rodapé (razão social, CNPJ, endereço) em TODAS as páginas;
//  • o texto passa sozinho para a próxima página quando enche;
//  • imagens flutuantes: dá pra arrastar pra qualquer lugar/página, redimensionar, quantas quiser;
//  • "Baixar PDF" gera o PDF (A4) e guarda uma cópia no relatório; "Enviar ao financeiro" libera pra aba do financeiro.
// Tabela: relatorios_atividades (ver sql_extra/relatorios_atividades.sql).
// =========================================================================
(function () {
    'use strict';

    const LOGO = 'data:image/png;base64,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';
    const MARCA = 'data:image/png;base64,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';

    // Geometria da folha (px a 96dpi): A4 = 794 x 1123
    const PG = { W: 794, H: 1123, GAP: 28, TOP: 150, BOTTOM: 132, LEFT: 113, RIGHT: 113 };
    PG.P = PG.H + PG.GAP;                   // distância de uma página até a próxima
    PG.CH = PG.H - PG.TOP - PG.BOTTOM;      // altura útil do texto em cada página
    PG.CW = PG.W - PG.LEFT - PG.RIGHT;      // largura útil do texto

    const S = {
        lista: [], atual: null, dirty: false, zoom: 'auto', escala: 1,
        timerPag: null, timerAuto: null, imgSel: null, tabelaOk: true, salvando: false, somenteLeitura: false
    };
    const $ = (id) => document.getElementById(id);
    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const alerta = (m, t, ti) => { if (typeof window.mostrarAlerta === 'function') window.mostrarAlerta(m, t || 'sucesso', ti); else console.log(m); };
    const nomeGestor = () => (window.usuarioAtual && window.usuarioAtual.nome) || (typeof usuarioAtual !== 'undefined' && usuarioAtual && usuarioAtual.nome) || 'Gestor';
    const idGestor = () => (typeof usuarioAtual !== 'undefined' && usuarioAtual) ? usuarioAtual.id : null;
    const novoId = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const pastaGestor = () => 'Relatorios_Atividades/' + (typeof window.formatarNomePasta === 'function' ? window.formatarNomePasta(nomeGestor()) : nomeGestor().replace(/[^a-zA-Z0-9]/g, '_'));

    // ---------------------------------------------------------------- CSS
    function injetarCss() {
        if ($('ra-css')) return;
        const st = document.createElement('style'); st.id = 'ra-css';
        st.textContent = `
        .ra-wrap { display:flex; flex-direction:column; gap:14px; }
        .ra-topo { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
        .ra-topo h3 { margin:0; color:#4fc3f7; }
        .ra-tabela { width:100%; border-collapse:collapse; }
        .ra-tabela th { text-align:left; font-size:.72rem; text-transform:uppercase; letter-spacing:.06em; color:var(--cor-texto-secundario); padding:10px 12px; border-bottom:1px solid var(--cor-borda); }
        .ra-tabela td { padding:12px; border-bottom:1px solid var(--cor-borda); font-size:.88rem; vertical-align:middle; }
        .ra-badge { display:inline-block; padding:3px 9px; border-radius:20px; font-size:.7rem; font-weight:800; letter-spacing:.04em; }
        .ra-badge.rasc { background:rgba(241,196,15,.15); color:#f1c40f; border:1px solid rgba(241,196,15,.4); }
        .ra-badge.env { background:rgba(46,204,113,.15); color:#2ecc71; border:1px solid rgba(46,204,113,.4); }
        .ra-btn { border:1px solid var(--cor-borda); background:transparent; color:var(--cor-texto-principal); border-radius:8px; padding:7px 11px; cursor:pointer; font-size:.8rem; display:inline-flex; align-items:center; gap:6px; }
        .ra-btn:hover { border-color:#4fc3f7; color:#4fc3f7; }
        .ra-btn.prim { background:#4fc3f7; color:#04202e; border-color:#4fc3f7; font-weight:800; }
        .ra-btn.ok { background:#2ecc71; color:#04200f; border-color:#2ecc71; font-weight:800; }
        .ra-btn.perigo { color:#e74c3c; border-color:rgba(231,76,60,.5); }
        .ra-btn:disabled { opacity:.5; cursor:not-allowed; }
        .ra-meta { display:grid; grid-template-columns: 2fr 1fr 1fr; gap:10px; }
        .ra-meta label { font-size:.72rem; color:var(--cor-texto-secundario); display:block; margin-bottom:4px; }
        .ra-barra { display:flex; flex-wrap:wrap; gap:6px; align-items:center; padding:8px 10px; border:1px solid var(--cor-borda); border-radius:10px; background:rgba(255,255,255,.03); position:sticky; top:0; z-index:30; backdrop-filter: blur(6px); }
        [data-theme="light"] .ra-barra { background:#fff; }
        .ra-barra .sep { width:1px; height:22px; background:var(--cor-borda); margin:0 4px; }
        .ra-barra button, .ra-barra select { border:1px solid var(--cor-borda); background:transparent; color:var(--cor-texto-principal); border-radius:7px; padding:6px 9px; cursor:pointer; font-size:.82rem; min-width:32px; }
        .ra-barra select { background:var(--cor-fundo-cartao, transparent); }
        .ra-barra button:hover { border-color:#4fc3f7; color:#4fc3f7; }
        .ra-barra input[type=color] { width:30px; height:30px; padding:0; border:1px solid var(--cor-borda); border-radius:7px; background:none; cursor:pointer; }
        .ra-cena { overflow:auto; background:rgba(0,0,0,.18); border:1px solid var(--cor-borda); border-radius:12px; padding:18px 10px 30px; max-height:calc(100vh - 230px); }
        [data-theme="light"] .ra-cena { background:#e5e9f0; }
        .ra-escala { margin:0 auto; position:relative; }
        .ra-stage { position:relative; width:${PG.W}px; transform-origin:top left; }
        .ra-pagina { position:absolute; left:0; width:${PG.W}px; height:${PG.H}px; background:#fff; box-shadow:0 6px 24px rgba(0,0,0,.35); overflow:hidden; }
        .ra-marca { position:absolute; left:${(PG.W - 240) / 2}px; top:${Math.round(PG.H / 2 - 135)}px; width:240px; opacity:.13; pointer-events:none; }
        .ra-hdr-logo { position:absolute; left:${PG.LEFT}px; top:26px; width:95px; height:95px; }
        .ra-hdr-nome { position:absolute; left:${PG.LEFT + 95 + 14}px; top:48px; font-family:Impact,'Anton','Arial Narrow',sans-serif; font-size:37px; line-height:1.15; color:#000; white-space:nowrap; letter-spacing:.2px; }
        .ra-rodape { position:absolute; left:0; right:0; bottom:44px; text-align:center; font-family:'Times New Roman',Times,serif; color:#000; line-height:1.25; }
        .ra-rodape .a { font-weight:700; font-size:14.6px; } .ra-rodape .b { font-size:14.6px; margin-bottom:10px; } .ra-rodape .c { font-size:12px; }
        .ra-numero { position:absolute; right:${PG.RIGHT}px; bottom:14px; font:11px Arial,sans-serif; color:#8a8f98; }
        .ra-ed { position:absolute; left:${PG.LEFT}px; top:${PG.TOP}px; width:${PG.CW}px; min-height:${PG.CH}px; outline:none; color:#111; background:transparent;
                 font-family:Calibri,Carlito,Arial,Helvetica,sans-serif; font-size:15px; line-height:1.55; z-index:5; word-wrap:break-word; overflow-wrap:anywhere; }
        .ra-ed p, .ra-ed h1, .ra-ed h2, .ra-ed h3, .ra-ed ul, .ra-ed ol, .ra-ed li { margin:0; }
        .ra-ed p { margin:0 0 6px; } .ra-ed h1 { font-size:24px; margin:6px 0 8px; line-height:1.25; } .ra-ed h2 { font-size:19px; margin:6px 0 6px; line-height:1.3; } .ra-ed h3 { font-size:16px; margin:4px 0 4px; line-height:1.3; }
        .ra-ed ul, .ra-ed ol { padding-left:26px; margin:0 0 6px; }
        .ra-pgbreak { display:block; margin:0; height:16px; line-height:16px; text-align:center; font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:#9aa3b2; border-top:1px dashed #b6bdc9; user-select:none; }
        .ra-imgs { position:absolute; left:0; top:0; width:${PG.W}px; height:100%; pointer-events:none; z-index:10; }
        .ra-img { position:absolute; pointer-events:auto; cursor:move; touch-action:none; box-sizing:border-box; }
        .ra-img img { width:100%; height:100%; display:block; user-select:none; -webkit-user-drag:none; object-fit:fill; pointer-events:none; }
        .ra-img.sel { outline:2px solid #4fc3f7; }
        .ra-img .alca { display:none; position:absolute; right:-7px; bottom:-7px; width:15px; height:15px; background:#4fc3f7; border:2px solid #fff; border-radius:50%; cursor:nwse-resize; }
        .ra-img .del { display:none; position:absolute; right:-10px; top:-12px; width:24px; height:24px; background:#e74c3c; color:#fff; border:2px solid #fff; border-radius:50%; cursor:pointer; font:700 13px/20px Arial; text-align:center; padding:0; }
        .ra-img.sel .alca, .ra-img.sel .del { display:block; }
        .ra-aviso { padding:10px 14px; border-radius:10px; font-size:.82rem; }
        .ra-aviso.amarelo { background:rgba(241,196,15,.1); border:1px solid rgba(241,196,15,.4); color:#f1c40f; }
        .ra-dica { font-size:.75rem; color:var(--cor-texto-secundario); }
        @media (max-width:760px){ .ra-meta{ grid-template-columns:1fr; } }
        @media print { .ra-barra { display:none; } }
        `;
        document.head.appendChild(st);
    }

    // ---------------------------------------------------------------- Banco
    function erroTabela(e) {
        const m = String((e && (e.message || e.details)) || e || '');
        return /relatorios_atividades/i.test(m) && /(does not exist|schema cache|não existe|could not find)/i.test(m);
    }
    function avisoTabela() {
        return '<div class="ra-aviso amarelo"><b>Falta criar a tabela no banco.</b> Rode o arquivo <code>sql_extra/relatorios_atividades.sql</code> no Supabase (SQL Editor) e recarregue esta tela.</div>';
    }

    async function carregarLista() {
        const raiz = $('ra-raiz');
        raiz.innerHTML = '<div class="glass-card"><i class="fa-solid fa-spinner fa-spin"></i> Carregando seus relatórios...</div>';
        const { data, error } = await supabaseClient.from('relatorios_atividades')
            .select('id,titulo,mes_referencia,unidade,status,pdf_url,enviado_em,atualizado_em,criado_em')
            .eq('gestor_id', idGestor()).order('atualizado_em', { ascending: false }).limit(500);
        if (error) {
            raiz.innerHTML = '<div class="glass-card">' + (erroTabela(error) ? avisoTabela() : '<div class="ra-aviso amarelo">Erro ao carregar: ' + esc(error.message) + '</div>') + '</div>';
            return;
        }
        S.lista = data || [];
        desenharLista();
    }

    const fmtData = (iso) => { if (!iso) return '-'; const d = new Date(iso); return isNaN(d) ? '-' : d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
    const fmtMes = (m) => { if (!m) return '-'; const p = String(m).split('-'); return p.length === 2 ? p[1] + '/' + p[0] : m; };

    function desenharLista() {
        const raiz = $('ra-raiz');
        const linhas = S.lista.map((r) => `
            <tr>
                <td><b>${esc(r.titulo || 'Sem título')}</b><div class="ra-dica">${esc(r.unidade || '')}</div></td>
                <td>${esc(fmtMes(r.mes_referencia))}</td>
                <td><span class="ra-badge ${r.status === 'enviado' ? 'env' : 'rasc'}">${r.status === 'enviado' ? 'ENVIADO' : 'RASCUNHO'}</span>${r.enviado_em ? '<div class="ra-dica">' + fmtData(r.enviado_em) + '</div>' : ''}</td>
                <td>${fmtData(r.atualizado_em)}</td>
                <td style="white-space:nowrap; display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="ra-btn" onclick="RelAtv.abrir('${r.id}')"><i class="fa-solid ${r.status === 'enviado' ? 'fa-eye' : 'fa-pen'}"></i> ${r.status === 'enviado' ? 'Ver' : 'Editar'}</button>
                    ${r.pdf_url ? `<a class="ra-btn" href="${esc(r.pdf_url)}" target="_blank" rel="noopener"><i class="fa-solid fa-file-pdf"></i> PDF</a>` : ''}
                    <button class="ra-btn" onclick="RelAtv.duplicar('${r.id}')" title="Cria uma cópia editável"><i class="fa-regular fa-copy"></i></button>
                    ${r.status !== 'enviado' ? `<button class="ra-btn perigo" onclick="RelAtv.excluir('${r.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>` : ''}
                </td>
            </tr>`).join('');
        raiz.innerHTML = `
            <div class="ra-wrap">
                <div class="ra-topo">
                    <h3><i class="fa-solid fa-file-lines"></i> Relatório de Atividades</h3>
                    <button class="ra-btn prim" onclick="RelAtv.novo()"><i class="fa-solid fa-plus"></i> Novo relatório</button>
                </div>
                <div class="ra-dica">Escreva como no Word, com a folha timbrada da Soul. Pode criar quantos relatórios precisar. Quando terminar, baixe o PDF e envie ao financeiro.</div>
                <div class="glass-card" style="padding:0; overflow-x:auto;">
                    ${S.lista.length ? `<table class="ra-tabela"><thead><tr><th>Relatório</th><th>Mês ref.</th><th>Status</th><th>Atualizado</th><th>Ações</th></tr></thead><tbody>${linhas}</tbody></table>`
                        : '<div style="padding:30px; text-align:center; color:var(--cor-texto-secundario);"><i class="fa-regular fa-file-lines" style="font-size:2rem; opacity:.5;"></i><p>Você ainda não criou nenhum relatório.</p></div>'}
                </div>
            </div>`;
    }

    // ---------------------------------------------------------------- Modelo inicial
    function modeloInicial(mes, unidade) {
        const hoje = new Date();
        const mesNome = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return '<h1 style="text-align:center">RELATÓRIO DE ATIVIDADES</h1>'
            + '<p style="text-align:center"><b>Período:</b> ' + esc(mesNome) + '</p>'
            + '<p><b>Gestor:</b> ' + esc(nomeGestor()) + '</p>'
            + (unidade ? '<p><b>Unidade:</b> ' + esc(unidade) + '</p>' : '')
            + '<p><br></p><h2>1. Atividades realizadas</h2><p><br></p>'
            + '<h2>2. Ocorrências e pontos de atenção</h2><p><br></p>'
            + '<h2>3. Observações</h2><p><br></p>';
    }

    // ---------------------------------------------------------------- Editor
    function mesAtualIso() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

    async function novo() {
        const unidade = (typeof usuarioAtual !== 'undefined' && usuarioAtual && usuarioAtual.unidade) ? [].concat(usuarioAtual.unidade).join(', ') : '';
        S.atual = { id: null, titulo: 'Relatório de Atividades', mes_referencia: mesAtualIso(), unidade, conteudo_html: modeloInicial(mesAtualIso(), unidade), imagens: [], status: 'rascunho', pdf_url: null };
        S.somenteLeitura = false;
        desenharEditor();
    }

    async function abrir(id) {
        const raiz = $('ra-raiz');
        raiz.innerHTML = '<div class="glass-card"><i class="fa-solid fa-spinner fa-spin"></i> Abrindo...</div>';
        const { data, error } = await supabaseClient.from('relatorios_atividades').select('*').eq('id', id).single();
        if (error || !data) { alerta('Não foi possível abrir: ' + ((error && error.message) || 'não encontrado'), 'erro'); return carregarLista(); }
        S.atual = data;
        if (!Array.isArray(S.atual.imagens)) S.atual.imagens = [];
        S.somenteLeitura = data.status === 'enviado';
        desenharEditor();
    }

    async function duplicar(id) {
        const { data, error } = await supabaseClient.from('relatorios_atividades').select('*').eq('id', id).single();
        if (error || !data) return alerta('Não foi possível duplicar.', 'erro');
        S.atual = { id: null, titulo: (data.titulo || 'Relatório') + ' (cópia)', mes_referencia: data.mes_referencia, unidade: data.unidade, conteudo_html: data.conteudo_html, imagens: (data.imagens || []).map((i) => ({ ...i, id: novoId() })), status: 'rascunho', pdf_url: null };
        S.somenteLeitura = false;
        desenharEditor();
        S.dirty = true;
    }

    async function excluir(id) {
        const ok = typeof window.mostrarConfirmacao === 'function' ? await window.mostrarConfirmacao('Excluir este rascunho? Não dá para desfazer.') : confirm('Excluir este rascunho?');
        if (!ok) return;
        const { error } = await supabaseClient.from('relatorios_atividades').delete().eq('id', id).eq('gestor_id', idGestor()).neq('status', 'enviado');
        if (error) return alerta('Erro ao excluir: ' + error.message, 'erro');
        alerta('Rascunho excluído.', 'sucesso');
        carregarLista();
    }

    function barraHtml() {
        const b = (cmd, ic, tit) => `<button type="button" title="${tit}" onmousedown="event.preventDefault()" onclick="RelAtv.cmd('${cmd}')"><i class="fa-solid ${ic}"></i></button>`;
        return `
        <div class="ra-barra" id="ra-barra">
            <select title="Estilo do texto" onchange="RelAtv.bloco(this.value); this.value='p'">
                <option value="p">Parágrafo</option><option value="h1">Título 1</option><option value="h2">Título 2</option><option value="h3">Título 3</option>
            </select>
            <select title="Tamanho da letra" onchange="RelAtv.tamanho(this.value); this.value=''">
                <option value="">Tamanho</option>${[11, 12, 13, 14, 15, 16, 18, 20, 24, 28].map((n) => `<option value="${n}">${n}</option>`).join('')}
            </select>
            <span class="sep"></span>
            ${b('bold', 'fa-bold', 'Negrito')}${b('italic', 'fa-italic', 'Itálico')}${b('underline', 'fa-underline', 'Sublinhado')}${b('strikeThrough', 'fa-strikethrough', 'Riscado')}
            <input type="color" value="#111111" title="Cor do texto" onchange="RelAtv.cor(this.value)">
            <span class="sep"></span>
            ${b('justifyLeft', 'fa-align-left', 'Alinhar à esquerda')}${b('justifyCenter', 'fa-align-center', 'Centralizar')}${b('justifyRight', 'fa-align-right', 'Alinhar à direita')}${b('justifyFull', 'fa-align-justify', 'Justificar')}
            <span class="sep"></span>
            ${b('insertUnorderedList', 'fa-list-ul', 'Lista com marcadores')}${b('insertOrderedList', 'fa-list-ol', 'Lista numerada')}
            <span class="sep"></span>
            ${b('undo', 'fa-rotate-left', 'Desfazer')}${b('redo', 'fa-rotate-right', 'Refazer')}
            <span class="sep"></span>
            <button type="button" title="Quebra de página" onmousedown="event.preventDefault()" onclick="RelAtv.quebra()"><i class="fa-solid fa-file-circle-plus"></i> Nova página</button>
            <button type="button" title="Excluir a página onde está o cursor" onmousedown="event.preventDefault()" onclick="RelAtv.excluirPagina()"><i class="fa-solid fa-file-circle-minus"></i> Excluir página</button>
            <button type="button" title="Inserir imagem (pode arrastar depois)" onclick="document.getElementById('ra-file').click()" id="ra-btn-img"><i class="fa-solid fa-image"></i> Imagem</button>
            <input type="file" id="ra-file" accept="image/*" multiple style="display:none" onchange="RelAtv.imagens(this.files); this.value=''">
            <span class="sep"></span>
            <select title="Zoom" onchange="RelAtv.zoom(this.value)" id="ra-zoom"><option value="auto">Ajustar à tela</option><option value="1">100%</option><option value="0.75">75%</option><option value="0.5">50%</option></select>
        </div>`;
    }

    function desenharEditor() {
        const r = S.atual, ro = S.somenteLeitura;
        $('ra-raiz').innerHTML = `
        <div class="ra-wrap">
            <div class="ra-topo">
                <h3><i class="fa-solid fa-file-lines"></i> ${ro ? 'Relatório enviado' : (r.id ? 'Editar relatório' : 'Novo relatório')}</h3>
                <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                    <span class="ra-dica" id="ra-status-salvo"></span>
                    <button class="ra-btn" onclick="RelAtv.voltar()"><i class="fa-solid fa-arrow-left"></i> Meus relatórios</button>
                    ${ro ? '' : '<button class="ra-btn" onclick="RelAtv.salvar(true)"><i class="fa-solid fa-floppy-disk"></i> Salvar rascunho</button>'}
                    <button class="ra-btn prim" onclick="RelAtv.baixar()" id="ra-btn-pdf"><i class="fa-solid fa-file-pdf"></i> Baixar PDF</button>
                    ${ro ? '' : '<button class="ra-btn ok" onclick="RelAtv.enviar()" id="ra-btn-env"><i class="fa-solid fa-paper-plane"></i> Enviar ao financeiro</button>'}
                </div>
            </div>
            <div class="ra-meta">
                <div><label>Título do relatório</label><input class="modern-input" id="ra-titulo" value="${esc(r.titulo)}" ${ro ? 'disabled' : ''} oninput="RelAtv.sujo()"></div>
                <div><label>Mês de referência</label><input class="modern-input" type="month" id="ra-mes" value="${esc(r.mes_referencia || '')}" ${ro ? 'disabled' : ''} oninput="RelAtv.sujo()"></div>
                <div><label>Unidade</label><input class="modern-input" id="ra-unidade" value="${esc(r.unidade || '')}" ${ro ? 'disabled' : ''} oninput="RelAtv.sujo()"></div>
            </div>
            ${ro ? '<div class="ra-aviso amarelo">Este relatório já foi enviado ao financeiro e não pode mais ser editado. Use o botão de copiar na lista para criar uma nova versão.</div>' : ''}
            ${ro ? '' : barraHtml()}
            <div class="ra-cena" id="ra-cena"><div class="ra-escala" id="ra-escala"><div class="ra-stage" id="ra-stage">
                <div id="ra-paginas"></div>
                <div class="ra-ed" id="ra-ed" ${ro ? '' : 'contenteditable="true"'} spellcheck="true"></div>
                <div class="ra-imgs" id="ra-imgs"></div>
            </div></div></div>
            ${ro ? '' : '<div class="ra-dica">Dica: as imagens ficam por cima do texto. Clique numa imagem para arrastar, puxar a bolinha azul para mudar o tamanho ou o X vermelho para remover. Para o texto não ficar por baixo da imagem, deixe linhas em branco onde ela vai ficar.</div>'}
        </div>`;
        const ed = $('ra-ed');
        ed.innerHTML = r.conteudo_html || '<p><br></p>';
        try { document.execCommand('defaultParagraphSeparator', false, 'p'); document.execCommand('styleWithCSS', false, true); } catch (e) { /* ok */ }
        if (!ro) ligarEditor(ed);
        desenharImagens();
        ajustarEscala();
        paginar();
        S.dirty = false;
        atualizarStatusSalvo();
        clearInterval(S.timerAuto);
        if (!ro) S.timerAuto = setInterval(() => { if (S.dirty && !S.salvando && !S.pdfGerando && $('ra-ed')) salvar(false); }, 25000);
    }

    function ligarEditor(ed) {
        ed.addEventListener('input', () => { sujo(); agendarPaginacao(); });
        document.addEventListener('selectionchange', () => { const sl = window.getSelection(); if (sl && sl.rangeCount && ed.contains(sl.getRangeAt(0).startContainer)) S.caretValido = true; });
        ed.addEventListener('paste', (e) => {
            const cd = e.clipboardData; if (!cd) return;
            const arqs = Array.from(cd.files || []).filter((f) => /^image\//.test(f.type));
            if (arqs.length) { e.preventDefault(); imagens(arqs); return; }
            e.preventDefault();
            const html = cd.getData('text/html'), txt = cd.getData('text/plain');
            document.execCommand('insertHTML', false, html ? limparHtml(html) : esc(txt).replace(/\n/g, '<br>'));
        });
        ed.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '    '); }
        });
    }

    // sanitiza HTML colado (Word/Web): só estrutura básica
    function limparHtml(html) {
        const d = document.createElement('div'); d.innerHTML = html;
        d.querySelectorAll('script,style,meta,link,xml,o\\:p,img,iframe,object').forEach((n) => n.remove());
        const ok = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'DIV', 'SPAN']);
        const walk = (n) => {
            Array.from(n.childNodes).forEach((c) => {
                if (c.nodeType === 1) {
                    walk(c);
                    if (!ok.has(c.tagName)) { while (c.firstChild) c.parentNode.insertBefore(c.firstChild, c); c.remove(); return; }
                    Array.from(c.attributes).forEach((a) => c.removeAttribute(a.name));
                    if (/^H[34]$/.test(c.tagName)) { const h = document.createElement('h3'); h.innerHTML = c.innerHTML; c.replaceWith(h); }
                    if (c.tagName === 'SPAN' && !c.getAttribute('style')) { while (c.firstChild) c.parentNode.insertBefore(c.firstChild, c); c.remove(); }
                } else if (c.nodeType === 8) c.remove();
            });
        };
        walk(d);
        return d.innerHTML;
    }

    function sujo() { if (S.somenteLeitura) return; S.dirty = true; atualizarStatusSalvo(); }
    function atualizarStatusSalvo() { const el = $('ra-status-salvo'); if (el) el.textContent = S.somenteLeitura ? '' : (S.dirty ? 'Alterações não salvas…' : (S.atual && S.atual.id ? 'Tudo salvo' : '')); }

    // ---------------------------------------------------------------- Comandos de formatação
    function cmd(c) { const ed = $('ra-ed'); if (!ed) return; ed.focus(); document.execCommand(c, false, null); sujo(); agendarPaginacao(); }
    function bloco(tag) { const ed = $('ra-ed'); if (!ed) return; ed.focus(); document.execCommand('formatBlock', false, tag); sujo(); agendarPaginacao(); }
    function cor(v) { const ed = $('ra-ed'); if (!ed) return; ed.focus(); document.execCommand('foreColor', false, v); sujo(); }
    function tamanho(px) {
        if (!px) return; const ed = $('ra-ed'); ed.focus();
        document.execCommand('fontSize', false, '7');
        ed.querySelectorAll('font[size="7"]').forEach((f) => { const s = document.createElement('span'); s.style.fontSize = px + 'px'; while (f.firstChild) s.appendChild(f.firstChild); f.replaceWith(s); });
        ed.querySelectorAll('span[style*="font-size: xxx-large"],span[style*="font-size:xxx-large"]').forEach((s) => { s.style.fontSize = px + 'px'; });
        sujo(); agendarPaginacao();
    }
    function quebra() {
        const ed = $('ra-ed'); if (!ed) return; ed.focus();
        const sel = window.getSelection();
        const dentro = sel && sel.rangeCount && ed.contains(sel.getRangeAt(0).startContainer) && sel.getRangeAt(0).startContainer !== ed.parentNode;
        if (!dentro || !S.caretValido) {
            // sem cursor no texto: a nova página entra no FIM do documento (como no Word)
            const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); sel.removeAllRanges(); sel.addRange(r);
        }
        document.execCommand('insertHTML', false, '<div class="ra-pgbreak" contenteditable="false">quebra de página</div><p><br></p>');
        sujo(); agendarPaginacao();
        setTimeout(() => { const u = ed.lastElementChild; if (u) u.scrollIntoView({ block: 'nearest' }); }, 150);
    }

    // ---------------------------------------------------------------- Excluir página
    async function excluirPagina() {
        const ed = $('ra-ed'); if (!ed || S.somenteLeitura) return;
        paginar();
        const base = ed.getBoundingClientRect().top, P = PG.P;
        const pgDe = (y) => Math.floor((y + 0.5) / P);
        // página do cursor (se não houver cursor no texto, a última)
        let n = S.paginas - 1;
        const sl = window.getSelection();
        if (sl && sl.rangeCount && ed.contains(sl.getRangeAt(0).startContainer)) {
            const rg = sl.getRangeAt(0).cloneRange(); rg.collapse(true);
            let rc = rg.getClientRects()[0];
            if (!rc) { let el = rg.startContainer; el = el.nodeType === 1 ? el : el.parentElement; rc = el && el !== ed ? el.getBoundingClientRect() : null; }
            if (rc) n = Math.min(S.paginas - 1, Math.max(0, pgDe((rc.top - base) / S.escala + 2)));
        }
        const txt = 'Excluir a página ' + (n + 1) + ' (texto e imagens dela)? Não dá para desfazer.';
        const ok = typeof window.mostrarConfirmacao === 'function' ? await window.mostrarConfirmacao(txt, 'Excluir página') : confirm(txt);
        if (!ok) return;
        const topo = (el) => (el.getBoundingClientRect().top - base) / S.escala;
        const blocos = [];
        Array.from(ed.children).forEach((c) => { if (c.tagName === 'UL' || c.tagName === 'OL') Array.from(c.children).forEach((li) => blocos.push(li)); else blocos.push(c); });
        blocos.forEach((b) => {
            const t = topo(b), h = b.getBoundingClientRect().height / S.escala;
            const p0 = pgDe(t + parseFloat(b.style.paddingTop || 0)), p1 = pgDe(t + h - 1);
            const sps = Array.from(b.querySelectorAll('.ra-sp')).map((sp) => ({ sp, pg: pgDe(topo(sp) + sp.getBoundingClientRect().height / S.escala + 1) }));
            if (p1 < n || p0 > n) return;
            if (p0 === n && p1 === n) { b.remove(); return; }
            // bloco que atravessa páginas: apaga só o pedaço que cai na página n
            const rg = document.createRange();
            const ini = sps.find((x) => x.pg === n), fim = sps.find((x) => x.pg === n + 1);
            if (p0 === n) rg.setStartBefore(b.firstChild || b); else if (ini) rg.setStartAfter(ini.sp); else return;
            if (fim) rg.setEndBefore(fim.sp); else rg.setEndAfter(b.lastChild || b);
            rg.deleteContents();
            if (!(b.textContent || '').trim() && !b.querySelector('br,img')) b.remove();
        });
        ed.querySelectorAll('.ra-sp').forEach((x) => x.remove());
        ed.querySelectorAll('ul:empty,ol:empty').forEach((x) => x.remove());
        if (!ed.children.length) ed.innerHTML = '<p><br></p>';
        S.atual.imagens = (S.atual.imagens || []).filter((i) => i.page !== n).map((i) => (i.page > n ? { ...i, page: i.page - 1 } : i));
        desenharImagens(); sujo(); paginar();
    }

    // ---------------------------------------------------------------- Paginação
    function agendarPaginacao() { clearTimeout(S.timerPag); S.timerPag = setTimeout(paginar, 90); }
    function topoRel(el, base) { return (el.getBoundingClientRect().top - base) / S.escala; }

    // cursor <-> deslocamento de texto (para não perder o cursor quando os espaçadores são refeitos)
    function salvarCursor(ed) {
        const sl = window.getSelection(); if (!sl || !sl.rangeCount) return null;
        const r = sl.getRangeAt(0); if (!ed.contains(r.startContainer) || !ed.contains(r.endContainer)) return null;
        const med = (n, o) => { const x = document.createRange(); x.selectNodeContents(ed); x.setEnd(n, o); return x.toString().length; };
        return { a: med(r.startContainer, r.startOffset), b: med(r.endContainer, r.endOffset) };
    }
    function restaurarCursor(ed, c) {
        if (!c) return;
        const achar = (alvo) => {
            const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.parentElement && n.parentElement.closest('.ra-sp') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
            let acc = 0, n, ult = null;
            while ((n = w.nextNode())) { const l = n.nodeValue.length; if (acc + l >= alvo) return [n, alvo - acc]; acc += l; ult = n; }
            return ult ? [ult, ult.nodeValue.length] : [ed, ed.childNodes.length];
        };
        try { const [n1, o1] = achar(c.a), [n2, o2] = achar(c.b); const r = document.createRange(); r.setStart(n1, o1); r.setEnd(n2, o2); const sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(r); } catch (e) { /* ok */ }
    }

    // primeira linha de texto do bloco cujo fundo passa de "limite" (px relativos ao editor); devolve {no, pos, topo} ou null
    function primeiraLinhaQueNaoCabe(bloco, base, limite, proxima) {
        const w = document.createTreeWalker(bloco, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.parentElement && n.parentElement.closest('.ra-sp') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
        const r = document.createRange(); let n;
        while ((n = w.nextNode())) {
            const len = n.nodeValue.length; if (!len) continue;
            r.setStart(n, len - 1); r.setEnd(n, len);
            const rs = r.getClientRects(); const ult = rs.length ? rs[rs.length - 1] : null;
            if (ult && (ult.bottom - base) / S.escala <= limite + 0.5) continue;      // esse trecho cabe inteiro
            for (let i = 0; i < len; i++) {
                r.setStart(n, i); r.setEnd(n, i + 1);
                const q = r.getClientRects(); if (!q.length) continue;
                const k = q[0]; if (k.height < 1) continue;
                if ((k.bottom - base) / S.escala > limite + 0.5 && (k.top - base) / S.escala < proxima - 3) return { no: n, pos: i, topo: (k.top - base) / S.escala };
            }
        }
        return null;
    }

    function paginar() {
        const ed = $('ra-ed'); if (!ed) return;
        const cursor = (document.activeElement === ed) ? salvarCursor(ed) : null;
        ed.querySelectorAll('.ra-sp').forEach((x) => x.remove());
        ed.normalize();
        ed.querySelectorAll('[data-ra]').forEach((b) => { b.style.paddingTop = ''; b.removeAttribute('data-ra'); if (!b.getAttribute('style')) b.removeAttribute('style'); });
        const base = ed.getBoundingClientRect().top;
        const blocos = [];
        Array.from(ed.children).forEach((c) => {
            if (c.tagName === 'UL' || c.tagName === 'OL') Array.from(c.children).forEach((li) => blocos.push(li)); else blocos.push(c);
        });
        let forcarPag = null, ultimoFim = 0;
        for (const b of blocos) {
            let top = topoRel(b, base);
            const cs = getComputedStyle(b), mb = parseFloat(cs.marginBottom) || 0;
            let h = b.getBoundingClientRect().height / S.escala;
            let pg = Math.floor((top + 0.5) / PG.P);
            let alvo = null;
            const ehTexto = !b.classList.contains('ra-pgbreak') && !/^H[1-6]$/.test(b.tagName) && (b.textContent || '').trim().length > 0;
            if (top > pg * PG.P + PG.CH - 1) alvo = (pg + 1) * PG.P;                           // começou na faixa de rodapé/cabeçalho
            else if (top + h > pg * PG.P + PG.CH + 0.5 && !ehTexto && h < PG.CH) alvo = (pg + 1) * PG.P;   // título/bloco sem texto que não cabe: vai pra próxima
            if (forcarPag !== null && (alvo === null ? top : alvo) < forcarPag * PG.P) alvo = forcarPag * PG.P;
            if (alvo !== null && alvo > top + 0.5) { b.style.paddingTop = Math.round(alvo - top) + 'px'; b.setAttribute('data-ra', '1'); top = alvo; pg = Math.round(alvo / PG.P); h = b.getBoundingClientRect().height / S.escala; }
            forcarPag = null;
            // parágrafo que atravessa o fim da página: o texto continua na página seguinte, linha a linha (como no Word)
            if (ehTexto) {
                for (let guarda = 0; guarda < 40; guarda++) {
                    top = topoRel(b, base); h = b.getBoundingClientRect().height / S.escala;
                    const k = Math.floor((top + 0.5) / PG.P);
                    let kk = k, limite = kk * PG.P + PG.CH, achou = null;
                    // procura a primeira página (a partir da do início do bloco) cujo limite o bloco ultrapassa
                    while (top + h > limite + 0.5 && !(achou = primeiraLinhaQueNaoCabe(b, base, limite, (kk + 1) * PG.P))) { kk++; limite = kk * PG.P + PG.CH; if (kk > k + 60) break; }
                    if (!achou) break;
                    if (kk === k && achou.topo <= top + 2) {                                    // nem a primeira linha cabe: bloco inteiro vai pra próxima
                        b.style.paddingTop = Math.round((k + 1) * PG.P - top) + 'px'; b.setAttribute('data-ra', '1'); continue;
                    }
                    const sp = document.createElement('span'); sp.className = 'ra-sp'; sp.setAttribute('contenteditable', 'false');
                    sp.style.cssText = 'display:block;height:' + Math.max(1, Math.round((kk + 1) * PG.P - achou.topo)) + 'px;margin:0;padding:0;';
                    const rg = document.createRange(); rg.setStart(achou.no, achou.pos); rg.collapse(true); rg.insertNode(sp);
                }
                top = topoRel(b, base); h = b.getBoundingClientRect().height / S.escala;
            }
            if (b.classList.contains('ra-pgbreak')) forcarPag = Math.floor((top + 0.5) / PG.P) + 1;
            ultimoFim = Math.max(ultimoFim, top + h + mb);
        }
        let paginas = Math.max(1, Math.floor(Math.max(ultimoFim - 1, 0) / PG.P) + 1);
        (S.atual.imagens || []).forEach((i) => { paginas = Math.max(paginas, (i.page || 0) + 1); });
        S.paginas = paginas;
        montarPaginas(paginas);
        posicionarImagens();
        restaurarCursor(ed, cursor);
    }

    function headerFooterHtml(n, total) {
        return `<img class="ra-marca" src="${MARCA}" alt="">
            <img class="ra-hdr-logo" src="${LOGO}" alt="">
            <div class="ra-hdr-nome">SOUL SEGURANÇA E FACILITIES</div>
            <div class="ra-rodape"><div class="a">SOUL SEGURANÇA E FACILITES LTDA</div><div class="b">CNPJ: 48.052.632/0001-25</div>
                <div class="c">Rua Antônio Lealdini, 162 – Jardim Maria Mendes, MOGI GUAÇU/SP, CEP:13.845-332</div><div class="c">E-mail: rh@gruposoulbr.com</div></div>
            <div class="ra-numero">${n + 1} / ${total}</div>`;
    }

    // o nome da empresa (Impact) precisa caber numa linha: se a fonte cair em outra mais larga, reduz o tamanho
    function ajustarNome(raiz) {
        const disp = PG.W - (PG.LEFT + 95 + 14) - PG.RIGHT + 40;
        raiz.querySelectorAll('.ra-hdr-nome').forEach((el) => {
            let f = 37; el.style.fontSize = f + 'px';
            while (el.scrollWidth > disp && f > 18) { f -= 1; el.style.fontSize = f + 'px'; }
        });
    }

    function montarPaginas(total) {
        const cont = $('ra-paginas'), stage = $('ra-stage'); if (!cont) return;
        const atuais = cont.children.length;
        if (atuais !== total || cont.dataset.total !== String(total)) {
            cont.innerHTML = '';
            for (let n = 0; n < total; n++) {
                const d = document.createElement('div'); d.className = 'ra-pagina'; d.style.top = (n * PG.P) + 'px';
                d.innerHTML = headerFooterHtml(n, total); cont.appendChild(d);
            }
            cont.dataset.total = String(total);
            ajustarNome(cont);
        }
        const altura = total * PG.P - PG.GAP;
        stage.style.height = altura + 'px';
        $('ra-ed').style.height = (altura - PG.TOP) + 'px';
        $('ra-ed').style.minHeight = '0';
        $('ra-escala').style.height = (altura * S.escala) + 'px';
        $('ra-escala').style.width = (PG.W * S.escala) + 'px';
    }

    function ajustarEscala() {
        const cena = $('ra-cena'); if (!cena) return;
        let z = S.zoom === 'auto' ? Math.min(1, (cena.clientWidth - 24) / PG.W) : parseFloat(S.zoom);
        if (!z || z < 0.3) z = 0.3;
        S.escala = z;
        $('ra-stage').style.transform = 'scale(' + z + ')';
    }
    function zoom(v) { S.zoom = v; ajustarEscala(); paginar(); }

    // ---------------------------------------------------------------- Imagens flutuantes
    function redimensionarArquivo(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file), img = new Image();
            img.onload = () => {
                const M = 1600, e = Math.min(1, M / Math.max(img.naturalWidth, img.naturalHeight));
                const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * e); c.height = Math.round(img.naturalHeight * e);
                const x = c.getContext('2d'); const png = /png|webp|gif/.test(file.type);
                if (!png) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
                x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
                c.toBlob((b) => b ? resolve({ blob: b, w: c.width, h: c.height, png }) : reject(new Error('falha ao processar a imagem')), png ? 'image/png' : 'image/jpeg', 0.88);
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem inválida')); };
            img.src = url;
        });
    }

    async function imagens(arquivos) {
        if (S.somenteLeitura) return;
        const lista = Array.from(arquivos || []).filter((f) => /^image\//.test(f.type));
        for (const f of lista) {
            try {
                const r = await redimensionarArquivo(f);
                const larg = Math.min(PG.CW * 0.6, r.w), alt = larg * r.h / r.w;
                const cena = $('ra-cena'); const visTop = cena ? cena.scrollTop / S.escala : 0;
                const pg = Math.max(0, Math.min((S.paginas || 1) - 1, Math.floor((visTop + 200) / PG.P)));
                const local = URL.createObjectURL(r.blob);
                const reg = { id: novoId(), url: local, page: pg, x: Math.round((PG.W - larg) / 2), y: Math.round(PG.TOP + 40), w: Math.round(larg), h: Math.round(alt), subindo: true };
                S.atual.imagens.push(reg); desenharImagens(); paginar(); sujo();
                const nome = 'imagem.' + (r.png ? 'png' : 'jpg');
                const arq = new File([r.blob], nome, { type: r.png ? 'image/png' : 'image/jpeg' });
                const urls = await subirDocumentos(pastaGestor(), [arq]);
                reg.url_remota = urls[0]; delete reg.subindo; sujo();
            } catch (e) { alerta('Não consegui adicionar a imagem: ' + e.message, 'erro'); }
        }
    }

    function desenharImagens() {
        const c = $('ra-imgs'); if (!c) return;
        c.innerHTML = '';
        (S.atual.imagens || []).forEach((i) => {
            const d = document.createElement('div'); d.className = 'ra-img'; d.dataset.id = i.id;
            const src = i.url_remota || i.url;
            d.innerHTML = `<img src="${esc(src)}" alt="" crossorigin="anonymous">` + (S.somenteLeitura ? '' : '<button class="del" type="button" title="Remover imagem">×</button><span class="alca"></span>');
            c.appendChild(d);
            if (!S.somenteLeitura) ligarImagem(d, i);
        });
        posicionarImagens();
    }
    function posicionarImagens() {
        document.querySelectorAll('#ra-imgs .ra-img').forEach((d) => {
            const i = (S.atual.imagens || []).find((x) => x.id === d.dataset.id); if (!i) return;
            d.style.left = i.x + 'px'; d.style.top = (i.page * PG.P + i.y) + 'px'; d.style.width = i.w + 'px'; d.style.height = i.h + 'px';
        });
    }
    function fecharSelecaoImg(e) {
        if (e.target.closest && (e.target.closest('.ra-img') || e.target.closest('#ra-barra'))) return;
        document.querySelectorAll('.ra-img.sel').forEach((x) => x.classList.remove('sel')); S.imgSel = null;
    }
    function ligarImagem(d, i) {
        d.addEventListener('pointerdown', (e) => {
            if (e.target.classList.contains('del')) return;
            e.preventDefault(); e.stopPropagation();
            document.querySelectorAll('.ra-img.sel').forEach((x) => x.classList.remove('sel')); d.classList.add('sel'); S.imgSel = i.id;
            const redim = e.target.classList.contains('alca');
            const x0 = e.clientX, y0 = e.clientY, ix = i.x, iy = i.page * PG.P + i.y, iw = i.w, ih = i.h, ratio = iw / ih;
            d.setPointerCapture(e.pointerId);
            const mover = (ev) => {
                const dx = (ev.clientX - x0) / S.escala, dy = (ev.clientY - y0) / S.escala;
                if (redim) { i.w = Math.max(30, Math.min(PG.W - i.x, iw + dx)); i.h = i.w / ratio; }
                else {
                    let nx = Math.max(0, Math.min(PG.W - i.w, ix + dx)), ny = iy + dy;
                    const pg = Math.max(0, Math.min(Math.max(S.paginas, 1) - 1, Math.floor((ny + i.h / 2) / PG.P)));
                    i.page = pg; i.x = Math.round(nx); i.y = Math.round(Math.max(0, Math.min(PG.H - i.h, ny - pg * PG.P)));
                }
                posicionarImagens();
            };
            const soltar = () => { d.removeEventListener('pointermove', mover); d.removeEventListener('pointerup', soltar); d.removeEventListener('pointercancel', soltar); sujo(); paginar(); };
            d.addEventListener('pointermove', mover); d.addEventListener('pointerup', soltar); d.addEventListener('pointercancel', soltar);
        });
        const del = d.querySelector('.del');
        if (del) del.addEventListener('click', (e) => { e.stopPropagation(); S.atual.imagens = S.atual.imagens.filter((x) => x.id !== i.id); desenharImagens(); sujo(); paginar(); });
    }

    // ---------------------------------------------------------------- Salvar
    function html() {
        const ed = $('ra-ed'); const c = ed.cloneNode(true);
        c.querySelectorAll('.ra-sp').forEach((x) => x.remove());
        c.querySelectorAll('[data-ra]').forEach((b) => { b.style.paddingTop = ''; b.removeAttribute('data-ra'); if (!b.getAttribute('style')) b.removeAttribute('style'); });
        c.normalize();
        return c.innerHTML;
    }
    function coletar() {
        const r = S.atual;
        r.titulo = ($('ra-titulo').value || '').trim() || 'Relatório de Atividades';
        r.mes_referencia = $('ra-mes').value || null; r.unidade = ($('ra-unidade').value || '').trim() || null;
        r.conteudo_html = html();
        return r;
    }
    function payload(r) {
        return {
            gestor_id: idGestor(), gestor_nome: nomeGestor(), titulo: r.titulo, mes_referencia: r.mes_referencia, unidade: r.unidade, conteudo_html: r.conteudo_html,
            imagens: (r.imagens || []).map((i) => ({ id: i.id, url: i.url_remota || i.url, page: i.page, x: i.x, y: i.y, w: i.w, h: i.h })),
            atualizado_em: new Date().toISOString()
        };
    }

    async function salvar(mostrar) {
        if (S.somenteLeitura || S.salvando) return true;
        if ((S.atual.imagens || []).some((i) => i.subindo)) { if (mostrar) alerta('Aguarde o envio das imagens terminar.', 'aviso'); return false; }
        S.salvando = true;
        try {
            const r = coletar(), p = payload(r);
            if (r.id) {
                const { error } = await supabaseClient.from('relatorios_atividades').update(p).eq('id', r.id).eq('gestor_id', idGestor());
                if (error) throw error;
            } else {
                const { data, error } = await supabaseClient.from('relatorios_atividades').insert({ ...p, status: 'rascunho' }).select('id').single();
                if (error) throw error;
                r.id = data.id;
            }
            S.dirty = false; atualizarStatusSalvo();
            if (mostrar) alerta('Rascunho salvo.', 'sucesso');
            return true;
        } catch (e) {
            if (erroTabela(e)) alerta('Falta criar a tabela no banco (sql_extra/relatorios_atividades.sql).', 'erro');
            else alerta('Erro ao salvar: ' + (e.message || e), 'erro');
            return false;
        } finally { S.salvando = false; }
    }

    // ---------------------------------------------------------------- PDF
    function carregarScript(src) {
        return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('não consegui carregar ' + src)); document.head.appendChild(s); });
    }
    async function garantirLibs() {
        if (!window.html2canvas) await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        if (!window.jspdf || !window.jspdf.jsPDF) await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }

    // renderiza cada página (cabeçalho + texto recortado + imagens + rodapé) e monta o PDF A4
    async function gerarPdfBlob() {
        await garantirLibs();
        paginar();
        const total = S.paginas, { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
        const ed = $('ra-ed'), imgs = S.atual.imagens || [];
        const palco = document.createElement('div'); palco.style.cssText = 'position:fixed; left:-20000px; top:0; width:' + PG.W + 'px; z-index:-1;';
        document.body.appendChild(palco);
        try {
            for (let n = 0; n < total; n++) {
                const pag = document.createElement('div'); pag.className = 'ra-pagina'; pag.style.cssText = 'position:relative; top:0; left:0; box-shadow:none; width:' + PG.W + 'px; height:' + PG.H + 'px;';
                pag.innerHTML = headerFooterHtml(n, total);
                const janela = document.createElement('div'); janela.style.cssText = 'position:absolute; left:' + PG.LEFT + 'px; top:' + PG.TOP + 'px; width:' + PG.CW + 'px; height:' + PG.CH + 'px; overflow:hidden;';
                const copia = ed.cloneNode(true); copia.removeAttribute('contenteditable'); copia.removeAttribute('id');
                copia.style.cssText = 'position:absolute; left:0; top:' + (-n * PG.P) + 'px; width:' + PG.CW + 'px; height:auto;';
                copia.querySelectorAll('.ra-pgbreak').forEach((b) => { b.style.visibility = 'hidden'; });
                janela.appendChild(copia); pag.appendChild(janela);
                imgs.filter((i) => i.page === n).forEach((i) => {
                    const im = document.createElement('img'); im.crossOrigin = 'anonymous'; im.src = i.url_remota || i.url;
                    im.style.cssText = 'position:absolute; left:' + i.x + 'px; top:' + i.y + 'px; width:' + i.w + 'px; height:' + i.h + 'px; z-index:10;';
                    pag.appendChild(im);
                });
                palco.appendChild(pag);
                ajustarNome(pag);
                await Promise.all(Array.from(pag.querySelectorAll('img')).map((im) => im.complete ? 1 : new Promise((r) => { im.onload = im.onerror = r; })));
                const canvas = await window.html2canvas(pag, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
                if (n > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
                palco.removeChild(pag);
            }
        } finally { palco.remove(); }
        return pdf.output('blob');
    }

    function nomeArquivoPdf() {
        const t = (S.atual.titulo || 'Relatorio').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
        return t + (S.atual.mes_referencia ? '_' + S.atual.mes_referencia : '') + '.pdf';
    }
    async function subirPdf(blob) {
        const caminho = pastaGestor() + '/PDF_' + Date.now() + '_' + nomeArquivoPdf();
        const { error } = await supabaseClient.storage.from('documentos').upload(caminho, blob, { contentType: 'application/pdf' });
        if (error) throw new Error('Falha ao guardar o PDF: ' + error.message);
        return supabaseClient.storage.from('documentos').getPublicUrl(caminho).data.publicUrl;
    }
    function baixarBlob(blob, nome) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }

    function ocupado(on, txt) {
        ['ra-btn-pdf', 'ra-btn-env'].forEach((id) => { const b = $(id); if (b) b.disabled = on; });
        const s = $('ra-status-salvo'); if (s && on) s.textContent = txt || 'Gerando...';
    }

    async function baixar() {
        if (S.pdfGerando) return;
        S.pdfGerando = true; ocupado(true, 'Gerando PDF…');
        try {
            if (!S.somenteLeitura) { coletar(); if (!(await salvar(false))) { throw new Error('Não foi possível salvar o relatório antes de gerar o PDF.'); } }
            const blob = await gerarPdfBlob();
            baixarBlob(blob, nomeArquivoPdf());
            if (!S.somenteLeitura && S.atual.id) {
                try {
                    const url = await subirPdf(blob);
                    await supabaseClient.from('relatorios_atividades').update({ pdf_url: url, atualizado_em: new Date().toISOString() }).eq('id', S.atual.id).eq('gestor_id', idGestor());
                    S.atual.pdf_url = url;
                } catch (e) { alerta('PDF baixado, mas não consegui guardar a cópia no sistema: ' + e.message, 'aviso'); }
            }
            alerta('PDF gerado e salvo no relatório.', 'sucesso');
        } catch (e) { alerta('Erro ao gerar o PDF: ' + (e.message || e), 'erro'); }
        finally { S.pdfGerando = false; ocupado(false); atualizarStatusSalvo(); }
    }

    async function enviar() {
        if (S.pdfGerando || S.somenteLeitura) return;
        const ok = typeof window.mostrarConfirmacao === 'function'
            ? await window.mostrarConfirmacao('Enviar este relatório ao financeiro? Depois de enviado ele não poderá mais ser editado (você pode criar uma cópia).', 'Enviar ao financeiro')
            : confirm('Enviar este relatório ao financeiro?');
        if (!ok) return;
        S.pdfGerando = true; ocupado(true, 'Gerando PDF e enviando…');
        try {
            coletar(); if (!(await salvar(false))) throw new Error('Não foi possível salvar o relatório.');
            const blob = await gerarPdfBlob();
            const url = await subirPdf(blob);
            const { error } = await supabaseClient.from('relatorios_atividades')
                .update({ pdf_url: url, status: 'enviado', enviado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
                .eq('id', S.atual.id).eq('gestor_id', idGestor());
            if (error) throw error;
            alerta('Relatório enviado ao financeiro!', 'sucesso');
            S.dirty = false; clearInterval(S.timerAuto);
            carregarLista();
        } catch (e) { alerta('Erro ao enviar: ' + (e.message || e), 'erro'); }
        finally { S.pdfGerando = false; ocupado(false); }
    }

    async function voltar() {
        if (S.dirty && !S.somenteLeitura) {
            const ok = typeof window.mostrarConfirmacao === 'function' ? await window.mostrarConfirmacao('Você tem alterações não salvas. Salvar antes de sair?', 'Alterações não salvas') : confirm('Salvar antes de sair?');
            if (ok) { coletar(); await salvar(false); }
        }
        clearInterval(S.timerAuto); S.atual = null; S.dirty = false;
        carregarLista();
    }

    // ---------------------------------------------------------------- Início
    async function iniciar() {
        injetarCss();
        const sec = $('tela-relatorio-atividades'); if (!sec) return;
        if (!$('ra-raiz')) sec.innerHTML = '<div id="ra-raiz"></div>';
        if (S.atual && $('ra-ed')) return; // já está no editor (voltou pra aba): não perde o que estava escrevendo
        carregarLista();
    }
    document.addEventListener('mousedown', fecharSelecaoImg, true);
    window.addEventListener('resize', () => { if ($('ra-cena') && S.zoom === 'auto') { ajustarEscala(); paginar(); } });
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-target="tela-relatorio-atividades"]')) setTimeout(iniciar, 30); });

    window.RelAtv = { iniciar, novo, abrir, duplicar, excluir, voltar, salvar, baixar, enviar, cmd, bloco, tamanho, cor, quebra, excluirPagina, imagens, zoom, sujo, _estado: S, _paginar: paginar, _geom: PG };
})();
