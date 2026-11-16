/* Visualizador de documentos DENTRO do sistema (RH) — v1
   Links que abriam PDF/foto em outra aba passam a abrir numa janela por cima da tela.
   Dentro dela tem "Abrir em nova aba" e "Baixar". Só mexe em links de arquivo (PDF/foto)
   guardados no Supabase; qualquer outro link (WhatsApp, Forms, ilovepdf, Word/Excel...) abre como sempre. */
(function () {
  'use strict';
  var SUPA = 'kefvwdxebzgedugqeimz.supabase.co';

  function tipoPorNome(nome, mime) {
    var n = String(nome || '').split('?')[0].toLowerCase(), m = String(mime || '').toLowerCase();
    if (m === 'application/pdf' || /\.pdf$/.test(n)) return 'pdf';
    if (m.indexOf('image/') === 0 || /\.(png|jpe?g|gif|webp|bmp)$/.test(n)) return 'imagem';
    return 'outro';
  }
  // devolve {tipo, nome} se a URL é de um arquivo do nosso Supabase que dá pra mostrar na tela; senão null
  function analisarUrl(href) {
    try {
      var u = new URL(href, location.href);
      if (u.hostname !== SUPA || u.pathname.indexOf('/storage/v1/object/') !== 0) return null;
      if (u.searchParams.has('download')) return null;               // "Baixar..." continua baixando
      var nome = decodeURIComponent(u.pathname.split('/').pop() || '');
      var tipo = tipoPorNome(nome);
      return tipo === 'outro' ? null : { tipo: tipo, nome: nome || 'Documento' };
    } catch (e) { return null; }
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function fechar() {
    var m = document.getElementById('visualizador-doc-sistema');
    if (m) {
      var b = m.getAttribute('data-blob-url'); if (b) { try { URL.revokeObjectURL(b); } catch (e) {} }
      m.remove();
    }
    document.removeEventListener('keydown', onEsc, true);
    document.documentElement.style.overflow = m && m.getAttribute('data-overflow') || '';
  }
  function onEsc(ev) { if (ev.key === 'Escape') { ev.stopPropagation(); fechar(); } }

  /** url: https do Supabase ou blob:. tipo: 'pdf' | 'imagem'. blobTemp: true se a url é um blob que o visualizador deve limpar ao fechar. */
  function abrir(url, nome, tipo, blobTemp) {
    fechar();
    var cor = tipo === 'imagem' ? '#3498db' : '#e74c3c';
    var h = ''
      + '<div id="visualizador-doc-sistema" style="position:fixed;inset:0;z-index:2000000;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;">'
      + '<div style="width:100%;max-width:1150px;height:94vh;display:flex;flex-direction:column;overflow:hidden;border-radius:14px;background:#00152b;border:1px solid rgba(255,255,255,.12);border-top:4px solid var(--cor-acento,#ffc107);box-shadow:0 20px 60px rgba(0,0,0,.6);">'
      +   '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.1);flex-wrap:wrap;color:#e8eef7;font-family:inherit;">'
      +     '<i class="fa-solid ' + (tipo === 'imagem' ? 'fa-file-image' : 'fa-file-pdf') + '" style="color:' + cor + ';"></i>'
      +     '<strong style="flex:1;min-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.9rem;">' + esc(nome || 'Documento') + '</strong>'
      +     '<a data-sem-visualizador="1" href="' + esc(url) + '" target="_blank" rel="noopener" style="padding:7px 12px;font-size:.78rem;text-decoration:none;color:var(--cor-acento,#ffc107);border:1px solid var(--cor-acento,#ffc107);border-radius:8px;background:rgba(255,193,7,.08);font-weight:700;"><i class="fa-solid fa-up-right-from-square"></i> Abrir em nova aba</a>'
      +     '<a data-sem-visualizador="1" href="' + esc(url) + '" download="' + esc(nome || 'documento') + '" style="padding:7px 12px;font-size:.78rem;text-decoration:none;color:#e8eef7;border:1px solid rgba(255,255,255,.25);border-radius:8px;font-weight:700;"><i class="fa-solid fa-download"></i> Baixar</a>'
      +     '<button type="button" data-fechar="1" title="Fechar (Esc)" style="background:none;border:0;color:#9fb0c8;cursor:pointer;font-size:1.4rem;line-height:1;"><i class="fa-solid fa-xmark"></i></button>'
      +   '</div>'
      +   '<div id="visualizador-doc-corpo" style="flex:1;min-height:0;position:relative;background:#111;">'
      +     '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#9fb0c8;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>'
      +   '</div>'
      + '</div></div>';
    document.body.insertAdjacentHTML('beforeend', h);
    var m = document.getElementById('visualizador-doc-sistema');
    m.setAttribute('data-overflow', document.documentElement.style.overflow || '');
    document.documentElement.style.overflow = 'hidden';
    if (blobTemp) m.setAttribute('data-blob-url', url);
    m.addEventListener('click', function (ev) { if (ev.target === m || (ev.target.closest && ev.target.closest('[data-fechar]'))) fechar(); });
    document.addEventListener('keydown', onEsc, true);
    var corpo = document.getElementById('visualizador-doc-corpo');
    function mostrarImg(src) { if (!document.body.contains(corpo)) return; corpo.innerHTML = '<div style="position:absolute;inset:0;overflow:auto;display:flex;align-items:flex-start;justify-content:center;"><img src="' + esc(src) + '" alt="' + esc(nome) + '" style="max-width:100%;height:auto;display:block;"></div>'; }
    function mostrarPdf(src) { if (!document.body.contains(corpo)) return; corpo.innerHTML = '<iframe src="' + esc(src) + '" title="' + esc(nome) + '" style="position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff;"></iframe>'; }
    if (tipo === 'imagem') { mostrarImg(url); return; }
    if (/^blob:/.test(url)) { mostrarPdf(url); return; }
    // PDF guardado: baixa os bytes e mostra com o tipo certo (assim o navegador não "baixa" em vez de mostrar)
    fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); }).then(function (b) {
      if (!document.body.contains(corpo)) return;
      var u = URL.createObjectURL(new Blob([b], { type: 'application/pdf' }));
      var mm = document.getElementById('visualizador-doc-sistema'); if (mm) mm.setAttribute('data-blob-url', u); else { URL.revokeObjectURL(u); return; }
      mostrarPdf(u);
    }).catch(function () { mostrarPdf(url); });
  }

  /** Abre dentro do sistema se for PDF/foto; senão abre em nova aba como antes. Devolve true se abriu no visualizador. */
  window.abrirDocumentoNoSistema = function (url, nome, tipo, blobTemp) {
    try {
      if (/^blob:/.test(String(url))) {
        var t = tipo || tipoPorNome(nome);
        if (t !== 'outro') { abrir(url, nome || 'Documento', t, !!blobTemp); return true; }
      } else {
        var a = analisarUrl(url);
        if (a) { abrir(url, a.nome, a.tipo, false); return true; }
      }
    } catch (e) { console.warn('Visualizador:', e); }
    window.open(url, '_blank');
    return false;
  };
  window.fecharVisualizadorDocumento = fechar;

  // Clique em qualquer link de arquivo que abriria em nova aba -> abre no visualizador
  document.addEventListener('click', function (ev) {
    try {
      if (ev.defaultPrevented || ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
      var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
      if (!a || a.hasAttribute('data-sem-visualizador') || a.hasAttribute('download')) return;
      if ((a.getAttribute('target') || '') !== '_blank') return;
      var info = analisarUrl(a.href);
      if (!info) return;
      ev.preventDefault();
      abrir(a.href, info.nome, info.tipo, false);
    } catch (e) { /* se algo falhar, o link abre normal em nova aba */ }
  }, true);
})();
