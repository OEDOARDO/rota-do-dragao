// Deixa o Rota do Dragão abrir sem internet e ser instalado no celular.
// A página vem sempre da rede quando dá (para pegar as atualizações) e do cache quando não dá.
var CACHE = "rota-do-dragao-v2";
var ARQUIVOS = ["./", "./index.html", "./icone.svg", "./icone-192.png", "./icone-512.png", "./og.png", "./manifest.webmanifest"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
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
    e.respondWith(fetch(req, { cache: "no-cache" }).then(function (r) {
      var copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put("./index.html", copia); });
      return r;
    }).catch(function () { return caches.match("./index.html"); }));
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
