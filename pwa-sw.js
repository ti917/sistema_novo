// Service worker mínimo: existe só para o navegador permitir "instalar o app".
// NÃO guarda nada em cache e NÃO interfere nas requisições — o sistema continua 100% online, igual hoje.
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(){ /* sem respondWith: o navegador faz a requisição normal */ });
