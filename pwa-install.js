/* Aviso de "Instalar o app" (RH, Financeiro e Comercial) — v1
   - Aparece ao entrar, se o navegador permitir instalar (PC e celular).
   - Fechou: só avisa de novo depois de 14 dias. Instalou: não aparece mais.
   - Não mexe em nenhum dado nem em nenhuma tela do sistema; é só um cartão flutuante. */
(function(){
  'use strict';
  try {
    if (window.top !== window.self) return;                         // dentro de iframe não mostra
    var path = (location.pathname || '').toLowerCase();
    var sis = path.indexOf('financeiro') >= 0 ? 'financeiro' : (path.indexOf('comercial') >= 0 ? 'comercial' : 'rh');
    var NOMES = { rh: 'RH Soul', financeiro: 'Financeiro Soul', comercial: 'Comercial Soul' };
    var COR = { rh: ['#ff7a1a', '#d6400a'], financeiro: ['#22c586', '#0b805c'], comercial: ['#29b6f6', '#1565c0'] }[sis];
    var K_FECHOU = 'pwa_fechou_' + sis, K_INSTALOU = 'pwa_instalou_' + sis, DIAS = 14;

    function ls(a, k, v){ try { if (a === 'g') return localStorage.getItem(k); if (a === 's') localStorage.setItem(k, v); } catch(e){} return null; }

    var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    if (standalone) { ls('s', K_INSTALOU, '1'); return; }              // já está rodando como app
    if (ls('g', K_INSTALOU) === '1') return;                            // já instalou antes
    var ua = navigator.userAgent || '';
    if (/\bwv\b|; wv\)|Soul ?Gest/i.test(ua)) return;                  // dentro do app Android/WebView não mostra

    var fechou = parseInt(ls('g', K_FECHOU) || '0', 10);
    if (fechou && (Date.now() - fechou) < DIAS * 86400000) return;      // fechou há menos de 14 dias

    // service worker "vazio" (não guarda nada em cache): só serve para o navegador liberar a instalação
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function(){ navigator.serviceWorker.register('/pwa-sw.js', { scope: '/' }).catch(function(){}); });
    }

    var evento = null, ehIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var ehCelular = /android|iphone|ipad|ipod|mobile/i.test(ua) || ehIOS;

    window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); evento = e; mostrar(); });
    window.addEventListener('appinstalled', function(){ ls('s', K_INSTALOU, '1'); esconder(); });
    if (ehIOS) { window.addEventListener('load', function(){ setTimeout(mostrar, 3000); }); }

    var caixa = null;
    function esconder(){ if (caixa) { caixa.style.opacity = '0'; caixa.style.transform = 'translateY(20px)'; var c = caixa; setTimeout(function(){ if (c.parentNode) c.parentNode.removeChild(c); }, 300); caixa = null; } }
    function fechar(){ ls('s', K_FECHOU, String(Date.now())); esconder(); }

    function mostrar(){
      if (caixa || document.getElementById('pwa-aviso')) return;
      if (ls('g', K_INSTALOU) === '1') return;
      var onde = ehCelular ? 'no seu celular' : 'no seu computador';
      var corpo = ehIOS
        ? 'Toque em <b>Compartilhar</b> <span style="display:inline-block;transform:translateY(2px)">⬆️</span> e depois em <b>“Adicionar à Tela de Início”</b>. Pronto: o ' + NOMES[sis] + ' fica como um aplicativo no seu iPhone.'
        : 'Instale o ' + NOMES[sis] + ' ' + onde + ': abre em janela própria, com atalho na ' + (ehCelular ? 'tela inicial' : 'área de trabalho') + ' e sem precisar procurar o site.';
      var css = document.createElement('style'); css.id = 'pwa-aviso-css';
      css.textContent =
        '#pwa-aviso{position:fixed;z-index:9000;right:22px;bottom:22px;width:min(400px,calc(100vw - 28px));box-sizing:border-box;padding:18px 18px 16px;border-radius:18px;color:#f3f6fb;font-family:Inter,Roboto,Segoe UI,Arial,sans-serif;background:linear-gradient(160deg,rgba(14,26,44,.97),rgba(5,12,24,.98));border:1px solid rgba(255,255,255,.10);box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 0 1px ' + COR[0] + '33;opacity:0;transform:translateY(24px);transition:opacity .35s ease,transform .35s ease}'
      + '#pwa-aviso.on{opacity:1;transform:none}'
      + '#pwa-aviso:before{content:"";position:absolute;left:18px;right:18px;top:0;height:3px;border-radius:0 0 4px 4px;background:linear-gradient(90deg,' + COR[0] + ',' + COR[1] + ')}'
      + '#pwa-aviso .pa-topo{display:flex;gap:14px;align-items:center}'
      + '#pwa-aviso .pa-ic{flex:0 0 auto;width:58px;height:58px;border-radius:15px;box-shadow:0 6px 18px ' + COR[0] + '55}'
      + '#pwa-aviso .pa-t{font-weight:800;font-size:1.02rem;line-height:1.25;margin:0}'
      + '#pwa-aviso .pa-s{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:' + COR[0] + ';font-weight:700;margin:0 0 3px}'
      + '#pwa-aviso .pa-p{font-size:.85rem;line-height:1.5;color:#b8c4d6;margin:12px 0 14px}'
      + '#pwa-aviso .pa-b{display:flex;gap:10px;align-items:center}'
      + '#pwa-aviso .pa-ok{flex:1;border:0;cursor:pointer;padding:11px 16px;border-radius:11px;font-weight:800;font-size:.9rem;color:#fff;background:linear-gradient(135deg,' + COR[0] + ',' + COR[1] + ');box-shadow:0 6px 16px ' + COR[0] + '44;transition:transform .15s}'
      + '#pwa-aviso .pa-ok:hover{transform:translateY(-1px)}'
      + '#pwa-aviso .pa-no{border:0;background:transparent;cursor:pointer;color:#8fa0b8;font-size:.84rem;padding:11px 10px;border-radius:10px}'
      + '#pwa-aviso .pa-no:hover{color:#fff;background:rgba(255,255,255,.06)}'
      + '#pwa-aviso .pa-x{position:absolute;top:10px;right:10px;width:28px;height:28px;border:0;border-radius:50%;cursor:pointer;background:rgba(255,255,255,.06);color:#9fb0c8;font-size:15px;line-height:1}'
      + '#pwa-aviso .pa-x:hover{background:rgba(255,255,255,.14);color:#fff}'
      + '@media (max-width:640px){#pwa-aviso{left:12px;right:12px;bottom:12px;width:auto}}';
      document.head.appendChild(css);
      caixa = document.createElement('div'); caixa.id = 'pwa-aviso'; caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-label', 'Instalar aplicativo');
      caixa.innerHTML =
        '<button class="pa-x" type="button" aria-label="Fechar" title="Fechar">✕</button>'
      + '<div class="pa-topo"><img class="pa-ic" src="/pwa/' + sis + '-192.png" alt=""><div><p class="pa-s">Aplicativo disponível</p><p class="pa-t">Instale o ' + NOMES[sis] + '</p></div></div>'
      + '<p class="pa-p">' + corpo + '</p>'
      + '<div class="pa-b">' + (ehIOS ? '<button class="pa-ok" type="button">Entendi</button>' : '<button class="pa-ok" type="button">⬇ Instalar agora</button><button class="pa-no" type="button">Agora não</button>') + '</div>';
      document.body.appendChild(caixa);
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ if (caixa) caixa.className = 'on'; }); });
      caixa.querySelector('.pa-x').onclick = fechar;
      var no = caixa.querySelector('.pa-no'); if (no) no.onclick = fechar;
      caixa.querySelector('.pa-ok').onclick = function(){
        if (ehIOS || !evento) return fechar();
        var ev = evento; evento = null;
        try {
          ev.prompt();
          ev.userChoice.then(function(r){
            if (r && r.outcome === 'accepted') { ls('s', K_INSTALOU, '1'); esconder(); }
            else fechar();                                               // recusou na janela do navegador: espera 14 dias
          });
        } catch(e){ fechar(); }
      };
    }
  } catch(e) { /* o aviso nunca pode atrapalhar o sistema */ }
})();
