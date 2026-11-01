/* Rota do Dragão: cena 3D do topo do guia (uma ilhota low-poly com portal e o dragão voando).
   Só baixa o Three.js quando a faixa aparece na tela; fora da tela ou com a aba escondida, para de desenhar.
   Com "reduzir movimento" ligado no aparelho, desenha um quadro só. */
(function () {
  "use strict";
  var caixa = document.getElementById("cena3d"), tela = document.getElementById("cena-tela");
  if (!caixa || !tela || !("IntersectionObserver" in window)) return;
  // com economia de dados ligada, fica só o fundo desenhado no CSS
  if (navigator.connection && navigator.connection.saveData) return;
  var parado = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var iniciado = false, visivel = false;

  new IntersectionObserver(function (es) {
    visivel = es[0].isIntersecting;
    if (visivel && !iniciado) { iniciado = true; carregar(); }
  }, { rootMargin: "200px" }).observe(caixa);

  function carregar() {
    import("./jogo/vendor/three.module.min.js").then(montar).catch(function () { /* sem 3D: fica o fundo desenhado no CSS */ });
  }

  function montar(THREE) {
    var ren;
    try { ren = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true }); } catch (e) { return; }
    var celular = window.matchMedia("(max-width: 700px)").matches;
    ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, celular ? 1.5 : 2));
    ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap;
    ren.outputColorSpace = THREE.SRGBColorSpace; ren.toneMapping = THREE.ACESFilmicToneMapping; ren.toneMappingExposure = 1.1;
    var cena = new THREE.Scene();
    cena.fog = new THREE.Fog(0x16210f, 26, 60);
    var cam = new THREE.PerspectiveCamera(38, 2, 0.1, 200);
    cena.add(new THREE.HemisphereLight(0xc4e0ff, 0x4a3a20, 0.8));
    var sol = new THREE.DirectionalLight(0xffe0b0, 2.3); sol.position.set(10, 16, 6); sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024); var sc = sol.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.far = 50;
    sol.shadow.bias = -0.0006; cena.add(sol);

    // números "aleatórios" fixos, para a ilha ser sempre a mesma
    var semente = 7;
    function rnd() { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; }
    function mat(c, extra) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: 0.85 }, extra || {})); }

    // ilha: disco com morros, grama em cima e terra nas bordas
    var ilha = new THREE.CylinderGeometry(11, 7, 3, 28, 4), p = ilha.attributes.position, cores = [], c = new THREE.Color();
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.sqrt(x * x + z * z);
      if (y > 1.4) { var h = Math.sin(x * 0.5) * Math.cos(z * 0.45) * 0.45 + Math.sin(x * 1.3 + z) * 0.12; p.setY(i, y + h * Math.min(1, r / 3)); }
      else p.setXYZ(i, x * (0.92 + rnd() * 0.16), y + (rnd() - 0.5) * 0.4, z * (0.92 + rnd() * 0.16));
      c.set(y > 1.4 ? (rnd() < 0.5 ? 0x5aa63a : 0x63b042) : (y > 0 ? 0x8b5a2b : 0x6b4220)); cores.push(c.r, c.g, c.b);
    }
    ilha.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3)); ilha.computeVertexNormals();
    var chao = new THREE.Mesh(ilha, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
    chao.position.y = -1.5; chao.receiveShadow = true; cena.add(chao);
    function alturaEm(x, z) { return Math.sin(x * 0.5) * Math.cos(z * 0.45) * 0.45 * Math.min(1, Math.sqrt(x * x + z * z) / 3); }

    // lago
    var lago = new THREE.Mesh(new THREE.CircleGeometry(2.6, 12), mat(0x2f78c8, { roughness: 0.1, transparent: true, opacity: 0.85 }));
    lago.rotation.x = -Math.PI / 2; lago.position.set(4.5, alturaEm(4.5, 3) + 0.08, 3); cena.add(lago);

    // árvores, pinheiros e rochas
    var tronco = new THREE.CylinderGeometry(0.12, 0.18, 0.9, 6); tronco.translate(0, 0.45, 0);
    var copa = new THREE.IcosahedronGeometry(0.7, 0); copa.translate(0, 1.3, 0);
    var pinho = new THREE.ConeGeometry(0.6, 1.6, 7); pinho.translate(0, 1.3, 0);
    var rocha = new THREE.DodecahedronGeometry(0.45, 0); rocha.translate(0, 0.25, 0);
    var mTronco = mat(0x6b4220), mCopa = [mat(0x3e8e2e), mat(0x5aa83a), mat(0x24603a)], mRocha = mat(0x8a8a8a);
    var arvores = [];
    for (var k = 0; k < 34; k++) {
      var a = rnd() * Math.PI * 2, d = 3 + rnd() * 7, ax = Math.cos(a) * d, az = Math.sin(a) * d;
      if (Math.abs(ax - 4.5) < 3 && Math.abs(az - 3) < 3) continue; // fora do lago
      if (Math.abs(ax + 1) < 2.2 && Math.abs(az + 1) < 2.2) continue; // fora do portal
      var g = new THREE.Group(), s = 0.8 + rnd() * 0.5, pin = rnd() < 0.35;
      var t1 = new THREE.Mesh(tronco, mTronco); t1.castShadow = true; g.add(t1);
      var t2 = new THREE.Mesh(pin ? pinho : copa, pin ? mCopa[2] : mCopa[k % 2]); t2.castShadow = true; g.add(t2);
      g.position.set(ax, alturaEm(ax, az), az); g.scale.setScalar(s); g.rotation.y = rnd() * 6; cena.add(g); arvores.push(g);
      if (rnd() < 0.3) { var ro = new THREE.Mesh(rocha, mRocha); ro.castShadow = true; ro.position.set(ax + 0.9, alturaEm(ax + 0.9, az), az + 0.4); ro.scale.setScalar(0.6 + rnd() * 0.6); cena.add(ro); }
    }

    // portal aceso
    var portal = new THREE.Group(), obs = mat(0x1e0f2e, { roughness: 0.35, metalness: 0.25 });
    [[-1.1, 0], [1.1, 0]].forEach(function (q) { var b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 0.5), obs); b.position.set(q[0], 1.6, 0); b.castShadow = true; portal.add(b); });
    [0.05, 3.2].forEach(function (y) { var b = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.5, 0.5), obs); b.position.set(0, y, 0); b.castShadow = true; portal.add(b); });
    var luzPortal = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.7), new THREE.MeshStandardMaterial({ color: 0x7d35c4, emissive: 0x9a4ae8, emissiveIntensity: 1.3, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    luzPortal.position.y = 1.62; portal.add(luzPortal);
    portal.position.set(-1, alturaEm(-1, -1), -1); portal.rotation.y = 0.5; cena.add(portal);

    // dragão voando em círculo
    var drag = new THREE.Group(), escuro = mat(0x2a1a3a, { roughness: 0.6 }), claro = mat(0x4a3060);
    var corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 2.4, 7), escuro); corpo.rotation.x = Math.PI / 2; corpo.castShadow = true; drag.add(corpo);
    var cauda = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 6), escuro); cauda.rotation.x = -Math.PI / 2; cauda.position.z = -2.2; drag.add(cauda);
    var cab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.85), claro); cab.position.set(0, 0.35, 1.8); drag.add(cab);
    [-0.16, 0.16].forEach(function (x) { var o = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.05), new THREE.MeshBasicMaterial({ color: 0xe07aff })); o.position.set(x, 0.42, 2.24); drag.add(o); });
    function asa(lado) {
      var f = new THREE.Shape(); f.moveTo(0, 0); f.lineTo(3.2, 0.4); f.lineTo(2.6, -1.3); f.lineTo(1.5, -0.8); f.lineTo(0.7, -1.5); f.lineTo(0, -0.7);
      var m = new THREE.Mesh(new THREE.ShapeGeometry(f), mat(0x5a4a78, { side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.scale.x = lado; m.castShadow = true;
      var piv = new THREE.Group(); piv.add(m); piv.position.set(lado * 0.35, 0.2, 0.5); drag.add(piv); return piv;
    }
    var ae = asa(-1), ad = asa(1); cena.add(drag);

    // brilhos no ar
    var n = 90, arr = new Float32Array(n * 3);
    for (i = 0; i < n; i++) { arr[i * 3] = (rnd() - 0.5) * 22; arr[i * 3 + 1] = rnd() * 7; arr[i * 3 + 2] = (rnd() - 0.5) * 22; }
    var gp = new THREE.BufferGeometry(); gp.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    var pts = new THREE.Points(gp, new THREE.PointsMaterial({ color: 0xfff4b0, size: 0.12, transparent: true, opacity: 0.8, depthWrite: false }));
    cena.add(pts);

    function ajustar() {
      var w = caixa.clientWidth, h = caixa.clientHeight;
      ren.setSize(w, h, false); cam.aspect = w / h;
      // tela larga: a ilha vai para a direita, longe do texto
      if (w / h > 1.4) cam.setViewOffset(w, h, -w * 0.2, 0, w, h); else cam.clearViewOffset();
      cam.updateProjectionMatrix();
    }
    window.addEventListener("resize", ajustar); ajustar();

    var t = 0, ultimo = performance.now();
    function quadro(agora) {
      var dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora; t += dt;
      // a câmera gira devagar em volta da ilha; no celular fica mais longe para caber tudo
      var largo = cam.aspect > 1.4, raio = largo ? 19 : 25, ang = t * 0.08 + 0.6;
      cam.position.set(Math.sin(ang) * raio, largo ? 9 : 12, Math.cos(ang) * raio);
      cam.lookAt(0, 0.8, 0);
      var da = t * 0.45; drag.position.set(Math.cos(da) * 7, 5.5 + Math.sin(t * 1.3) * 0.5, Math.sin(da) * 7);
      drag.rotation.y = -da; drag.rotation.z = -0.25;
      var bate = Math.sin(t * 6) * 0.6; ae.rotation.z = bate; ad.rotation.z = -bate;
      luzPortal.material.emissiveIntensity = 1.1 + Math.sin(t * 3) * 0.3;
      arvores.forEach(function (g, i) { g.rotation.z = Math.sin(t * 1.5 + i) * 0.03; });
      var a2 = gp.attributes.position;
      for (var j = 0; j < n; j++) { var y = a2.getY(j) + dt * 0.25; a2.setY(j, y > 7 ? 0 : y); }
      a2.needsUpdate = true;
      ren.render(cena, cam);
    }
    if (parado) { quadro(performance.now() + 16); return; }
    function laco(agora) { if (visivel && !document.hidden) quadro(agora); else ultimo = agora; requestAnimationFrame(laco); }
    requestAnimationFrame(laco);
    caixa.classList.add("cena-viva");
  }
})();
