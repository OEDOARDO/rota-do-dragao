// Deixa o Rota do Dragão abrir sem internet e ser instalado no celular.
// A página vem sempre da rede quando dá (para pegar as atualizações) e do cache quando não dá.
var CACHE = "rota-do-dragao-v8";
var ARQUIVOS = ["./", "./index.html", "./icone.svg", "./icone-192.png", "./icone-512.png", "./og.png", "./manifest.webmanifest",
  "./jogo/", "./jogo/jogo.js", "./jogo/jogo.css", "./jogo/manifest.webmanifest", "./jogo/vendor/three.module.min.js", "./cena.js"];

self.addEventListener("install", function (e) {
  // "reload" ignora a cópia do navegador: o cache novo nasce com os arquivos que estão no GitHub agora
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(ARQUIVOS.map(function (u) { return new Request(u, { cache: "reload" }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (nomes) {
    return Promise.all(nomes.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    // "no-cache" faz o navegador conferir com o GitHub se a página mudou, em vez de usar a cópia guardada
    // cada página fica guardada com o próprio endereço (o guia e o jogo não se misturam)
    e.respondWith(fetch(req, { cache: "no-cache" }).then(function (r) {
      if (r.ok) { var copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copia); }); }
      return r;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match("./index.html"); });
    }));
    return;
  }
  // o código do guia e do jogo (js, css, manifest) vem da rede quando dá, para nunca ficar preso numa versão velha;
  // o resto (Three.js, ícones e imagens) quase não muda e sai do cache na hora, atualizando por trás
  var codigo = /\.(js|css|webmanifest|html)$/.test(new URL(req.url).pathname) && !/\/vendor\//.test(req.url);
  if (codigo) {
    e.respondWith(fetch(req, { cache: "no-cache" }).then(function (r) {
      if (r.ok) { var copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copia); }); }
      return r;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (salvo) {
    var rede = fetch(req).then(function (r) {
      if (r.ok) { var copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copia); }); }
      return r;
    }).catch(function () { return salvo; });
    return salvo || rede;
  }));
});
