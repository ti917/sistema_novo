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
    const nomeLogin = () => (window.usuarioAtual && window.usuarioAtual.nome) || (typeof usuarioAtual !== 'undefined' && usuarioAtual && usuarioAtual.nome) || 'Gestor';
    // no documento vai o NOME COMPLETO do colaborador vinculado ao perfil do gestor (o nome do login costuma ser abreviado)
    const nomeGestor = () => S.nomeCompleto || nomeLogin();
    async function resolverNomeGestor() {
        const uid = (typeof usuarioAtual !== 'undefined' && usuarioAtual) ? usuarioAtual.id : null;
        if (S.nomeCompleto && S.nomeUid === uid) return S.nomeCompleto;
        let n = null;
        try {
            if (typeof window._resolverNomeCarimboAdmin === 'function') n = await window._resolverNomeCarimboAdmin();
            else {
                const vid = usuarioAtual && usuarioAtual.permissoes && usuarioAtual.permissoes.colaborador_vinculado_id;
                if (vid) { const { data } = await supabaseClient.from('perfis').select('nome').eq('id', vid).maybeSingle(); if (data && data.nome) n = data.nome; }
            }
        } catch (e) { /* usa o nome do login */ }
        S.nomeCompleto = (n && String(n).trim()) || null; S.nomeUid = uid;
        return nomeGestor();
    }
    const idGestor = () => (typeof usuarioAtual !== 'undefined' && usuarioAtual) ? usuarioAtual.id : null;
    const novoId = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const pastaGestor = () => 'Relatorios_Atividades/' + (typeof window.formatarNomePasta === 'function' ? window.formatarNomePasta(nomeLogin()) : nomeLogin().replace(/[^a-zA-Z0-9]/g, '_'));

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
        .ra-resumo { display:flex; gap:10px; flex-wrap:wrap; }
        .ra-pilula { display:flex; align-items:center; gap:8px; padding:8px 14px; border-radius:12px; border:1px solid var(--cor-borda); background:var(--cor-fundo-cartao, rgba(255,255,255,.04)); font-size:.8rem; color:var(--cor-texto-secundario); }
        .ra-pilula b { font-size:1.15rem; color:var(--cor-texto-principal); }
        .ra-filtros { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .ra-chip { border:1px solid var(--cor-borda); background:transparent; color:var(--cor-texto-secundario); border-radius:999px; padding:6px 14px; font-size:.78rem; cursor:pointer; font-weight:600; }
        .ra-chip.on { background:rgba(79,195,247,.15); border-color:#4fc3f7; color:#4fc3f7; }
        .ra-busca { flex:1; min-width:200px; max-width:340px; margin-left:auto; }
        .ra-grade { display:grid; grid-template-columns:repeat(auto-fill, minmax(310px, 1fr)); gap:14px; }
        .ra-card { position:relative; display:flex; flex-direction:column; gap:10px; padding:16px 16px 14px; border-radius:14px; border:1px solid var(--cor-borda); background:var(--cor-fundo-cartao, rgba(255,255,255,.04)); transition:transform .15s, border-color .15s, box-shadow .15s; }
        .ra-card:hover { transform:translateY(-2px); border-color:rgba(79,195,247,.6); box-shadow:0 8px 22px rgba(0,0,0,.25); }
        .ra-card::before { content:''; position:absolute; left:0; top:14px; bottom:14px; width:4px; border-radius:0 4px 4px 0; background:#f1c40f; }
        .ra-card.env::before { background:#2ecc71; }
        .ra-card-topo { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
        .ra-card-titulo { font-weight:800; font-size:1rem; line-height:1.25; word-break:break-word; }
        .ra-tags { display:flex; flex-wrap:wrap; gap:6px; }
        .ra-tag { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:8px; font-size:.74rem; background:rgba(79,195,247,.1); color:#7fd3f7; border:1px solid rgba(79,195,247,.25); max-width:100%; }
        .ra-tag.cg { background:rgba(46,204,113,.1); color:#6fdc9f; border-color:rgba(46,204,113,.3); }
        .ra-tag.un { background:rgba(155,89,182,.12); color:#c39bd3; border-color:rgba(155,89,182,.3); }
        .ra-tag span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ra-card-meta { font-size:.74rem; color:var(--cor-texto-secundario); display:flex; flex-direction:column; gap:3px; }
        .ra-card-acoes { display:flex; gap:6px; flex-wrap:wrap; margin-top:auto; padding-top:10px; border-top:1px solid var(--cor-borda); }
        .ra-card-acoes .ra-btn.prim2 { flex:1; justify-content:center; background:rgba(79,195,247,.12); border-color:rgba(79,195,247,.5); color:#4fc3f7; font-weight:700; }
        .ra-devolvido { padding:9px 11px; border-radius:9px; background:rgba(231,76,60,.1); border:1px solid rgba(231,76,60,.4); color:#ff8f84; font-size:.8rem; line-height:1.4; word-break:break-word; }
        .ra-vazio { padding:46px 20px; text-align:center; color:var(--cor-texto-secundario); border:1px dashed var(--cor-borda); border-radius:14px; }
        .ra-vazio i { font-size:2.4rem; opacity:.45; margin-bottom:8px; display:block; }
        .ra-modal-fundo { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:100000; display:flex; align-items:center; justify-content:center; padding:16px; }
        .ra-modal { width:100%; max-width:440px; background:var(--cor-fundo-cartao, #12263a); border:1px solid var(--cor-borda); border-radius:16px; padding:22px; box-shadow:0 20px 50px rgba(0,0,0,.5); }
        .ra-modal h4 { margin:0 0 6px; color:#4fc3f7; } .ra-modal p { margin:0 0 14px; font-size:.84rem; color:var(--cor-texto-secundario); }
        .ra-btn { border:1px solid var(--cor-borda); background:transparent; color:var(--cor-texto-principal); border-radius:8px; padding:7px 11px; cursor:pointer; font-size:.8rem; display:inline-flex; align-items:center; gap:6px; }
        .ra-btn:hover { border-color:#4fc3f7; color:#4fc3f7; }
        .ra-btn.prim { background:#4fc3f7; color:#04202e; border-color:#4fc3f7; font-weight:800; }
        .ra-btn.ok { background:#2ecc71; color:#04200f; border-color:#2ecc71; font-weight:800; }
        .ra-btn.perigo { color:#e74c3c; border-color:rgba(231,76,60,.5); }
        .ra-btn:disabled { opacity:.5; cursor:not-allowed; }
        .ra-meta { display:grid; grid-template-columns: 1.6fr .8fr 1.4fr 1.2fr; gap:10px; }
        .ra-meta label { font-size:.72rem; color:var(--cor-texto-secundario); display:block; margin-bottom:4px; }
        .ra-barra { display:flex; flex-wrap:wrap; gap:6px; align-items:center; padding:8px 10px; border:1px solid var(--cor-borda); border-radius:10px; background:#00152b; position:relative; z-index:40; box-shadow:0 6px 14px rgba(0,0,0,.35); box-sizing:border-box; }
        .ra-barra.presa { position:fixed; margin:0; }
        [data-theme="light"] .ra-barra { background:#fff; }
        .ra-barra .sep { width:1px; height:22px; background:var(--cor-borda); margin:0 4px; }
        .ra-barra button, .ra-barra select { border:1px solid var(--cor-borda); background:transparent; color:var(--cor-texto-principal); border-radius:7px; padding:6px 9px; cursor:pointer; font-size:.82rem; min-width:32px; }
        .ra-barra select { background:var(--cor-fundo-cartao, transparent); width:auto !important; min-width:0; max-width:190px; flex:0 0 auto; }
        .ra-sp, .ra-sp td { user-select:none; -webkit-user-select:none; }
        .ra-sp ::selection, .ra-sp::selection { background:transparent; }
        .ra-area { position:absolute; left:${PG.LEFT}px; top:${PG.TOP}px; width:${PG.CW}px; height:${PG.CH}px; box-sizing:border-box; border:1px dashed rgba(60,140,220,.55); pointer-events:none; z-index:1; }
        .ra-area::before { content:'início da área de texto'; position:absolute; left:0; top:-14px; font:9px Arial,sans-serif; color:rgba(60,140,220,.8); letter-spacing:.04em; }
        .ra-area::after { content:'fim da área de texto'; position:absolute; left:0; bottom:-14px; font:9px Arial,sans-serif; color:rgba(60,140,220,.8); letter-spacing:.04em; }
        .ra-flut { position:fixed; z-index:850; display:none; flex-wrap:wrap; gap:5px; align-items:center; max-width:min(560px, calc(100vw - 16px)); padding:7px 8px; background:#00152b; border:1px solid #4fc3f7; border-radius:10px; box-shadow:0 10px 28px rgba(0,0,0,.55); }
        .ra-flut.on { display:flex; }
        [data-theme="light"] .ra-flut { background:#fff; }
        .ra-flut .gr { display:flex; flex-wrap:wrap; gap:4px; align-items:center; width:100%; }
        .ra-flut .gr + .gr { border-top:1px dashed var(--cor-borda); padding-top:5px; }
        .ra-flut .gr > strong { font-size:.72rem; color:#4fc3f7; margin-right:2px; }
        .ra-flut button, .ra-flut select { border:1px solid var(--cor-borda); background:transparent; color:var(--cor-texto-principal); border-radius:7px; padding:5px 8px; cursor:pointer; font-size:.78rem; min-width:28px; width:auto !important; margin:0 !important; }
        .ra-flut select { padding:5px 4px; background:var(--cor-fundo-cartao, #12263a); }
        .ra-flut button:hover { border-color:#4fc3f7; color:#4fc3f7; }
        .ra-flut input[type=color] { width:28px !important; height:28px; padding:0 !important; border:1px solid var(--cor-borda); border-radius:7px; background:none; cursor:pointer; }
        .ra-pgbtns { position:absolute; left:0; top:0; width:${PG.W}px; height:100%; pointer-events:none; z-index:12; }
        .ra-pgdel { position:absolute; right:14px; pointer-events:auto; background:rgba(231,76,60,.95); color:#fff; border:none; border-radius:999px; padding:5px 12px; font:600 11px Arial,sans-serif; cursor:pointer; opacity:.85; box-shadow:0 2px 8px rgba(0,0,0,.25); }
        .ra-pgdel:hover { opacity:1; }
        .ra-barra button:hover { border-color:#4fc3f7; color:#4fc3f7; }
        .ra-barra input[type=color] { width:30px; height:30px; padding:0; border:1px solid var(--cor-borda); border-radius:7px; background:none; cursor:pointer; }
        .ra-cena, .ra-cena * { overflow-anchor:none; }   /* o navegador não pode "corrigir" a rolagem sozinho enquanto a paginação mede o texto */
        .ra-cena { overflow:auto; background:rgba(0,0,0,.18); border:1px solid var(--cor-borda); border-radius:12px; padding:18px 10px 30px; max-height:calc(100vh - 225px - var(--aviso-offset, 0px)); }
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
        .ra-ed table { border-collapse:collapse; width:100%; table-layout:fixed; margin:4px 0 8px; }
        .ra-ed td, .ra-ed th { border:1px solid #555; padding:4px 7px; vertical-align:top; color:#111; font:inherit; word-wrap:break-word; overflow-wrap:anywhere; min-height:22px; }
        .ra-ed th { background:#eef1f5; font-weight:700; }
        .ra-ed table tr { background:transparent !important; transition:none !important; }
        .ra-ed td, .ra-ed th { text-align:left; text-transform:none !important; letter-spacing:normal !important; }
        .ra-ed tr.ra-sp, .ra-ed tr.ra-sp td { background:none !important; border:none !important; padding:0 !important; }
        .ra-ed.ra-colrs, .ra-ed.ra-colrs td, .ra-ed.ra-colrs th { cursor:col-resize; }
        .ra-tabbar { display:none; gap:6px; align-items:center; flex-wrap:wrap; width:100%; padding-top:6px; margin-top:4px; border-top:1px dashed var(--cor-borda); font-size:.78rem; }
        .ra-tabbar.on { display:flex; }
        .ra-tabpop { display:none; position:absolute; z-index:60; top:36px; left:0; padding:12px; background:var(--cor-fundo-cartao, #12263a); border:1px solid var(--cor-borda); border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,.4); min-width:210px; text-align:left; }
        .ra-tabpop.on { display:block; }
        .ra-tabpop label { display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:.8rem; margin-bottom:8px; }
        .ra-tabpop input { width:64px; }
        .ra-ms { position:relative; }
        .ra-ms > summary { cursor:pointer; list-style:none; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; position:relative; box-sizing:border-box; width:100%; padding:12px 34px 12px 15px; border:1px solid var(--cor-borda); border-radius:8px; background-color:var(--cor-fundo-input, rgba(255,255,255,.05)); color:var(--cor-texto-principal); font-size:1rem; line-height:1.3; transition:border-color .2s; }
        .ra-ms > summary:hover, .ra-ms[open] > summary { border-color:#4fc3f7; }
        .ra-ms > summary::-webkit-details-marker { display:none; }
        .ra-ms > summary::after { content:'▾'; position:absolute; right:10px; top:50%; transform:translateY(-50%); opacity:.7; }
        .ra-ms[data-ro] > summary { opacity:.6; pointer-events:none; }
        .ra-ms-lista { max-height:210px; overflow-y:auto; overflow-x:hidden; padding:6px; border:1px solid var(--cor-borda); border-radius:10px; background:#00152b; }
        .ra-ms > .ra-ms-lista { position:absolute; z-index:50; left:0; right:0; top:100%; margin-top:4px; box-shadow:0 10px 26px rgba(0,0,0,.5); min-width:240px; }
        [data-theme="light"] .ra-ms-lista { background:#fff; }
        .ra-ms-lista.fixa { margin-bottom:12px; }
        .ra-ms-op { display:flex !important; align-items:flex-start; gap:10px; margin:0 !important; padding:7px 10px; border-radius:7px; cursor:pointer; font-size:.84rem !important; font-weight:500 !important; line-height:1.3; color:var(--cor-texto-principal) !important; }
        .ra-ms-op:hover { background:rgba(79,195,247,.1); }
        .ra-ms-op input[type=checkbox], .ra-tabpop input[type=checkbox] { width:16px !important; height:16px !important; min-width:16px !important; padding:0 !important; margin:1px 0 0 !important; flex:0 0 16px; border-radius:3px; accent-color:#4fc3f7; background:none; cursor:pointer; }
        .ra-ms-op span { flex:1 1 auto; min-width:0; text-align:left; word-break:break-word; white-space:normal; }
        .ra-tabpop label { display:flex !important; margin-bottom:8px !important; color:var(--cor-texto-principal) !important; }
        .ra-tabpop input[type=number] { padding:4px 8px !important; width:70px !important; }
        .ra-ms-vazio { padding:8px; font-size:.78rem; color:var(--cor-texto-secundario); }
        .ra-pgbreak { display:block; margin:0; height:16px; line-height:16px; text-align:center; font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:#9aa3b2; border-top:1px dashed #b6bdc9; user-select:none; }
        .ra-imgs { position:absolute; left:0; top:0; width:${PG.W}px; height:100%; pointer-events:none; z-index:10; }
        .ra-img { position:absolute; pointer-events:auto; cursor:move; touch-action:none; box-sizing:border-box; }
        .ra-img img { width:100%; height:100%; display:block; user-select:none; -webkit-user-drag:none; object-fit:fill; pointer-events:none; }
        .ra-img.sel img { outline:2px solid #4fc3f7; }   /* o contorno acompanha a figura girada; os botões ficam fixos na moldura */
        .ra-img.igual img { outline:2px dashed #ffb300; }
        .ra-guia { position:absolute; pointer-events:none; background:#ff4081; z-index:20; }
        .ra-guia.v { width:1px; top:0; } .ra-guia.h { height:1px; left:0; width:${PG.W}px; }
        .ra-guia-tag { position:absolute; pointer-events:none; z-index:21; background:#ffb300; color:#000; font:700 11px Arial,sans-serif; padding:2px 7px; border-radius:6px; white-space:nowrap; }
        .ra-img .alca { display:none; position:absolute; right:-7px; bottom:-7px; width:15px; height:15px; background:#4fc3f7; border:2px solid #fff; border-radius:50%; cursor:nwse-resize; }
        .ra-img .del { display:none; position:absolute; right:-10px; top:-12px; width:24px; height:24px; background:#e74c3c; color:#fff; border:2px solid #fff; border-radius:50%; cursor:pointer; font:700 13px/20px Arial; text-align:center; padding:0; }
        .ra-img .g90 { display:none; position:absolute; left:-10px; top:-12px; width:24px; height:24px; background:#4fc3f7; color:#04202e; border:2px solid #fff; border-radius:50%; cursor:pointer; font:700 13px/18px Arial; text-align:center; padding:0; }
        .ra-img .gira { display:none; position:absolute; left:50%; top:-34px; width:16px; height:16px; margin-left:-8px; background:#fff; border:2px solid #4fc3f7; border-radius:50%; cursor:grab; }
        .ra-img .gira::after { content:''; position:absolute; left:5px; top:12px; width:2px; height:18px; background:#4fc3f7; }
        .ra-img.sel .alca, .ra-img.sel .del, .ra-img.sel .g90, .ra-img.sel .gira { display:block; }
        .ra-aviso { padding:10px 14px; border-radius:10px; font-size:.82rem; }
        .ra-aviso.amarelo { background:rgba(241,196,15,.1); border:1px solid rgba(241,196,15,.4); color:#f1c40f; }
        .ra-dica { font-size:.75rem; color:var(--cor-texto-secundario); }
        @media (max-width:980px){ .ra-meta{ grid-template-columns:1fr 1fr; } }
        @media (max-width:640px){ .ra-meta{ grid-template-columns:1fr; } }
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
        const consulta = (cols) => supabaseClient.from('relatorios_atividades').select(cols).eq('gestor_id', idGestor()).order('atualizado_em', { ascending: false }).limit(500);
        // tenta com todas as colunas e vai tirando só a que o banco ainda não tem (cargo e/ou colunas da devolução), uma de cada vez
        let cols = ['id', 'titulo', 'mes_referencia', 'unidade', 'cargo', 'status', 'pdf_url', 'enviado_em', 'atualizado_em', 'criado_em', 'motivo_devolucao', 'devolvido_em', 'devolvido_por'];
        let { data, error } = await consulta(cols.join(','));
        for (let t = 0; t < 4 && error && /(column|schema cache|coluna)/i.test(error.message || ''); t++) {
            const msg = error.message || '';
            const falta = cols.filter((c) => ['cargo', 'motivo_devolucao', 'devolvido_em', 'devolvido_por'].includes(c) && new RegExp('\\b' + c + '\\b', 'i').test(msg));
            if (!falta.length) break;
            if (falta.includes('cargo')) S.semColunaCargo = true;
            cols = cols.filter((c) => !falta.includes(c));
            ({ data, error } = await consulta(cols.join(',')));
        }
        if (error) {
            raiz.innerHTML = '<div class="glass-card">' + (erroTabela(error) ? avisoTabela() : '<div class="ra-aviso amarelo">Erro ao carregar: ' + esc(error.message) + '</div>') + '</div>';
            return;
        }
        S.lista = data || [];
        desenharLista();
    }

    const fmtData = (iso) => { if (!iso) return '-'; const d = new Date(iso); return isNaN(d) ? '-' : d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
    const fmtMes = (m) => { if (!m) return '-'; const p = String(m).split('-'); return p.length === 2 ? p[1] + '/' + p[0] : m; };

    function chipsMulti(valor, cls, icone, vazio) {
        const v = separar(valor);
        if (!v.length) return vazio ? `<span class="ra-tag ${cls}" style="opacity:.6;"><i class="fa-solid ${icone}"></i><span>${vazio}</span></span>` : '';
        const vis = v.slice(0, 2).map((x) => `<span class="ra-tag ${cls}" title="${esc(x)}"><i class="fa-solid ${icone}"></i><span>${esc(x)}</span></span>`).join('');
        return vis + (v.length > 2 ? `<span class="ra-tag ${cls}" title="${esc(v.slice(2).join(', '))}"><span>+${v.length - 2}</span></span>` : '');
    }
    function desenharLista() {
        const raiz = $('ra-raiz');
        const todos = S.lista || [];
        const nRasc = todos.filter((r) => r.status !== 'enviado').length, nEnv = todos.length - nRasc;
        const f = S.filtroLista || 'todos', q = (S.buscaLista || '').toLowerCase();
        const lista = todos.filter((r) => (f === 'todos' || (f === 'enviado' ? r.status === 'enviado' : r.status !== 'enviado'))
            && (!q || [r.titulo, r.unidade, r.cargo, fmtMes(r.mes_referencia)].join(' ').toLowerCase().includes(q)));
        const cards = lista.map((r) => {
            const env = r.status === 'enviado';
            const dev = !env && !!r.motivo_devolucao;
            return `
            <div class="ra-card ${env ? 'env' : ''}" ${dev ? 'style="border-color:rgba(231,76,60,.6);"' : ''}>
                <div class="ra-card-topo">
                    <div class="ra-card-titulo">${esc(r.titulo || 'Sem título')}</div>
                    <span class="ra-badge ${env ? 'env' : 'rasc'}" ${dev ? 'style="background:rgba(231,76,60,.15);color:#e74c3c;border-color:rgba(231,76,60,.5);"' : ''}>${env ? 'ENVIADO' : (dev ? 'DEVOLVIDO' : 'RASCUNHO')}</span>
                </div>
                <div class="ra-tags">
                    <span class="ra-tag"><i class="fa-regular fa-calendar"></i><span>${esc(fmtMes(r.mes_referencia))}</span></span>
                    ${chipsMulti(r.unidade, 'un', 'fa-building', 'Sem unidade')}
                    ${chipsMulti(r.cargo, 'cg', 'fa-user-tie', '')}
                </div>
                ${dev ? `<div class="ra-devolvido"><b><i class="fa-solid fa-rotate-left"></i> Devolvido pelo financeiro${r.devolvido_em ? ' em ' + fmtData(r.devolvido_em) : ''}${r.devolvido_por ? ' (' + esc(r.devolvido_por) + ')' : ''}</b><br>Motivo: ${esc(r.motivo_devolucao)}</div>` : ''}
                <div class="ra-card-meta">
                    <span><i class="fa-regular fa-clock"></i> Atualizado em ${fmtData(r.atualizado_em)}</span>
                    ${env && r.enviado_em ? `<span style="color:#2ecc71;"><i class="fa-solid fa-paper-plane"></i> Enviado ao financeiro em ${fmtData(r.enviado_em)}</span>` : ''}
                </div>
                <div class="ra-card-acoes">
                    <button class="ra-btn prim2" onclick="RelAtv.abrir('${r.id}')"><i class="fa-solid ${env ? 'fa-eye' : 'fa-pen'}"></i> ${env ? 'Ver' : 'Editar'}</button>
                    ${r.pdf_url ? `<a class="ra-btn" href="${esc(r.pdf_url)}" target="_blank" rel="noopener" title="Abrir o PDF"><i class="fa-solid fa-file-pdf" style="color:#e74c3c;"></i> PDF</a>` : ''}
                    <button class="ra-btn" onclick="RelAtv.duplicar('${r.id}')" title="Criar uma cópia editável"><i class="fa-regular fa-copy"></i></button>
                    ${!env ? `<button class="ra-btn perigo" onclick="RelAtv.excluir('${r.id}')" title="Excluir rascunho"><i class="fa-solid fa-trash"></i></button>` : ''}
                </div>
            </div>`;
        }).join('');
        const chip = (k, t, n) => `<button class="ra-chip ${f === k ? 'on' : ''}" onclick="RelAtv.filtrarLista('${k}')">${t} (${n})</button>`;
        const vazio = todos.length
            ? '<div class="ra-vazio"><i class="fa-solid fa-magnifying-glass"></i>Nenhum relatório encontrado com esse filtro.</div>'
            : '<div class="ra-vazio"><i class="fa-regular fa-file-lines"></i><b>Você ainda não criou nenhum relatório.</b><p style="margin:6px 0 14px;">Clique em "Novo relatório" para começar.</p><button class="ra-btn prim" onclick="RelAtv.novo()"><i class="fa-solid fa-plus"></i> Novo relatório</button></div>';
        raiz.innerHTML = `
            <div class="ra-wrap">
                <div class="ra-topo">
                    <div>
                        <h3><i class="fa-solid fa-file-lines"></i> Relatório de Atividades</h3>
                        <div class="ra-dica" style="margin-top:4px;">Escreva como no Word, com a folha timbrada da Soul. Pode criar quantos relatórios precisar. Quando terminar, baixe o PDF e envie ao financeiro.</div>
                    </div>
                    <button class="ra-btn prim" onclick="RelAtv.novo()"><i class="fa-solid fa-plus"></i> Novo relatório</button>
                </div>
                <div class="ra-resumo">
                    <div class="ra-pilula"><b>${todos.length}</b> relatórios</div>
                    <div class="ra-pilula"><b style="color:#f1c40f;">${nRasc}</b> rascunhos</div>
                    <div class="ra-pilula"><b style="color:#2ecc71;">${nEnv}</b> enviados</div>
                </div>
                <div class="ra-filtros">
                    ${chip('todos', 'Todos', todos.length)}${chip('rascunho', 'Rascunhos', nRasc)}${chip('enviado', 'Enviados', nEnv)}
                    <input class="modern-input ra-busca" id="ra-busca" placeholder="Buscar por título, unidade ou mês..." value="${esc(S.buscaLista || '')}" oninput="RelAtv.buscarLista(this.value)">
                </div>
                ${lista.length ? `<div class="ra-grade">${cards}</div>` : vazio}
            </div>`;
        if (q) { const el = $('ra-busca'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
    }
    function filtrarLista(k) { S.filtroLista = k; desenharLista(); }
    function buscarLista(v) { S.buscaLista = v; desenharLista(); }

    // ---------------------------------------------------------------- Unidades do gestor
    function unidadesDoGestor() {
        const bruto = (typeof usuarioAtual !== 'undefined' && usuarioAtual && usuarioAtual.unidade) ? [].concat(usuarioAtual.unidade).join(',') : '';
        return Array.from(new Set(bruto.split(',').map((u) => u.trim()).filter(Boolean)));
    }
    // ---- seleção múltipla (unidades e cargos): guardados no banco como texto "A, B, C"
    const separar = (t) => Array.from(new Set(String(t || '').split(',').map((x) => x.trim()).filter(Boolean)));
    const juntar = (arr) => (arr || []).join(', ');
    const rotuloMulti = (arr, sing, plur, vazio) => !arr.length ? vazio : (arr.length === 1 ? arr[0] : arr.length + ' ' + plur + ' selecionad' + (plur.endsWith('s') && /^unidade/.test(plur) ? 'as' : 'os'));
    function marcadosEm(raiz) { return raiz ? Array.from(raiz.querySelectorAll('input[type=checkbox][data-v]:checked')).map((i) => i.dataset.v) : []; }
    function valoresMulti(id) { const el = $(id); if (!el) return []; return el.tagName === 'INPUT' && el.type === 'text' ? separar(el.value) : marcadosEm(el); }
    // lista de caixinhas (usada no modal e no editor)
    function listaCaixas(valores, marcados, onchange, vazioTxt) {
        if (!valores.length) return `<div class="ra-ms-vazio">${esc(vazioTxt || 'Nada disponível')}</div>`;
        return valores.map((v) => `<label class="ra-ms-op"><input type="checkbox" data-v="${esc(v)}" ${marcados.includes(v) ? 'checked' : ''} onchange="${onchange}"> <span>${esc(v)}</span></label>`).join('');
    }

    // cargos cadastrados nas unidades escolhidas (mesma base usada nas admissões); só o nome do cargo, sem valores
    async function cargosDasUnidades(unidades) {
        const un = (unidades || []).filter(Boolean); if (!un.length) return [];
        S.cacheCargos = S.cacheCargos || {};
        const chave = un.slice().sort().join('|');
        if (S.cacheCargos[chave]) return S.cacheCargos[chave];
        try {
            const { data, error } = await supabaseClient.from('salarios_base').select('cargo').in('unidade', un);
            if (error) return [];
            const lista = Array.from(new Set((data || []).map((x) => (x.cargo || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
            S.cacheCargos[chave] = lista; return lista;
        } catch (e) { return []; }
    }

    function escolherUnidade(unidades) {
        return new Promise((resolve) => {
            const fundo = document.createElement('div'); fundo.className = 'ra-modal-fundo';
            fundo.innerHTML = `<div class="ra-modal">
                <h4><i class="fa-solid fa-building"></i> Para qual unidade é este relatório?</h4>
                <p>Marque uma ou mais unidades a que as atividades se referem. Você pode mudar depois, dentro do relatório.</p>
                <div class="ra-ms-lista fixa" id="ra-mod-un">${listaCaixas(unidades, unidades.length === 1 ? unidades : [], 'RelAtv._modalUnidades()')}</div>
                ${unidades.length > 1 ? '<div style="margin:-6px 0 10px;"><button type="button" class="ra-chip" id="ra-mod-todas">Marcar todas</button></div>' : ''}
                <label style="font-size:.74rem; color:var(--cor-texto-secundario); display:block; margin-bottom:4px;">Cargos (opcional — os cargos das unidades marcadas; pode marcar vários)</label>
                <div class="ra-ms-lista fixa" id="ra-mod-cg"><div class="ra-ms-vazio">Marque a unidade primeiro</div></div>
                <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:16px;">
                    <button class="ra-btn" id="ra-un-cancel">Cancelar</button>
                    <button class="ra-btn prim" id="ra-un-ok"><i class="fa-solid fa-arrow-right"></i> Criar relatório</button>
                </div></div>`;
            document.body.appendChild(fundo);
            const fim = (v) => { window.RelAtv._modalUnidades = null; fundo.remove(); resolve(v); };
            const atualizarCargos = async () => {
                const un = marcadosEm(fundo.querySelector('#ra-mod-un')), cgBox = fundo.querySelector('#ra-mod-cg');
                const antes = marcadosEm(cgBox);
                if (!un.length) { cgBox.innerHTML = '<div class="ra-ms-vazio">Marque a unidade primeiro</div>'; return; }
                cgBox.innerHTML = '<div class="ra-ms-vazio">Buscando cargos...</div>';
                const lista = await cargosDasUnidades(un);
                cgBox.innerHTML = listaCaixas(lista, antes.filter((c) => lista.includes(c)), '', 'Nenhum cargo cadastrado nestas unidades (opcional)');
            };
            window.RelAtv._modalUnidades = atualizarCargos;
            const todas = fundo.querySelector('#ra-mod-todas');
            if (todas) todas.onclick = () => { const cx = fundo.querySelectorAll('#ra-mod-un input'); const tudo = Array.from(cx).every((c) => c.checked); cx.forEach((c) => { c.checked = !tudo; }); todas.textContent = tudo ? 'Marcar todas' : 'Desmarcar todas'; atualizarCargos(); };
            if (unidades.length === 1) atualizarCargos();
            fundo.querySelector('#ra-un-cancel').onclick = () => fim(null);
            fundo.addEventListener('mousedown', (e) => { if (e.target === fundo) fim(null); });
            fundo.querySelector('#ra-un-ok').onclick = () => {
                const un = marcadosEm(fundo.querySelector('#ra-mod-un'));
                if (!un.length) { alerta('Marque pelo menos uma unidade para o relatório.', 'aviso'); return; }
                fim({ unidade: juntar(un), cargo: juntar(marcadosEm(fundo.querySelector('#ra-mod-cg'))) });
            };
        });
    }

    // ---- campos do editor
    function resumoMulti(arr, vazio, plural) { return !arr.length ? vazio : (arr.length === 1 ? arr[0] : arr.length + ' ' + plural); }
    function campoUnidade(r, ro) {
        const unids = unidadesDoGestor();
        if (!unids.length) return `<input class="modern-input" type="text" id="ra-unidade" value="${esc(r.unidade || '')}" placeholder="Nome da unidade" ${ro ? 'disabled' : ''} oninput="RelAtv.mudarUnidade()">`;
        const marc = separar(r.unidade);
        const lista = unids.concat(marc.filter((u) => !unids.includes(u)));
        return `<details class="ra-ms" ${ro ? 'data-ro="1"' : ''}><summary class="modern-input" id="ra-un-resumo">${esc(resumoMulti(marc, 'Selecione a unidade...', 'unidades'))}</summary>
            <div class="ra-ms-lista" id="ra-unidade">${listaCaixas(lista, marc, 'RelAtv.mudarUnidade()')}</div></details>`;
    }
    function campoCargo(r, ro) {
        const marc = separar(r.cargo);
        return `<details class="ra-ms" ${ro ? 'data-ro="1"' : ''}><summary class="modern-input" id="ra-cg-resumo">${esc(resumoMulti(marc, 'Sem cargo específico (opcional)', 'cargos'))}</summary>
            <div class="ra-ms-lista" id="ra-cargo">${listaCaixas(marc, marc, 'RelAtv.mudarCargo()')}</div></details>`;
    }
    async function recarregarCargos(unidades, atuais) {
        const box = $('ra-cargo'); if (!box) return;
        const lista = await cargosDasUnidades(unidades);
        const manter = (atuais || []).filter((c) => lista.includes(c) || !unidades.length);
        const todos = lista.concat(manter.filter((c) => !lista.includes(c)));
        box.innerHTML = listaCaixas(todos, manter, 'RelAtv.mudarCargo()', unidades.length ? 'Nenhum cargo cadastrado nestas unidades (opcional)' : 'Escolha a unidade primeiro');
        atualizarResumos();
        return manter;
    }
    function atualizarResumos() {
        const u = $('ra-un-resumo'), c = $('ra-cg-resumo');
        if (u) u.textContent = resumoMulti(valoresMulti('ra-unidade'), 'Selecione a unidade...', 'unidades');
        if (c) c.textContent = resumoMulti(valoresMulti('ra-cargo'), 'Sem cargo específico (opcional)', 'cargos');
    }
    // escreve/atualiza/remove a linha "Unidade(s):" / "Cargo(s):" do texto
    function linhaDoDocumento(base, plural, valores, depoisDe) {
        const ed = $('ra-ed'); if (!ed || S.somenteLeitura) return;
        const ps = Array.from(ed.querySelectorAll('p'));
        const reDe = (b) => new RegExp('^\\s*' + b + 's?:', 'i');
        const lu = ps.find((x) => reDe(base).test(x.textContent));
        const rotulo = valores.length > 1 ? plural : base;
        if (lu) { if (valores.length) lu.innerHTML = '<b>' + rotulo + ':</b> ' + esc(juntar(valores)); else lu.remove(); }
        else if (valores.length) {
            const ref = depoisDe.map((r2) => ps.find((x) => reDe(r2).test(x.textContent))).find(Boolean);
            if (ref) ref.insertAdjacentHTML('afterend', '<p><b>' + rotulo + ':</b> ' + esc(juntar(valores)) + '</p>');
        }
    }
    function mudarCargo() { sujo(); if (S.somenteLeitura) return; atualizarResumos(); linhaDoDocumento('Cargo', 'Cargos', valoresMulti('ra-cargo'), ['Unidade', 'Gestor']); agendarPaginacao(); }
    async function mudarUnidade() {
        sujo(); if (S.somenteLeitura) return;
        const un = valoresMulti('ra-unidade');
        atualizarResumos();
        linhaDoDocumento('Unidade', 'Unidades', un, ['Gestor']);
        const mantidos = await recarregarCargos(un, valoresMulti('ra-cargo'));   // cargos de unidades desmarcadas saem
        linhaDoDocumento('Cargo', 'Cargos', mantidos || [], ['Unidade', 'Gestor']);
        agendarPaginacao();
    }

    // ---------------------------------------------------------------- Modelo inicial
    function modeloInicial(mes, unidade, cargo) {
        const hoje = new Date();
        const mesNome = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return '<h1 style="text-align:center">RELATÓRIO DE ATIVIDADES</h1>'
            + '<p style="text-align:center"><b>Período:</b> ' + esc(mesNome) + '</p>'
            + '<p><b>Gestor:</b> ' + esc(nomeGestor()) + '</p>'
            + (unidade ? '<p><b>' + (separar(unidade).length > 1 ? 'Unidades' : 'Unidade') + ':</b> ' + esc(unidade) + '</p>' : '')
            + (cargo ? '<p><b>' + (separar(cargo).length > 1 ? 'Cargos' : 'Cargo') + ':</b> ' + esc(cargo) + '</p>' : '')
            + '<p><br></p><h2>1. Atividades realizadas</h2><p><br></p>'
            + '<h2>2. Observações</h2><p><br></p>';
    }

    // ---------------------------------------------------------------- Editor
    function mesAtualIso() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

    async function novo() {
        await resolverNomeGestor();
        const unids = unidadesDoGestor();
        let unidade = '', cargo = '';
        if (unids.length >= 1) { const esc2 = await escolherUnidade(unids); if (!esc2) return; unidade = esc2.unidade; cargo = esc2.cargo; }
        S.atual = { id: null, titulo: 'Relatório de Atividades', mes_referencia: mesAtualIso(), unidade, cargo, conteudo_html: modeloInicial(mesAtualIso(), unidade, cargo), imagens: [], status: 'rascunho', pdf_url: null };
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
        S.atual = { id: null, titulo: (data.titulo || 'Relatório') + ' (cópia)', mes_referencia: data.mes_referencia, unidade: data.unidade, cargo: data.cargo || null, conteudo_html: data.conteudo_html, imagens: (data.imagens || []).map((i) => ({ ...i, id: novoId() })), status: 'rascunho', pdf_url: null };
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
        <div id="ra-barra-ph"><div class="ra-barra" id="ra-barra">
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
            <button type="button" title="Acrescenta uma página em branco no fim" onmousedown="event.preventDefault()" onclick="RelAtv.quebra()"><i class="fa-solid fa-file-circle-plus"></i> Nova página</button>
            <button type="button" title="Excluir a página onde está o cursor" onmousedown="event.preventDefault()" onclick="RelAtv.excluirPagina()"><i class="fa-solid fa-file-circle-minus"></i> Excluir página</button>
            <button type="button" title="Inserir imagem (pode arrastar depois)" onclick="document.getElementById('ra-file').click()" id="ra-btn-img"><i class="fa-solid fa-image"></i> Imagem</button>
            <button type="button" title="Inserir a sua assinatura digital (a mesma de Assinar Documento)" onmousedown="event.preventDefault()" onclick="RelAtv.assinar('assinatura')" id="ra-btn-assin"><i class="fa-solid fa-signature"></i> Assinatura</button>
            <button type="button" title="Inserir o carimbo da empresa (o mesmo de Assinar Documento)" onmousedown="event.preventDefault()" onclick="RelAtv.assinar('carimbo')" id="ra-btn-carimbo"><i class="fa-solid fa-stamp"></i> Carimbo</button>
            <span style="position:relative; display:inline-block;">
                <button type="button" title="Inserir tabela" onmousedown="event.preventDefault()" onclick="RelAtv.abrirTabela()" id="ra-btn-tabela"><i class="fa-solid fa-table"></i> Tabela</button>
                <div class="ra-tabpop" id="ra-tabpop" onmousedown="event.stopPropagation()">
                    <label>Linhas <input type="number" id="ra-tab-l" min="1" max="60" value="3" class="modern-input" style="padding:4px 8px;"></label>
                    <label>Colunas <input type="number" id="ra-tab-c" min="1" max="12" value="3" class="modern-input" style="padding:4px 8px;"></label>
                    <label style="justify-content:flex-start;"><input type="checkbox" id="ra-tab-cab" checked style="width:auto;"> Primeira linha é cabeçalho</label>
                    <button type="button" class="btn-success" style="padding:7px 14px; font-size:.8rem; width:100%;" onclick="RelAtv.inserirTabela()">Inserir tabela</button>
                </div>
            </span>
            <input type="file" id="ra-file" accept="image/*" multiple style="display:none" onchange="RelAtv.imagens(this.files); this.value=''">
            <span class="sep"></span>
            <select title="Zoom" onchange="RelAtv.zoom(this.value)" id="ra-zoom"><option value="auto">Ajustar à tela</option><option value="1">100%</option><option value="0.75">75%</option><option value="0.5">50%</option></select>
        </div></div>`;
    }

    function desenharEditor() {
        const r = S.atual, ro = S.somenteLeitura;
        $('ra-raiz').innerHTML = `
        <div class="ra-wrap">
            <div class="ra-topo">
                <h3><i class="fa-solid fa-file-lines"></i> ${ro ? 'Relatório enviado' : (r.id ? 'Editar relatório' : 'Novo relatório')}</h3>
                <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                    ${ro ? '' : '<span class="ra-dica" id="ra-aviso-assin" style="color:#f1c40f;" title="O botão Enviar só funciona depois de assinar"><i class="fa-solid fa-signature"></i> Falta assinar para enviar</span>'}
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
                <div><label>Unidades deste relatório</label>${campoUnidade(r, ro)}</div>
                <div><label>Cargos (opcional)</label>${campoCargo(r, ro)}</div>
            </div>
            ${(!ro && r.motivo_devolucao) ? `<div class="ra-devolvido"><b><i class="fa-solid fa-rotate-left"></i> O financeiro devolveu este relatório${r.devolvido_em ? ' em ' + fmtData(r.devolvido_em) : ''}${r.devolvido_por ? ' (' + esc(r.devolvido_por) + ')' : ''}.</b><br>Motivo: ${esc(r.motivo_devolucao)}<br><small>Faça os ajustes, assine e envie novamente.</small></div>` : ''}
            ${ro ? '<div class="ra-aviso amarelo">Este relatório já foi enviado ao financeiro e não pode mais ser editado. Use o botão de copiar na lista para criar uma nova versão.</div>' : ''}
            ${ro ? '' : barraHtml()}
            <div class="ra-cena" id="ra-cena"><div class="ra-escala" id="ra-escala"><div class="ra-stage" id="ra-stage">
                <div id="ra-paginas"></div>
                <div class="ra-ed" id="ra-ed" ${ro ? '' : 'contenteditable="true"'} spellcheck="true"></div>
                <div class="ra-imgs" id="ra-imgs"></div>
            </div></div></div>
            ${ro ? '' : '<div class="ra-dica">Dica: as imagens ficam por cima do texto. Clique numa imagem para arrastar, puxar a bolinha azul para mudar o tamanho ou o X vermelho para remover. Para o texto não ficar por baixo da imagem, deixe linhas em branco onde ela vai ficar.</div>'}
        </div>`;
        criarFlut();
        const ed = $('ra-ed');
        ed.innerHTML = r.conteudo_html || '<p><br></p>';
        try { document.execCommand('defaultParagraphSeparator', false, 'p'); document.execCommand('styleWithCSS', false, true); } catch (e) { /* ok */ }
        if (!ro) ligarEditor(ed);
        desenharImagens();
        ajustarEscala();
        ajustarBarraFixa();
        paginar();
        recarregarCargos(separar(S.atual.unidade), separar(S.atual.cargo));
        S.dirty = false;
        atualizarStatusSalvo();
        clearInterval(S.timerAuto);
        if (!ro) S.timerAuto = setInterval(() => { if (S.dirty && !S.salvando && !S.pdfGerando && $('ra-ed')) salvar(false); }, 25000);
    }

    function ligarEditor(ed) {
        ed.addEventListener('input', () => { sujo(); agendarPaginacao(); });
        document.addEventListener('selectionchange', () => { const sl = window.getSelection(); if (sl && sl.rangeCount && ed.contains(sl.getRangeAt(0).startContainer)) S.caretValido = true; agendarFlut(); });
        ed.addEventListener('mouseup', agendarFlut); ed.addEventListener('keyup', agendarFlut);
        // clicar na área vazia do editor (abaixo do último bloco) leva o cursor para o fim, sempre num parágrafo
        ed.addEventListener('mousedown', (e) => { if (e.target !== ed) return; const u = ed.lastElementChild; if (u && u.tagName !== 'P' || !u) { garantirParagrafosDaTabela(ed); } });
        ligarColunas(ed);
        const stg = $('ra-stage'); if (stg) stg.addEventListener('mousedown', cliqueLivre);
        ed.addEventListener('paste', (e) => {
            const cd = e.clipboardData; if (!cd) return;
            const arqs = Array.from(cd.files || []).filter((f) => /^image\//.test(f.type));
            if (arqs.length) { e.preventDefault(); imagens(arqs); return; }
            e.preventDefault();
            const html = cd.getData('text/html'), txt = cd.getData('text/plain');
            document.execCommand('insertHTML', false, html ? limparHtml(html) : esc(txt).replace(/\n/g, '<br>'));
        });
        ed.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const cel = celulaAtual();
                if (cel) { irCelula(cel, e.shiftKey ? -1 : 1); return; }
                document.execCommand('insertText', false, '    ');
            }
        });
    }

    // Clicar em qualquer ponto da página (margens, espaço vazio embaixo do texto, outra página) coloca o cursor ali:
    // se o ponto está depois do fim do texto, cria as linhas em branco necessárias até aquele ponto.
    function cliqueLivre(e) {
        const ed = $('ra-ed'), stage = $('ra-stage'); if (!ed || !stage || S.somenteLeitura || e.button !== 0) return;
        const t = e.target;
        if (t.closest && t.closest('.ra-img, .ra-pgdel, #ra-flut')) return;
        if (t !== ed && ed.contains(t)) return;                    // clique em cima de texto/tabela: o navegador resolve sozinho
        const sr = stage.getBoundingClientRect(), esc = S.escala || 1;
        let y = (e.clientY - sr.top) / esc;
        const pg = Math.max(0, Math.floor(y / PG.P)), rel = y - pg * PG.P;
        const total = Math.max(1, S.paginas || 1);
        if (rel < PG.TOP) y = pg * PG.P + PG.TOP + 3;                                        // cabeçalho
        else if (rel > PG.TOP + PG.CH) y = (pg + 1 < total ? (pg + 1) * PG.P + PG.TOP + 3 : pg * PG.P + PG.TOP + PG.CH - 3);   // rodapé / vão entre páginas
        e.preventDefault(); ed.focus({ preventScroll: true });
        garantirParagrafosDaTabela(ed);
        const reais = Array.from(ed.children).filter((c) => !c.classList.contains('ra-pgmin') && !c.hasAttribute('data-ra-m'));
        const ult = reais[reais.length - 1];
        const er = ed.getBoundingClientRect();
        const fimStage = ult ? PG.TOP + (ult.getBoundingClientRect().bottom - er.top) / esc : PG.TOP;
        const util = (ys) => { const k = Math.max(0, Math.floor((ys - 0.5) / PG.P)); return k * PG.CH + Math.max(0, Math.min(PG.CH, ys - k * PG.P - PG.TOP)); };
        const sel = window.getSelection();
        if (y <= fimStage - 2) {
            // dentro do texto: pega a posição de texto mais próxima daquele ponto
            const cx = Math.max(er.left + 3, Math.min(er.right - 3, e.clientX)), cy = sr.top + y * esc;
            let rg = document.caretRangeFromPoint ? document.caretRangeFromPoint(cx, cy) : null;
            if (!rg || !ed.contains(rg.startContainer)) { rg = document.createRange(); rg.selectNodeContents(ult || ed); rg.collapse(false); }
            sel.removeAllRanges(); sel.addRange(rg); agendarFlut(); return;
        }
        const linha = 29.25;
        let n = Math.max(1, Math.min(60, Math.ceil((util(y) - util(fimStage)) / linha)));
        const ultVazio = ult && ult.tagName === 'P' && !(ult.textContent || '').trim() && !ult.querySelector('img,table');
        let alvo = ultVazio ? ult : null, ref = ult;
        if (ultVazio) n -= 1;
        for (let i = 0; i < n; i++) { const np = document.createElement('p'); np.innerHTML = '<br>'; if (ref) ref.after(np); else ed.prepend(np); ref = np; alvo = np; }
        if (!alvo) { alvo = document.createElement('p'); alvo.innerHTML = '<br>'; ed.appendChild(alvo); }
        const rg = document.createRange(); rg.selectNodeContents(alvo); rg.collapse(true); sel.removeAllRanges(); sel.addRange(rg);
        if (n > 0) { sujo(); paginar(); }
        agendarFlut();
    }

    // sanitiza HTML colado (Word/Web): só estrutura básica
    function limparHtml(html) {
        const d = document.createElement('div'); d.innerHTML = html;
        d.querySelectorAll('script,style,meta,link,xml,o\\:p,img,iframe,object').forEach((n) => n.remove());
        const ok = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'DIV', 'SPAN', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH']);
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
    function cmd(c) { const ed = $('ra-ed'); if (!ed) return; ed.focus({ preventScroll: true }); document.execCommand(c, false, null); sujo(); agendarPaginacao(); }
    function bloco(tag) { const ed = $('ra-ed'); if (!ed) return; ed.focus({ preventScroll: true }); document.execCommand('formatBlock', false, tag); sujo(); agendarPaginacao(); }
    function cor(v) { const ed = $('ra-ed'); if (!ed) return; ed.focus({ preventScroll: true }); document.execCommand('foreColor', false, v); sujo(); }
    function tamanho(px) {
        if (!px) return; const ed = $('ra-ed'); ed.focus({ preventScroll: true });
        // sem texto selecionado (linha vazia / cursor solto): já deixa o tamanho valendo para o que for digitado a seguir
        const sl = window.getSelection();
        if (sl && sl.rangeCount && sl.isCollapsed && ed.contains(sl.getRangeAt(0).startContainer)) {
            const sp = document.createElement('span'); sp.style.fontSize = px + 'px'; sp.setAttribute('data-ra-tam', '1');
            const t = document.createTextNode('\u200b'); sp.appendChild(t);
            const r = sl.getRangeAt(0); r.insertNode(sp);
            const n = document.createRange(); n.setStart(t, 1); n.collapse(true); sl.removeAllRanges(); sl.addRange(n);
            sujo(); agendarPaginacao(); return;
        }
        document.execCommand('fontSize', false, '7');
        ed.querySelectorAll('font[size="7"]').forEach((f) => { const s = document.createElement('span'); s.style.fontSize = px + 'px'; while (f.firstChild) s.appendChild(f.firstChild); f.replaceWith(s); });
        ed.querySelectorAll('span[style*="font-size: xxx-large"],span[style*="font-size:xxx-large"]').forEach((s) => { s.style.fontSize = px + 'px'; });
        sujo(); agendarPaginacao();
    }
    // "Nova página": só acrescenta uma página em branco no fim. Não é uma quebra: o texto continua normalmente (na página anterior, se ainda houver espaço, e depois nesta).
    function paginasMinimas(ed) { const m = ed.querySelector(':scope > .ra-pgmin'); return m ? (parseInt(m.getAttribute('data-n'), 10) || 1) : 1; }
    function definirPaginasMinimas(ed, n) {
        let m = ed.querySelector(':scope > .ra-pgmin');
        if (n <= 1) { if (m) m.remove(); return; }
        if (!m) { m = document.createElement('div'); m.className = 'ra-pgmin'; m.setAttribute('contenteditable', 'false'); m.style.display = 'none'; ed.appendChild(m); }
        m.setAttribute('data-n', String(n));
    }
    function quebra() {
        const ed = $('ra-ed'); if (!ed || S.somenteLeitura) return;
        paginar();
        const novo = Math.max(S.paginas || 1, paginasMinimas(ed)) + 1;
        definirPaginasMinimas(ed, novo);
        // cursor no fim do texto (se o texto ainda tem espaço na página, continua escrevendo nela)
        let ult = ed.lastElementChild; while (ult && (ult.classList.contains('ra-pgmin') || ult.hasAttribute('data-ra-m') || ult.classList.contains('ra-pgbreak'))) ult = ult.previousElementSibling;
        if (!ult || ult.tagName === 'TABLE') { const np = document.createElement('p'); np.innerHTML = '<br>'; if (ult) ult.after(np); else ed.prepend(np); ult = np; }
        ed.focus({ preventScroll: true });
        const r = document.createRange(); r.selectNodeContents(ult); r.collapse(false); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        sujo(); paginar();
        setTimeout(() => { const cena = $('ra-cena'); if (!cena) return; cena.scrollTo({ top: Math.max(0, (novo - 1) * PG.P * S.escala - 10), behavior: 'smooth' }); }, 220);
    }

    // ---------------------------------------------------------------- Janela de opções que aparece onde se clica
    function flutHtml() {
        const b = (cmd, ic, tit) => `<button type="button" title="${tit}" onmousedown="event.preventDefault()" onclick="RelAtv.cmd('${cmd}')"><i class="fa-solid ${ic}"></i></button>`;
        const t = (a, txt, tit, extra) => `<button type="button" title="${tit}" onmousedown="event.preventDefault()" onclick="RelAtv.tab('${a}')" ${extra || ''}>${txt}</button>`;
        return `<div class="gr" id="ra-flut-txt">
                <select title="Estilo do texto" onchange="RelAtv.bloco(this.value); this.value='p'"><option value="p">Parágrafo</option><option value="h1">Título 1</option><option value="h2">Título 2</option><option value="h3">Título 3</option></select>
                <select title="Tamanho da letra" onchange="RelAtv.tamanho(this.value); this.value=''"><option value="">Tamanho</option>${[11, 12, 13, 14, 15, 16, 18, 20, 24, 28].map((n) => `<option value="${n}">${n}</option>`).join('')}</select>
                ${b('bold', 'fa-bold', 'Negrito')}${b('italic', 'fa-italic', 'Itálico')}${b('underline', 'fa-underline', 'Sublinhado')}
                <input type="color" value="#111111" title="Cor do texto" onchange="RelAtv.cor(this.value)">
                ${b('justifyLeft', 'fa-align-left', 'Esquerda')}${b('justifyCenter', 'fa-align-center', 'Centralizar')}${b('justifyRight', 'fa-align-right', 'Direita')}${b('justifyFull', 'fa-align-justify', 'Justificar')}
                ${b('insertUnorderedList', 'fa-list-ul', 'Marcadores')}${b('insertOrderedList', 'fa-list-ol', 'Numeração')}
            </div>
            <div class="gr" id="ra-flut-tab" style="display:none;">
                <strong><i class="fa-solid fa-table"></i> Tabela:</strong>
                ${t('linhaDepois', '+ Linha abaixo', 'Nova linha abaixo')}${t('linhaAntes', '+ Linha acima', 'Nova linha acima')}${t('colDepois', '+ Coluna dir.', 'Nova coluna à direita')}${t('colAntes', '+ Coluna esq.', 'Nova coluna à esquerda')}
                ${t('delLinha', '− Linha', 'Excluir a linha')}${t('delCol', '− Coluna', 'Excluir a coluna')}${t('cabecalho', 'Cabeçalho', 'Liga/desliga a linha de cabeçalho')}${t('delTabela', 'Excluir tabela', 'Excluir a tabela inteira', 'style="border-color:#e74c3c;color:#e74c3c;"')}
            </div>`;
    }
    function criarFlut() {
        const v = $('ra-flut'); if (v) v.remove();
        if (S.somenteLeitura) return;
        const d = document.createElement('div'); d.id = 'ra-flut'; d.className = 'ra-flut'; d.innerHTML = flutHtml();
        d.addEventListener('mousedown', (e) => { if (!/^(SELECT|INPUT|OPTION)$/.test(e.target.tagName)) e.preventDefault(); });
        document.body.appendChild(d);
    }
    function agendarFlut() { if (S.rafFlut) return; S.rafFlut = requestAnimationFrame(() => { S.rafFlut = 0; posicionarFlut(); }); }
    function posicionarFlut() {
        const f = $('ra-flut'), ed = $('ra-ed');
        if (!f) return;
        if (!ed || S.somenteLeitura || S.arrastando) { f.classList.remove('on'); return; }
        const sl = window.getSelection();
        if (!sl || !sl.rangeCount || !ed.contains(sl.getRangeAt(0).startContainer)) { if (!f.contains(document.activeElement)) f.classList.remove('on'); return; }
        const r = sl.getRangeAt(0);
        const cel = celulaAtual();
        let rect = cel ? cel.getBoundingClientRect() : null;
        if (!rect) {
            const rs = r.getClientRects(); rect = rs.length && rs[0].height ? rs[0] : null;
            if (!rect) { let n = r.startContainer; n = n.nodeType === 1 ? n : n.parentElement; if (n && n !== ed) rect = n.getBoundingClientRect(); }
        }
        if (!rect || !rect.height) { f.classList.remove('on'); return; }
        $('ra-flut-tab').style.display = cel ? 'flex' : 'none';
        f.classList.add('on');
        const minTop = Math.max(S.barraTopo || 0, 8), fh = f.offsetHeight, fw = f.offsetWidth;
        const cena = $('ra-cena'); const cr = cena ? cena.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
        if (rect.bottom < Math.max(minTop, cr.top) || rect.top > Math.min(window.innerHeight, cr.bottom)) { f.classList.remove('on'); return; }
        // preferência: encostar o painel na lateral da folha (área cinza), para nunca cobrir o texto nem o que vai ser clicado
        const pag = document.querySelector('#ra-stage .ra-pagina'); const pr = pag ? pag.getBoundingClientRect() : null;
        const limD = cr.right - 10, limE = cr.left + 10;
        f.style.maxWidth = '';
        if (pr) {
            const livreD = limD - pr.right - 12, livreE = pr.left - 12 - limE;
            const lado = livreD >= 230 && livreD >= livreE ? 'd' : (livreE >= 230 ? 'e' : null);
            if (lado) {
                f.style.maxWidth = Math.min(560, lado === 'd' ? livreD : livreE) + 'px';
                const fh2 = f.offsetHeight, fw2 = f.offsetWidth;
                let t2 = Math.max(minTop, Math.min(rect.top - 4, window.innerHeight - fh2 - 8));
                f.style.top = Math.round(t2) + 'px';
                f.style.left = Math.round(lado === 'd' ? pr.right + 12 : pr.left - 12 - fw2) + 'px';
                return;
            }
        }
        // sem espaço na lateral: fica na borda de cima ou de baixo da área visível (a que estiver mais longe de onde você clicou)
        const slotTopo = Math.max(minTop, cr.top + 6), slotBase = Math.min(window.innerHeight, cr.bottom) - fh - 8;
        const distTopo = Math.abs(rect.top - (slotTopo + fh)), distBase = Math.abs(slotBase - rect.bottom);
        const top = (rect.bottom < slotTopo + fh + 6 || distBase >= distTopo) && slotBase > slotTopo + fh ? slotBase : slotTopo;
        f.style.top = Math.round(Math.max(minTop, top)) + 'px';
        const cx = pr ? pr.left + (pr.width - fw) / 2 : rect.left;
        f.style.left = Math.round(Math.max(8, Math.min(cx, window.innerWidth - fw - 8))) + 'px';
    }

    // ---------------------------------------------------------------- Tabelas
    function celulaAtual() {
        const ed = $('ra-ed'); const sl = window.getSelection(); if (!ed || !sl || !sl.rangeCount) return null;
        let n = sl.getRangeAt(0).startContainer; n = n.nodeType === 1 ? n : n.parentElement;
        const c = n && n.closest ? n.closest('td,th') : null;
        return c && ed.contains(c) ? c : null;
    }
    function atualizarTabbar() { agendarFlut(); }
    function cursorNaCelula(c, fim) { const r = document.createRange(); r.selectNodeContents(c); r.collapse(!fim); const sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(r); }
    function irCelula(cel, dir) {
        const tb = cel.closest('table'); const cels = Array.from(tb.querySelectorAll('td,th')); const i = cels.indexOf(cel) + dir;
        if (i < 0) return;
        if (i >= cels.length) { tabela('linhaDepois'); const novas = Array.from(tb.querySelectorAll('td,th')); cursorNaCelula(novas[i]); return; }
        cursorNaCelula(cels[i]);
    }
    function abrirTabela() {
        const pop = $('ra-tabpop'); if (!pop) return;
        const sl = window.getSelection(); S.rangeTab = (sl && sl.rangeCount && $('ra-ed').contains(sl.getRangeAt(0).startContainer)) ? sl.getRangeAt(0).cloneRange() : null;
        pop.classList.toggle('on');
    }
    function igualarColunas(tb) {
        const n = Math.max.apply(null, Array.from(tb.rows).map((r) => r.cells.length));
        let cg = tb.querySelector('colgroup'); if (cg) cg.remove();
        cg = document.createElement('colgroup');
        for (let i = 0; i < n; i++) { const c = document.createElement('col'); c.style.width = (100 / n).toFixed(3) + '%'; cg.appendChild(c); }
        tb.insertBefore(cg, tb.firstChild);
    }
    function inserirTabela() {
        const ed = $('ra-ed'); if (!ed || S.somenteLeitura) return;
        const L = Math.max(1, Math.min(60, parseInt($('ra-tab-l').value, 10) || 3)), C = Math.max(1, Math.min(12, parseInt($('ra-tab-c').value, 10) || 3));
        const cab = $('ra-tab-cab').checked;
        $('ra-tabpop').classList.remove('on');
        const tb = document.createElement('table');
        const tbody = document.createElement('tbody');
        for (let r = 0; r < L; r++) {
            const tr = document.createElement('tr');
            for (let c = 0; c < C; c++) { const td = document.createElement(cab && r === 0 ? 'th' : 'td'); td.innerHTML = '<br>'; tr.appendChild(td); }
            tbody.appendChild(tr);
        }
        tb.appendChild(tbody); igualarColunas(tb);
        // onde entra: logo depois do bloco onde está o cursor (ou no fim do texto)
        let ref = null;
        if (S.rangeTab) { let n = S.rangeTab.startContainer; while (n && n.parentNode !== ed) n = n.parentNode; ref = n && n.parentNode === ed ? n : null; }
        const vazio = ref && ref.tagName === 'P' && !(ref.textContent || '').trim() && !ref.querySelector('img,table');
        if (ref && ref.tagName === 'TABLE') { /* depois da tabela */ }
        const apos = document.createElement('p'); apos.innerHTML = '<br>';
        if (ref) { if (vazio) { ref.replaceWith(tb); } else { ref.after(tb); } tb.after(apos); } else { ed.appendChild(tb); ed.appendChild(apos); }
        S.rangeTab = null;
        const primeira = tb.querySelector('th,td'); ed.focus({ preventScroll: true }); cursorNaCelula(primeira);
        sujo(); agendarPaginacao(); atualizarTabbar();
    }
    function tabela(acao) {
        const ed = $('ra-ed'); const cel = celulaAtual(); if (!ed || !cel || S.somenteLeitura) return;
        const tr = cel.parentElement, tb = cel.closest('table'), idx = cel.cellIndex;
        const novaCel = (modelo) => { const c = document.createElement(modelo && modelo.tagName === 'TH' ? 'th' : 'td'); c.innerHTML = '<br>'; return c; };
        if (acao === 'linhaDepois' || acao === 'linhaAntes') {
            const nr = document.createElement('tr'); Array.from(tr.cells).forEach((c) => nr.appendChild(novaCel(acao === 'linhaDepois' && c.tagName === 'TH' ? { tagName: 'TD' } : c)));
            if (acao === 'linhaDepois') tr.after(nr); else tr.before(nr);
            cursorNaCelula(nr.cells[Math.min(idx, nr.cells.length - 1)]);
        } else if (acao === 'colDepois' || acao === 'colAntes') {
            Array.from(tb.rows).forEach((r) => { if (r.classList.contains('ra-sp')) return; const ref = r.cells[Math.min(idx, r.cells.length - 1)]; const nc = novaCel(ref); if (acao === 'colDepois') ref.after(nc); else ref.before(nc); });
            igualarColunas(tb); cursorNaCelula(tr.cells[acao === 'colDepois' ? idx + 1 : idx]);
        } else if (acao === 'delLinha') {
            const prox = tr.nextElementSibling || tr.previousElementSibling;
            const reais = Array.from(tb.rows).filter((r) => !r.classList.contains('ra-sp'));
            if (reais.length <= 1) return tabela('delTabela');
            tr.remove(); if (prox && prox.cells) cursorNaCelula(prox.cells[Math.min(idx, prox.cells.length - 1)]);
        } else if (acao === 'delCol') {
            if (tr.cells.length <= 1) return tabela('delTabela');
            Array.from(tb.rows).forEach((r) => { if (r.cells[idx]) r.cells[idx].remove(); });
            igualarColunas(tb); cursorNaCelula(tr.cells[Math.min(idx, tr.cells.length - 1)]);
        } else if (acao === 'cabecalho') {
            const linha = tb.rows[0]; const ehTh = linha.cells[0].tagName === 'TH';
            Array.from(linha.cells).forEach((c) => { const n = document.createElement(ehTh ? 'td' : 'th'); n.innerHTML = c.innerHTML; c.replaceWith(n); });
        } else if (acao === 'delTabela') {
            const prox = tb.nextElementSibling || tb.previousElementSibling; tb.remove();
            if (!ed.children.length) ed.innerHTML = '<p><br></p>';
            if (prox) { const r = document.createRange(); r.selectNodeContents(prox); r.collapse(true); const sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(r); }
        }
        sujo(); agendarPaginacao(); atualizarTabbar();
    }
    // arrastar a borda entre colunas para mudar a largura
    function ligarColunas(ed) {
        const naBorda = (e) => { const td = e.target.closest && e.target.closest('td,th'); if (!td || !td.nextElementSibling) return null; return (td.getBoundingClientRect().right - e.clientX <= 5 && td.getBoundingClientRect().right - e.clientX >= -3) ? td : null; };
        ed.addEventListener('mousemove', (e) => { if (S.arrCol) return; ed.classList.toggle('ra-colrs', !!naBorda(e)); });
        ed.addEventListener('mousedown', (e) => {
            const td = naBorda(e); if (!td) return;
            e.preventDefault();
            const tb = td.closest('table'), i = td.cellIndex;
            if (!tb.querySelector('colgroup')) igualarColunas(tb);
            const ref = Array.from(tb.rows).find((r) => !r.classList.contains('ra-sp') && r.cells.length > i + 1) || tb.rows[0];
            const larg = Array.from(ref.cells).map((c) => c.getBoundingClientRect().width / S.escala);
            const total = larg.reduce((a, b) => a + b, 0), x0 = e.clientX;
            const cols = tb.querySelectorAll('col');
            S.arrCol = true;
            const mover = (ev) => {
                const d = (ev.clientX - x0) / S.escala; const a = Math.max(36, Math.min(larg[i] + larg[i + 1] - 36, larg[i] + d)), b = larg[i] + larg[i + 1] - a;
                if (cols[i]) cols[i].style.width = (a / total * 100).toFixed(3) + '%'; if (cols[i + 1]) cols[i + 1].style.width = (b / total * 100).toFixed(3) + '%';
                paginar();
            };
            const soltar = () => { document.removeEventListener('mousemove', mover); document.removeEventListener('mouseup', soltar); S.arrCol = false; sujo(); agendarPaginacao(); };
            document.addEventListener('mousemove', mover); document.addEventListener('mouseup', soltar);
        });
    }

    // ---------------------------------------------------------------- Excluir página
    async function excluirPagina(nPedida) {
        const ed = $('ra-ed'); if (!ed || S.somenteLeitura) return;
        paginar();
        const base = ed.getBoundingClientRect().top, P = PG.P;
        const pgDe = (y) => Math.floor((y + 0.5) / P);
        // página do cursor (se não houver cursor no texto, a última)
        let n = S.paginas - 1;
        const sl = window.getSelection();
        if (typeof nPedida === 'number') n = Math.min(S.paginas - 1, Math.max(0, nPedida));
        else if (sl && sl.rangeCount && ed.contains(sl.getRangeAt(0).startContainer)) {
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
        Array.from(ed.children).forEach((c) => { if (c.classList.contains('ra-pgmin')) return; if (c.tagName === 'UL' || c.tagName === 'OL') Array.from(c.children).forEach((li) => blocos.push(li)); else if (c.tagName === 'TABLE') Array.from(c.rows).filter((r) => !r.classList.contains('ra-sp')).forEach((r) => blocos.push(r)); else blocos.push(c); });
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
        ed.querySelectorAll('table').forEach((t) => { if (!t.querySelector('tr')) t.remove(); });
        definirPaginasMinimas(ed, Math.max(1, paginasMinimas(ed) - 1));
        if (!Array.from(ed.children).some((c) => !c.classList.contains('ra-pgmin'))) ed.insertAdjacentHTML('afterbegin', '<p><br></p>');
        S.atual.imagens = (S.atual.imagens || []).filter((i) => i.page !== n).map((i) => (i.page > n ? { ...i, page: i.page - 1 } : i));
        desenharImagens(); sujo(); paginar();
    }

    // ---------------------------------------------------------------- Paginação
    function agendarPaginacao() { clearTimeout(S.timerPag); S.timerPag = setTimeout(paginar, 90); }
    function topoRel(el, base) { return (el.getBoundingClientRect().top - base) / S.escala; }

    // o cursor é guardado com marcadores invisíveis (um no início e outro no fim da seleção) e devolvido depois de refazer a paginação
    function salvarCursor(ed) {
        const sl = window.getSelection(); if (!sl || !sl.rangeCount) return null;
        const r = sl.getRangeAt(0); if (!ed.contains(r.startContainer) || !ed.contains(r.endContainer)) return null;
        const mk = (id) => { const m = document.createElement('span'); m.setAttribute('data-ra-m', id); m.style.cssText = 'display:inline;width:0;height:0;'; return m; };
        const fim = r.cloneRange(); fim.collapse(false); const mf = mk('f'); fim.insertNode(mf);
        const ini = r.cloneRange(); ini.collapse(true); const mi = mk('i'); ini.insertNode(mi);
        return { mi, mf };
    }
    function restaurarCursor(ed, c) {
        if (!c) return;
        try {
            const r = document.createRange();
            if (c.mi.parentNode) r.setStartBefore(c.mi); else return;
            if (c.mf.parentNode) r.setEndBefore(c.mf); else r.collapse(true);
            c.mi.remove(); c.mf.remove();
            const sl = window.getSelection(); sl.removeAllRanges(); sl.addRange(r);
        } catch (e) { /* ok */ }
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

    // sempre tem que existir um parágrafo antes e depois de cada tabela (senão o cursor não consegue sair dela para escrever)
    function garantirParagrafosDaTabela(ed) {
        const novoP = () => { const p = document.createElement('p'); p.innerHTML = '<br>'; return p; };
        const ehMarca = (n) => n && n.hasAttribute && (n.hasAttribute('data-ra-m') || n.classList.contains('ra-pgmin'));
        Array.from(ed.children).forEach((c) => {
            if (c.tagName !== 'TABLE') return;
            let prox = c.nextElementSibling; while (ehMarca(prox)) prox = prox.nextElementSibling;
            if (!prox || prox.tagName === 'TABLE') c.after(novoP());
            let ant = c.previousElementSibling; while (ehMarca(ant)) ant = ant.previousElementSibling;
            if (!ant) c.before(novoP());
        });
    }
    function paginar() {
        const ed = $('ra-ed'); if (!ed) return;
        const cenaP = $('ra-cena'), rolaCena = cenaP ? cenaP.scrollTop : 0, rolaJanela = window.scrollY;   // a paginação nunca deve mexer na rolagem
        const cursor = (document.activeElement === ed) ? salvarCursor(ed) : null;
        ed.querySelectorAll('.ra-sp').forEach((x) => x.remove());
        garantirParagrafosDaTabela(ed);
        ed.normalize();
        ed.querySelectorAll('[data-ra]').forEach((b) => { b.style.paddingTop = ''; b.removeAttribute('data-ra'); if (!b.getAttribute('style')) b.removeAttribute('style'); });
        const base = ed.getBoundingClientRect().top;
        const blocos = [];
        Array.from(ed.children).forEach((c) => {
            if (c.hasAttribute('data-ra-m') || c.classList.contains('ra-pgmin')) return;
            if (c.tagName === 'UL' || c.tagName === 'OL') Array.from(c.children).forEach((li) => blocos.push(li));
            else if (c.tagName === 'TABLE') Array.from(c.rows).forEach((tr) => blocos.push(tr));
            else blocos.push(c);
        });
        let forcarPag = null, ultimoFim = 0;
        for (const b of blocos) {
            let top = topoRel(b, base);
            const cs = getComputedStyle(b), mb = parseFloat(cs.marginBottom) || 0;
            let h = b.getBoundingClientRect().height / S.escala;
            let pg = Math.floor((top + 0.5) / PG.P);
            let alvo = null;
            const ehTexto = b.tagName !== 'TR' && !b.classList.contains('ra-pgbreak') && !/^H[1-6]$/.test(b.tagName) && (b.textContent || '').trim().length > 0;
            if (top > pg * PG.P + PG.CH - 1) alvo = (pg + 1) * PG.P;                           // começou na faixa de rodapé/cabeçalho
            else if (top + h > pg * PG.P + PG.CH + 0.5 && !ehTexto && h < PG.CH) alvo = (pg + 1) * PG.P;   // título/bloco sem texto que não cabe: vai pra próxima
            if (forcarPag !== null && (alvo === null ? top : alvo) < forcarPag * PG.P) alvo = forcarPag * PG.P;
            if (alvo !== null && alvo > top + 0.5 && b.tagName === 'TR') {
                const sr = document.createElement('tr'); sr.className = 'ra-sp'; sr.setAttribute('contenteditable', 'false');
                const td = document.createElement('td'); td.colSpan = Math.max(1, b.cells.length); td.style.cssText = 'border:none !important;padding:0 !important;background:none !important;height:' + Math.round(alvo - top) + 'px;';
                sr.appendChild(td); b.parentNode.insertBefore(sr, b); top = alvo; pg = Math.round(alvo / PG.P); h = b.getBoundingClientRect().height / S.escala;
            } else if (alvo !== null && alvo > top + 0.5) { b.style.paddingTop = Math.round(alvo - top) + 'px'; b.setAttribute('data-ra', '1'); top = alvo; pg = Math.round(alvo / PG.P); h = b.getBoundingClientRect().height / S.escala; }
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
        paginas = Math.max(paginas, paginasMinimas(ed));
        (S.atual.imagens || []).forEach((i) => { paginas = Math.max(paginas, (i.page || 0) + 1); });
        S.paginas = paginas;
        montarPaginas(paginas);
        posicionarImagens();
        restaurarCursor(ed, cursor);
        if (cenaP && cenaP.scrollTop !== rolaCena) cenaP.scrollTop = rolaCena;
        if (window.scrollY !== rolaJanela) window.scrollTo(window.scrollX, rolaJanela);
    }

    function headerFooterHtml(n, total) {
        return `<div class="ra-area"></div><img class="ra-marca" src="${MARCA}" alt="">
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
            let bt = $('ra-pgbtns'); if (bt) bt.remove();
            if (!S.somenteLeitura) {
                bt = document.createElement('div'); bt.id = 'ra-pgbtns'; bt.className = 'ra-pgbtns';
                for (let n = 0; n < total; n++) {
                    const x = document.createElement('button'); x.type = 'button'; x.className = 'ra-pgdel'; x.style.top = (n * PG.P + 10) + 'px';
                    x.title = 'Excluir a página ' + (n + 1); x.innerHTML = '🗑 Excluir página';
                    x.addEventListener('mousedown', (e) => e.preventDefault());
                    x.addEventListener('click', () => excluirPagina(n));
                    bt.appendChild(x);
                }
                stage.appendChild(bt);
            }
        }
        const altura = total * PG.P - PG.GAP;
        stage.style.height = altura + 'px';
        $('ra-ed').style.height = (altura - PG.TOP) + 'px';
        $('ra-ed').style.minHeight = '0';
        $('ra-escala').style.height = (altura * S.escala) + 'px';
        $('ra-escala').style.width = (PG.W * S.escala) + 'px';
    }

    // a barra de edição fica presa logo abaixo do cabeçalho fixo do sistema (a altura dele é lida na hora, sem chutar)
    function ajustarBarraFixa() {
        const bar = $('ra-barra'), ph = $('ra-barra-ph'); if (!bar || !ph) return;
        const h = document.querySelector('.top-header');
        const limite = Math.ceil((h ? Math.max(0, h.getBoundingClientRect().bottom) : 0) + 6);
        const natural = bar.classList.contains('presa') ? (parseFloat(ph.style.height) || bar.offsetHeight) : bar.offsetHeight;
        const pr = ph.getBoundingClientRect();
        const presa = pr.top < limite && !S.somenteLeitura;
        if (presa) {
            ph.style.height = natural + 'px';
            bar.classList.add('presa'); bar.style.top = limite + 'px'; bar.style.left = pr.left + 'px'; bar.style.width = pr.width + 'px';
        } else {
            bar.classList.remove('presa'); bar.style.top = bar.style.left = bar.style.width = ''; ph.style.height = '';
        }
        S.barraTopo = presa ? limite + bar.offsetHeight + 8 : limite;
        const cena = $('ra-cena');
        if (cena) { const mh = Math.max(320, window.innerHeight - limite - natural - 24) + 'px'; if (cena.style.maxHeight !== mh) cena.style.maxHeight = mh; }
        agendarFlut();
    }
    function agendarBarraFixa() { if (S.rafBarra) return; S.rafBarra = requestAnimationFrame(() => { S.rafBarra = 0; ajustarBarraFixa(); }); }

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

    // ---------------------------------------------------------------- Assinatura / carimbo (os mesmos de "Assinar Documento")
    function medirImagem(src) {
        return new Promise((res, rej) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth || 1, h: im.naturalHeight || 1 }); im.onerror = () => rej(new Error('não consegui carregar a imagem')); im.src = src; });
    }
    // desenha: [assinatura] / linha / NOME / Gestor(a) — Unidade (fundo transparente)
    async function comporBlocoAssinatura(urlAssin) {
        await resolverNomeGestor();
        const E = 3, W = 420, H_ASSIN = urlAssin ? 110 : 50;
        let im = null;
        if (urlAssin) {
            im = await new Promise((res) => { const x = new Image(); x.crossOrigin = 'anonymous'; x.onload = () => res(x); x.onerror = () => res(null); x.src = urlAssin; });
            if (!im) throw new Error('não consegui carregar a imagem da sua assinatura. Tente de novo em instantes.');
        }
        const nome = String(nomeGestor() || '').toUpperCase();
        const un = juntar(valoresMulti('ra-unidade')) || String((S.atual && S.atual.unidade) || '');
        const papel = 'Gestor(a) responsável';
        const H = H_ASSIN + 18 + 30 + 26 + (un ? 24 : 0) + 8;
        const montar = (usarImg) => {
            const c = document.createElement('canvas'); c.width = W * E; c.height = H * E;
            const x = c.getContext('2d'); x.scale(E, E);
            if (usarImg && im) {
                const e = Math.min((W - 40) / im.naturalWidth, H_ASSIN / im.naturalHeight);
                const w = im.naturalWidth * e, h = im.naturalHeight * e;
                x.drawImage(im, (W - w) / 2, H_ASSIN - h, w, h);
            }
            const yl = H_ASSIN + 6;
            x.strokeStyle = '#111'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(40, yl); x.lineTo(W - 40, yl); x.stroke();
            x.fillStyle = '#111'; x.textAlign = 'center';
            let f = 19; x.font = '700 ' + f + 'px Calibri, Carlito, Arial, sans-serif';
            while (x.measureText(nome).width > W - 30 && f > 11) { f--; x.font = '700 ' + f + 'px Calibri, Carlito, Arial, sans-serif'; }
            x.fillText(nome, W / 2, yl + 26);
            x.font = '400 15px Calibri, Carlito, Arial, sans-serif';
            let t = papel; while (x.measureText(t).width > W - 30 && t.length > 8) t = t.slice(0, -2);
            x.fillText(t === papel ? t : t + '…', W / 2, yl + 48);
            if (un) { x.font = '400 13px Calibri, Carlito, Arial, sans-serif'; let u = un; while (x.measureText(u).width > W - 30 && u.length > 8) u = u.slice(0, -2); x.fillText(u === un ? u : u + '…', W / 2, yl + 68); }
            return c;
        };
        const paraBlob = (c) => new Promise((res, rej) => { try { c.toBlob((b) => b ? res(b) : rej(new Error('falha')), 'image/png'); } catch (e) { rej(e); } });
        let blob;
        try { blob = await paraBlob(montar(true)); }
        catch (e) { throw new Error('não consegui incorporar a imagem da sua assinatura (bloqueio do navegador). Tente de novo.'); }
        return { blob, w: W, h: H };
    }

    async function assinar(tipo) {
        if (S.somenteLeitura) return;
        try {
            const cena = $('ra-cena'); const visTop = cena ? cena.scrollTop / S.escala : 0;
            const pg = Math.max(0, Math.min((S.paginas || 1) - 1, Math.floor((visTop + 300) / PG.P)));
            let reg;
            if (tipo === 'assinatura') {
                const cfg = (typeof usuarioAtual !== 'undefined' && usuarioAtual && usuarioAtual.assinatura_admin) || {};
                const temAssin = !!cfg.assinatura_url;
                if (!temAssin) {
                    // aviso com atalho pra cadastrar (ver window.mostrarAvisoAssinaturaNaoCadastrada em index.html)
                    if (typeof window.mostrarAvisoAssinaturaNaoCadastrada === 'function') {
                        const escolha = await window.mostrarAvisoAssinaturaNaoCadastrada();
                        if (escolha === 'ir') {
                            try { coletar(); await salvar(false); } catch (e) { /* o rascunho também é salvo automaticamente */ }
                            if (typeof window.irCadastrarAssinaturaDaEscala === 'function') window.irCadastrarAssinaturaDaEscala();
                        }
                    } else alerta('Sua assinatura ainda não foi cadastrada. Cadastre em Edição de Documentos › Assinar Documento e tente de novo.', 'aviso');
                    return;   // sem assinatura cadastrada não insere nada (nem só a linha com o nome)
                }
                // monta, numa imagem só: assinatura + linha + nome (+ cargo da unidade), pronta para arrastar para onde quiser
                const bloco = await comporBlocoAssinatura(temAssin ? cfg.assinatura_url : null);
                const w = 300, h = Math.round(w * bloco.h / bloco.w);
                const local = URL.createObjectURL(bloco.blob);
                S.atual.imagens = (S.atual.imagens || []).filter((x) => x.tipo !== 'assinatura');   // uma assinatura do gestor por relatório
                reg = { id: novoId(), url: local, page: pg, x: Math.round((PG.W - w) / 2), y: Math.min(PG.TOP + PG.CH - h - 14, PG.TOP + 560), w, h, subindo: true, tipo: 'assinatura' };
                S.atual.imagens.push(reg); desenharImagens(); paginar(); sujo();
                const urls = await subirDocumentos(pastaGestor(), [new File([bloco.blob], 'assinatura-gestor.png', { type: 'image/png' })]);
                reg.url_remota = urls[0]; delete reg.subindo; sujo();
                return;
            } else {
                if (typeof window._gerarImagemCarimboPadrao !== 'function' || typeof window._empresaCarimboPadrao !== 'function') return alerta('O carimbo não está disponível nesta tela.', 'aviso');
                if (typeof window._resolverNomeCarimboAdmin === 'function') await window._resolverNomeCarimboAdmin();
                const empresa = window._empresaCarimboPadrao();
                const dataUrl = empresa ? window._gerarImagemCarimboPadrao(empresa) : null;
                if (!dataUrl) return alerta('Não encontrei um carimbo cadastrado para a sua empresa.', 'aviso');
                const w = 250, h = Math.round(w * 190 / 480);
                const blob = await (await fetch(dataUrl)).blob();
                reg = { id: novoId(), url: URL.createObjectURL(blob), page: pg, x: PG.LEFT + 10, y: PG.TOP + PG.CH - h - 20, w, h, subindo: true, tipo: 'carimbo' };
                S.atual.imagens.push(reg); desenharImagens(); paginar(); sujo();
                const urls = await subirDocumentos(pastaGestor(), [new File([blob], 'carimbo.png', { type: 'image/png' })]);
                reg.url_remota = urls[0]; delete reg.subindo; sujo();
                return;
            }
            S.atual.imagens.push(reg); desenharImagens(); paginar(); sujo();
        } catch (e) { alerta('Não consegui inserir: ' + e.message, 'erro'); }
    }

    function desenharImagens() {
        const c = $('ra-imgs'); if (!c) return;
        c.innerHTML = '';
        (S.atual.imagens || []).forEach((i) => {
            const d = document.createElement('div'); d.className = 'ra-img'; d.dataset.id = i.id;
            const src = i.url_remota || i.url;
            d.innerHTML = `<img src="${esc(src)}" alt="" crossorigin="anonymous">` + (S.somenteLeitura ? '' : '<button class="del" type="button" title="Remover imagem">×</button><button class="g90" type="button" title="Girar 90°">↻</button><span class="gira" title="Arraste para girar (segure Alt para girar livre)"></span><span class="alca"></span>');
            c.appendChild(d);
            if (!S.somenteLeitura) ligarImagem(d, i);
        });
        posicionarImagens();
        atualizarBotaoEnviar();
    }
    function posicionarImagens() {
        document.querySelectorAll('#ra-imgs .ra-img').forEach((d) => {
            const i = (S.atual.imagens || []).find((x) => x.id === d.dataset.id); if (!i) return;
            d.style.left = i.x + 'px'; d.style.top = (i.page * PG.P + i.y) + 'px'; d.style.width = i.w + 'px'; d.style.height = i.h + 'px'; d.style.transform = '';
            const im = d.querySelector('img'); if (im) im.style.transform = i.rot ? 'rotate(' + i.rot + 'deg)' : '';   // só a figura gira; moldura e botões ficam sempre no mesmo lugar
            posicionarBotoesImg(d, i);
        });
    }
    // os botões acompanham a borda da figura girada, sempre nas mesmas posições da tela: canto superior esquerdo (↻ 90°), superior direito (X) e inferior direito (redimensionar)
    function posicionarBotoesImg(d, i) {
        const w = i.w, h = i.h, t = (i.rot || 0) * Math.PI / 180, co = Math.cos(t), si = Math.sin(t);
        const pt = (x, y) => ({ x: w / 2 + x * co - y * si, y: h / 2 + x * si + y * co });
        const cantos = [pt(-w / 2, -h / 2), pt(w / 2, -h / 2), pt(w / 2, h / 2), pt(-w / 2, h / 2)];
        const melhor = (f, fora) => cantos.filter((c) => !fora.includes(c)).reduce((a, c) => (f(c) > f(a) ? c : a));   // cada botão num canto diferente
        const iD = melhor((c) => c.x + c.y, []), sD = melhor((c) => c.x - c.y, [iD]), sE = melhor((c) => -(c.x + c.y), [iD, sD]);
        const por = (sel, c, r) => { const e = d.querySelector(sel); if (!e) return; e.style.left = (c.x - r) + 'px'; e.style.top = (c.y - r) + 'px'; e.style.right = 'auto'; e.style.bottom = 'auto'; e.style.marginLeft = '0'; };
        por('.g90', sE, 12); por('.del', sD, 12); por('.alca', iD, 7.5);
        // bolinha de girar: no meio da borda que ficou mais alta, um pouco para fora
        const meios = [{ x: 0, y: -h / 2 }, { x: w / 2, y: 0 }, { x: 0, y: h / 2 }, { x: -w / 2, y: 0 }].map((m) => ({ m, p: pt(m.x, m.y) }));
        const topo = meios.reduce((a, c) => (c.p.y < a.p.y ? c : a));
        const ox = topo.p.x - w / 2, oy = topo.p.y - h / 2, n = Math.hypot(ox, oy) || 1;
        const g = d.querySelector('.gira');
        if (g) { g.style.left = (topo.p.x + ox / n * 26 - 8) + 'px'; g.style.top = (topo.p.y + oy / n * 26 - 8) + 'px'; g.style.marginLeft = '0'; g.style.transform = 'rotate(' + (Math.atan2(oy, ox) * 180 / Math.PI + 90) + 'deg)'; }
    }
    function fecharSelecaoImg(e) {
        if (e.target.closest && (e.target.closest('.ra-img') || e.target.closest('#ra-barra'))) return;
        document.querySelectorAll('.ra-img.sel').forEach((x) => x.classList.remove('sel')); S.imgSel = null; limparGuias();
    }
    // ---- guias inteligentes (como nos editores): alinhar ao centro da página, às margens e às outras imagens; igualar tamanhos
    const LIMIAR = 6;
    function limparGuias() { document.querySelectorAll('#ra-imgs .ra-guia, #ra-imgs .ra-guia-tag').forEach((g) => g.remove()); document.querySelectorAll('.ra-img.igual').forEach((x) => x.classList.remove('igual')); }
    function guiaV(x) { const c = $('ra-imgs'); const g = document.createElement('div'); g.className = 'ra-guia v'; g.style.left = Math.round(x) + 'px'; g.style.height = '100%'; c.appendChild(g); }
    function guiaH(y) { const c = $('ra-imgs'); const g = document.createElement('div'); g.className = 'ra-guia h'; g.style.top = Math.round(y) + 'px'; c.appendChild(g); }
    function etiqueta(x, y, t) { const c = $('ra-imgs'); const g = document.createElement('div'); g.className = 'ra-guia-tag'; g.style.left = Math.round(x) + 'px'; g.style.top = Math.round(y) + 'px'; g.textContent = t; c.appendChild(g); }
    // melhor ajuste: cand = posições da imagem que está sendo movida; alvos = [{v, tipo}]; devolve {delta, alvo}
    function melhorAjuste(cand, alvos) {
        let melhor = null;
        cand.forEach((c) => alvos.forEach((a) => { const dlt = a.v - c; if (Math.abs(dlt) <= LIMIAR && (!melhor || Math.abs(dlt) < Math.abs(melhor.delta))) melhor = { delta: dlt, alvo: a.v }; }));
        return melhor;
    }

    function ligarImagem(d, i) {
        d.addEventListener('pointerdown', (e) => {
            if (e.target.classList.contains('del') || e.target.classList.contains('g90')) return;
            e.preventDefault(); e.stopPropagation();
            if (e.target.classList.contains('gira')) {
                document.querySelectorAll('.ra-img.sel').forEach((x) => x.classList.remove('sel')); d.classList.add('sel'); S.imgSel = i.id;
                d.setPointerCapture(e.pointerId);
                const girar = (ev) => {
                    const r = d.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                    let a = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90;
                    a = ((a % 360) + 360) % 360;
                    limparGuias();
                    if (!ev.altKey) { const q = Math.round(a / 15) * 15; if (Math.abs(q - a) <= 5) a = q; }
                    a = Math.round(a * 10) / 10; if (a >= 359.95) a = 0;
                    i.rot = a; posicionarImagens();
                    etiqueta(i.x + i.w + 8, i.page * PG.P + i.y - 24, Math.round(a) + '°');
                };
                const fim = () => { limparGuias(); d.removeEventListener('pointermove', girar); d.removeEventListener('pointerup', fim); d.removeEventListener('pointercancel', fim); sujo(); };
                d.addEventListener('pointermove', girar); d.addEventListener('pointerup', fim); d.addEventListener('pointercancel', fim);
                return;
            }
            document.querySelectorAll('.ra-img.sel').forEach((x) => x.classList.remove('sel')); d.classList.add('sel'); S.imgSel = i.id;
            const redim = e.target.classList.contains('alca');
            const x0 = e.clientX, y0 = e.clientY, ix = i.x, iy = i.page * PG.P + i.y, iw = i.w, ih = i.h, ratio = iw / ih;
            limparGuias(); S.arrastando = true; agendarFlut();
            d.setPointerCapture(e.pointerId);
            // posição do mouse em coordenadas da folha (considera rolagem e zoom a cada movimento)
            const noPalco = (ev) => { const r = $('ra-stage').getBoundingClientRect(); return { x: (ev.clientX - r.left) / S.escala, y: (ev.clientY - r.top) / S.escala }; };
            const p0 = noPalco(e); let ultimo = e, raf = 0, moveu = false; const pagAntes = i.page;
            const mover = (ev) => {
                ultimo = ev;
                if (!moveu) { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return; moveu = true; }   // só um clique: não mexe em nada nem rola a tela
                const pn = noPalco(ev);
                const dx = pn.x - p0.x, dy = pn.y - p0.y;
                const snap = !ev.altKey;   // segurar Alt desliga o "ímã"
                limparGuias();
                if (redim) {
                    i.w = Math.max(30, Math.min(PG.W - i.x, iw + dx)); i.h = i.w / ratio;
                    if (snap) {
                        const outros = (S.atual.imagens || []).filter((o) => o.id !== i.id && o.page === i.page);
                        // mesmo tamanho que outra imagem (largura ou altura)
                        let igual = null;
                        outros.forEach((o) => {
                            if (Math.abs(o.w - i.w) <= LIMIAR && (!igual || Math.abs(o.w - i.w) < Math.abs(igual.novoW - i.w))) igual = { o, novoW: o.w, tipo: 'largura' };
                            const wPelaAltura = o.h * ratio; if (Math.abs(wPelaAltura - i.w) <= LIMIAR && (!igual || Math.abs(wPelaAltura - i.w) < Math.abs(igual.novoW - i.w))) igual = { o, novoW: wPelaAltura, tipo: 'altura' };
                        });
                        const direita = melhorAjuste([i.x + i.w], [{ v: PG.W / 2 }, { v: PG.W - PG.RIGHT }].concat(outros.map((o) => ({ v: o.x + o.w }))));
                        if (igual) { i.w = igual.novoW; i.h = i.w / ratio; }
                        else if (direita) { i.w += direita.delta; i.h = i.w / ratio; guiaV(direita.alvo); }
                        if (igual) {
                            const el = document.querySelector('#ra-imgs .ra-img[data-id="' + igual.o.id + '"]'); if (el) el.classList.add('igual'); d.classList.add('igual');
                            etiqueta(i.x + i.w + 8, i.page * PG.P + i.y, '= mesmo tamanho (' + igual.tipo + ')');
                        }
                    }
                    i.w = Math.round(i.w); i.h = Math.round(i.w / ratio);
                } else {
                    let nx = Math.max(0, Math.min(PG.W - i.w, ix + dx)), ny = iy + dy;
                    const pg = Math.max(0, Math.min(Math.max(S.paginas, 1) - 1, Math.floor((ny + i.h / 2) / PG.P)));
                    let rel = Math.max(0, Math.min(PG.H - i.h, ny - pg * PG.P));
                    if (snap) {
                        const outros = (S.atual.imagens || []).filter((o) => o.id !== i.id && o.page === pg);
                        const ax = melhorAjuste([nx, nx + i.w / 2, nx + i.w], [{ v: PG.W / 2 }, { v: PG.LEFT }, { v: PG.W - PG.RIGHT }].concat(outros.reduce((a, o) => a.concat([{ v: o.x }, { v: o.x + o.w / 2 }, { v: o.x + o.w }]), [])));
                        if (ax) { nx += ax.delta; guiaV(ax.alvo); }
                        const ay = melhorAjuste([rel, rel + i.h / 2, rel + i.h], [{ v: PG.H / 2 }, { v: PG.TOP }, { v: PG.TOP + PG.CH }].concat(outros.reduce((a, o) => a.concat([{ v: o.y }, { v: o.y + o.h / 2 }, { v: o.y + o.h }]), [])));
                        if (ay) { rel += ay.delta; guiaH(pg * PG.P + ay.alvo); }
                        // mesmo tamanho que a vizinha: só avisa
                        const gemea = outros.find((o) => Math.abs(o.w - i.w) < 2 && Math.abs(o.h - i.h) < 2);
                        if (gemea) { d.classList.add('igual'); const el = document.querySelector('#ra-imgs .ra-img[data-id="' + gemea.id + '"]'); if (el) el.classList.add('igual'); }
                    }
                    i.page = pg; i.x = Math.round(nx); i.y = Math.round(rel);
                }
                posicionarImagens();
            };
            const cenaEl = $('ra-cena');
            const rolou = () => { if (moveu) mover(ultimo); };   // roda a roda do mouse com a imagem presa: ela acompanha a página
            // rolagem automática quando o mouse chega perto da borda da área visível
            const auto = () => {
                const cr = cenaEl.getBoundingClientRect(); const topo = Math.max(cr.top, 90), base = Math.min(cr.bottom, window.innerHeight);
                let v = 0; const y = ultimo.clientY; if (!moveu) { raf = requestAnimationFrame(auto); return; }
                if (y > base - 50) v = Math.min(30, (y - (base - 50)) * 0.6 + 2); else if (y < topo + 50) v = -Math.min(30, ((topo + 50) - y) * 0.6 + 2);
                if (v) { const antes = cenaEl.scrollTop; cenaEl.scrollTop += v; if (cenaEl.scrollTop === antes) window.scrollBy(0, v); }
                raf = requestAnimationFrame(auto);
            };
            const soltar = () => {
                cancelAnimationFrame(raf); limparGuias(); S.arrastando = false;
                d.removeEventListener('pointermove', mover); d.removeEventListener('pointerup', soltar); d.removeEventListener('pointercancel', soltar); d.removeEventListener('lostpointercapture', soltar);
                cenaEl.removeEventListener('scroll', rolou); window.removeEventListener('scroll', rolou);
                sujo();
                // o texto não depende da imagem: só repagina se ela mudou de página (evita o texto "pular" e a tela descer ao soltar)
                if (moveu && i.page !== pagAntes) { const st = cenaEl.scrollTop; paginar(); cenaEl.scrollTop = st; }
            };
            d.addEventListener('pointermove', mover); d.addEventListener('pointerup', soltar); d.addEventListener('pointercancel', soltar); d.addEventListener('lostpointercapture', soltar);
            cenaEl.addEventListener('scroll', rolou); window.addEventListener('scroll', rolou);
            if (!redim) raf = requestAnimationFrame(auto);
        });
        const g90 = d.querySelector('.g90');
        if (g90) g90.addEventListener('click', (e) => { e.stopPropagation(); i.rot = (((i.rot || 0) + 90) % 360); posicionarImagens(); sujo(); });
        const del = d.querySelector('.del');
        if (del) del.addEventListener('click', (e) => { e.stopPropagation(); S.atual.imagens = S.atual.imagens.filter((x) => x.id !== i.id); desenharImagens(); sujo(); paginar(); });
    }

    // ---------------------------------------------------------------- Salvar
    function html() {
        const ed = $('ra-ed'); const c = ed.cloneNode(true);
        c.querySelectorAll('.ra-sp,[data-ra-m]').forEach((x) => x.remove());
        c.querySelectorAll('[data-ra]').forEach((b) => { b.style.paddingTop = ''; b.removeAttribute('data-ra'); if (!b.getAttribute('style')) b.removeAttribute('style'); });
        c.normalize();
        return c.innerHTML;
    }
    function coletar() {
        const r = S.atual;
        r.titulo = ($('ra-titulo').value || '').trim() || 'Relatório de Atividades';
        r.mes_referencia = $('ra-mes').value || null; r.unidade = juntar(valoresMulti('ra-unidade')) || null; r.cargo = juntar(valoresMulti('ra-cargo')) || null;
        r.conteudo_html = html();
        return r;
    }
    function payload(r) {
        return {
            gestor_id: idGestor(), gestor_nome: nomeGestor(), titulo: r.titulo, mes_referencia: r.mes_referencia, unidade: r.unidade, conteudo_html: r.conteudo_html, ...(r.cargo !== undefined && !S.semColunaCargo ? { cargo: r.cargo } : {}),
            imagens: (r.imagens || []).map((i) => ({ id: i.id, url: i.url_remota || i.url, page: i.page, x: i.x, y: i.y, w: i.w, h: i.h, ...(i.rot ? { rot: i.rot } : {}), ...(i.tipo ? { tipo: i.tipo } : {}) })),
            atualizado_em: new Date().toISOString()
        };
    }

    async function salvar(mostrar) {
        if (S.somenteLeitura || S.salvando) return true;
        if ((S.atual.imagens || []).some((i) => i.subindo)) { if (mostrar) alerta('Aguarde o envio das imagens terminar.', 'aviso'); return false; }
        S.salvando = true;
        try {
            await resolverNomeGestor();
            const r = coletar();
            const gravar = async (p) => {
                if (r.id) return await supabaseClient.from('relatorios_atividades').update(p).eq('id', r.id).eq('gestor_id', idGestor());
                const res = await supabaseClient.from('relatorios_atividades').insert({ ...p, status: 'rascunho' }).select('id').single();
                if (!res.error) r.id = res.data.id;
                return res;
            };
            let res = await gravar(payload(r));
            // coluna "cargo" ainda não criada no banco: salva sem ela (o cargo continua no texto do relatório)
            if (res.error && /cargo/i.test(res.error.message || '') && /(column|schema cache|coluna)/i.test(res.error.message || '')) { S.semColunaCargo = true; res = await gravar(payload(r)); }
            if (res.error) throw res.error;
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
                pag.querySelectorAll('.ra-area').forEach((a) => a.remove());
                const janela = document.createElement('div'); janela.style.cssText = 'position:absolute; left:' + PG.LEFT + 'px; top:' + PG.TOP + 'px; width:' + PG.CW + 'px; height:' + PG.CH + 'px; overflow:hidden;';
                const copia = ed.cloneNode(true); copia.removeAttribute('contenteditable'); copia.removeAttribute('id');
                copia.style.cssText = 'position:absolute; left:0; top:' + (-n * PG.P) + 'px; width:' + PG.CW + 'px; height:auto;';
                copia.querySelectorAll('.ra-pgbreak').forEach((b) => { b.style.visibility = 'hidden'; });
                janela.appendChild(copia); pag.appendChild(janela);
                imgs.filter((i) => i.page === n).forEach((i) => {
                    const im = document.createElement('img'); im.crossOrigin = 'anonymous'; im.src = i.url_remota || i.url;
                    im.style.cssText = 'position:absolute; left:' + i.x + 'px; top:' + i.y + 'px; width:' + i.w + 'px; height:' + i.h + 'px; z-index:10;' + (i.rot ? 'transform:rotate(' + i.rot + 'deg);' : '');
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

    function relatorioAssinado() { return (S.atual.imagens || []).some((i) => i.tipo === 'assinatura'); }
    function atualizarBotaoEnviar() {
        const b = $('ra-btn-env'); if (!b || S.somenteLeitura) return;
        const ok = relatorioAssinado();
        b.style.opacity = ok ? '' : '.55';
        b.title = ok ? 'Gera o PDF e envia ao financeiro' : 'Só é possível enviar depois de assinar o relatório (botão "Assinatura")';
        const h = $('ra-aviso-assin'); if (h) h.style.display = ok ? 'none' : '';
    }
    async function enviar() {
        if (S.pdfGerando || S.somenteLeitura) return;
        if (!valoresMulti('ra-unidade').length) return alerta('Selecione a unidade deste relatório antes de enviar ao financeiro.', 'aviso');
        if (!relatorioAssinado()) return alerta('Para enviar ao financeiro o relatório precisa estar <b>assinado</b>. Clique em "Assinatura" na barra de edição e posicione a sua assinatura no documento.', 'aviso', 'Falta assinar');
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
                .update({ pdf_url: url, status: 'enviado', enviado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(), ...('motivo_devolucao' in S.atual ? { motivo_devolucao: null } : {}) })
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
        clearInterval(S.timerAuto); S.atual = null; S.dirty = false; const fl = $('ra-flut'); if (fl) fl.remove();
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
    document.addEventListener('pointerdown', (e) => { if (!(e.target.closest && e.target.closest('.ra-img'))) limparGuias(); }, true);
    document.addEventListener('mousedown', (e) => { document.querySelectorAll('details.ra-ms[open]').forEach((d) => { if (!d.contains(e.target)) d.removeAttribute('open'); }); }, true);
    window.addEventListener('scroll', agendarBarraFixa, true);
    window.addEventListener('scroll', agendarFlut, true);
    window.addEventListener('resize', agendarFlut);
    window.addEventListener('resize', agendarBarraFixa);
    window.addEventListener('resize', () => { if ($('ra-cena') && S.zoom === 'auto') { ajustarEscala(); paginar(); } });
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-target="tela-relatorio-atividades"]')) setTimeout(iniciar, 30); });

    window.RelAtv = { iniciar, novo, abrir, duplicar, excluir, voltar, salvar, baixar, enviar, cmd, bloco, tamanho, cor, quebra, excluirPagina, imagens, assinar, filtrarLista, buscarLista, mudarUnidade, mudarCargo, _modalUnidades: null, abrirTabela, inserirTabela, tab: tabela, zoom, sujo, _estado: S, _paginar: paginar, _geom: PG };
})();
