/* Rota do Dragão: o jogo. Aventura vista de cima, em pixel art, sem bibliotecas.
   Três mundos (Campos, Abismo de Fogo e o Fim), receitas, loja, escambo e o dragão.
   A arte é desenhada por código a partir de moldes de 8x8 pixels, como os ícones do guia. */
(function () {
  "use strict";

  // ===================== utilidades =====================
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function gerador(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function fmt(s) {
    s = Math.max(0, Math.floor(s));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (x < 10 ? "0" : "") + x;
  }
  function ruido(r, escala) {
    var memo = {};
    function g(ix, iy) { var k = ix + "," + iy; if (memo[k] == null) memo[k] = r(); return memo[k]; }
    return function (x, y) {
      var fx = x / escala, fy = y / escala, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      var sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      var a = g(x0, y0), b = g(x0 + 1, y0), c = g(x0, y0 + 1), d = g(x0 + 1, y0 + 1);
      return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
    };
  }

  // ===================== arte (moldes 8x8) =====================
  var SPR = {};
  function fazer(nome, pal, g, esc) {
    esc = esc || 2;
    var c = document.createElement("canvas"); c.width = g[0].length * esc; c.height = g.length * esc;
    var x = c.getContext("2d");
    for (var y = 0; y < g.length; y++) for (var i = 0; i < g[y].length; i++) {
      var ch = g[y][i];
      if (ch !== "." && pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i * esc, y * esc, esc, esc); }
    }
    SPR[nome] = c; return c;
  }
  function espelhar(nome, novo) {
    var o = SPR[nome], c = document.createElement("canvas"); c.width = o.width; c.height = o.height;
    var x = c.getContext("2d"); x.translate(o.width, 0); x.scale(-1, 1); x.drawImage(o, 0, 0); SPR[novo] = c;
  }
  var GR = { g: "#5DAA3A", G: "#4A8F2E", l: "#79C255" };
  // chão e blocos
  fazer("grama", GR, ["gggGgggg", "ggggggGg", "gGgggggg", "ggggGggg", "gggggggG", "gGgggggg", "ggggggGg", "gggGgggg"]);
  fazer("grama2", GR, ["gggggggg", "ggGggggg", "gGlGgggg", "gggggGgg", "ggggGlGg", "gggggggg", "gGgggggg", "gggggggg"]);
  fazer("flor", { g: GR.g, G: GR.G, r: "#E04A4A", y: "#F5D442" }, ["gggggggg", "ggggrggg", "gggryrgg", "ggggrggg", "ggggGggg", "gggggggg", "gGgggggg", "gggggggg"]);
  var AG = { a: "#3A6EC9", A: "#5A8EE0", w: "#8FB8F0" };
  fazer("agua", AG, ["aaaaaaaa", "aAAaaaaa", "aaaaaAAa", "aaaaaaaa", "aaAAaaaa", "aaaaaaaa", "aaaaawAa", "aaaaaaaa"]);
  fazer("agua2", AG, ["aaaaaaaa", "aaaAAaaa", "aaaaaaaa", "aAAaaaaa", "aaaaaaAA", "aaaaaaaa", "aaAwaaaa", "aaaaaaaa"]);
  fazer("areia", { s: "#E3D59A", S: "#D6C688" }, ["ssssSsss", "ssssssss", "sSssssss", "sssssSss", "ssssssss", "ssSsssss", "sssssssS", "ssssssss"]);
  fazer("arvore", { g: GR.g, L: "#2E7D32", l: "#4CAF50", t: "#6B4220" }, ["ggLLLLgg", "gLlLLlLg", "LLLlLLLL", "LlLLLlLL", "gLLLLLLg", "gggttggg", "gggttggg", "ggttttgg"]);
  var PE = { s: "#8A8A8A", S: "#6E6E6E" };
  fazer("pedra", PE, ["sssSssss", "sSssssSs", "ssssssss", "SsssSsss", "sssssssS", "ssSsssss", "sssssSss", "SSSSSSSS"]);
  fazer("ferro", { s: PE.s, S: PE.S, o: "#E3B48F" }, ["sssSssss", "sooossSs", "ssosssss", "SssssoOs".replace("O", "o"), "ssssooo S".replace(" ", ""), "ssosssss", "sooossSs", "SSSSSSSS"]);
  fazer("ouro", { s: "#3A3A40", S: "#2A2A30", o: "#F5D442" }, ["sssSssss", "sooossSs", "ssosssss", "Sssssoos", "ssssooos", "ssosssss", "sooossSs", "SSSSSSSS"]);
  fazer("caminho", { c: "#B8956A", C: "#9C7A50" }, ["ccccCccc", "cCcccccc", "ccccccCc", "cccccccc", "ccCccccc", "cccccCcc", "cccccccc", "Cccccccc"]);
  fazer("ponte", { w: "#A07A50", W: "#7B5230" }, ["WWWWWWWW", "wwwwwwww", "wwwwwwww", "WWWWWWWW", "wwwwwwww", "wwwwwwww", "WWWWWWWW", "wwwwwwww"]);
  fazer("parede", { w: "#A07A50", W: "#7B5230" }, ["wwwwwwww", "WWWWWWWW", "wwwWwwww", "WWWWWWWW", "wwwwwwWw", "WWWWWWWW", "wWwwwwww", "WWWWWWWW"]);
  fazer("chao", { f: "#C49A6C", F: "#A88050" }, ["ffffFfff", "FFFFFFFF", "fffffffF", "FFFFFFFF", "ffFfffff", "FFFFFFFF", "fffffFff", "FFFFFFFF"]);
  fazer("mesa", { T: "#7B5230", t: "#C49A6C", k: "#4A3018", x: "#A8A8A8" }, ["TTTTTTTT", "TtktktkT", "TkkkkkkT", "TtktktkT", "TTTTTTTT", "TxTTTTxT", "TxTTTTxT", "TTTTTTTT"]);
  var LV = { l: "#E8821E", L: "#F5C542", r: "#C9401E" };
  fazer("lava", LV, ["llllLlll", "lLLlllrl", "llllllll", "rlllLLll", "llllllll", "lLllllrl", "llrlllll", "lllllLLl"]);
  fazer("lava2", LV, ["llllllll", "lllLLlll", "rlllllll", "llllllLL", "lLLlllll", "llllrlll", "llllllll", "lLLlllrl"]);
  fazer("basalto", { b: "#4A4A50", B: "#3A3A40" }, ["bbbBbbbb", "bBbbbbBb", "bbbbbbbb", "BbbbBbbb", "bbbbbbbB", "bbBbbbbb", "bbbbbBbb", "BBBBBBBB"]);
  fazer("cinza", { c: "#5A3A34", C: "#4A2E2A" }, ["ccccCccc", "cCcccccc", "ccccccCc", "cccccccc", "ccCccccc", "cccccCcc", "cccccccc", "Cccccccc"]);
  fazer("tijolo", { n: "#4A1E24", N: "#3A1418", m: "#2A0E10" }, ["nnnmnnnm", "NNNmNNNm", "mmmmmmmm", "nmnnnmnn", "NmNNNmNN", "mmmmmmmm", "nnnmnnnm", "NNNmNNNm"]);
  fazer("fimchao", { e: "#E5E0A8", E: "#D6D09A" }, ["eeeeEeee", "eEeeeeee", "eeeeeeEe", "eeeeeeee", "eeEeeeee", "eeeeeEee", "eeeeeeee", "Eeeeeeee"]);
  fazer("vazio", { k: "#0A0812", w: "#8C84B8" }, ["kkkkkkkk", "kkkkkwkk", "kkkkkkkk", "kkkkkkkk", "kwkkkkkk", "kkkkkkkk", "kkkkkkkk", "kkkkkkkk"]);
  fazer("pilar", { p: "#2A1E3A", P: "#1E1428", v: "#4A3A60" }, ["ppppPppp", "pvppppPp", "ppppvppp", "Pppppppp", "pppPpppv", "pvpppppp", "ppppPppp", "PPPPPPPP"]);
  var PO = { o: "#1E0F2E", v: "#7D35C4", V: "#B57BEA" };
  fazer("portal", PO, ["vvVvvvVv", "vVvvVvvv", "vvvVvvVv", "VvvvvVvv", "vvVvvvvV", "vVvvVvvv", "vvvvvVvv", "VvvVvvvV"]);
  fazer("portal2", PO, ["vVvvVvvv", "vvvVvvVv", "VvvvvVvv", "vvVvvvvV", "vVvvVvvv", "vvvvvVvv", "VvvVvvvV", "vvVvvvVv"]);
  fazer("portalOff", { o: "#1E0F2E", v: "#2A1E3A", V: "#3A2A50" }, ["oooooooo", "ovvVvvvo", "oVvvvVvo", "ovvVvvVo", "ovVvvvvo", "oVvvVvvo", "ovvvvVvo", "oooooooo"]);
  fazer("torre", { s: "#8A8A8A", S: "#6E6E6E", m: "#4A4A4A" }, ["sssmsssm", "SSSmSSSm", "mmmmmmmm", "smsssmss", "SmSSSmSS", "mmmmmmmm", "sssmsssm", "SSSmSSSm"]);
  fazer("porta", { d: "#3A2410", D: "#5E3E22", g: "#2A2A2A", y: "#7FD95A" }, ["dDDDDDDd", "dDgDDgDd", "dDDDDDDd", "dDgDDgDd", "dDDDDDDd", "dDgDDgDd", "dDDDDDDd", "dddddddd"]);
  // personagens
  var HE = { h: "#4A2E18", k: "#E8B890", c: "#3E8EC9", p: "#2A3A6E", e: "#222222" };
  fazer("heroi_b", HE, ["..hhhh..", ".hkkkkh.", ".kekkek.", ".kkkkkk.", "..cccc..", ".kcccck.", "..pppp..", "..p..p.."]);
  fazer("heroi_c", HE, ["..hhhh..", ".hhhhhh.", ".hhhhhh.", ".khhhhk.", "..cccc..", ".kcccck.", "..pppp..", "..p..p.."]);
  fazer("heroi_d", HE, ["..hhhh..", ".hhkkkk.", ".hkkkek.", ".hkkkkk.", "..cccc..", "..cccck.", "..pppp..", "..p..p.."]);
  espelhar("heroi_d", "heroi_e");
  fazer("lodo", { g: "#5FCF5A", G: "#3E9E3A", e: "#1E3A1E" }, ["........", "..gggg..", ".gggggg.", "ggeggegg", "gggggggg", "gGgggggG", "gggggggg", ".GGGGGG."]);
  fazer("esqueleto", { w: "#D9D9D9", W: "#A8A8A8", k: "#222222" }, ["..wwww..", ".wkwwkw.", ".wwwwww.", "..wkkw..", "...ww...", "..wWWw..", "..w..w..", ".ww..ww."]);
  fazer("aranha", { k: "#2A2626", r: "#E02020" }, ["........", "k.k..k.k", ".kkkkkk.", "kkrkkrkk", ".kkkkkk.", "k.kkkk.k", "..k..k..", "........"]);
  fazer("diabrete", { o: "#F5A030", y: "#F8D55C", r: "#C9401E", k: "#2A1A0A" }, ["..y..y..", ".oyooyo.", "ookookoo", "oooooooo", ".orrrro.", "..oooo..", ".o.oo.o.", "o......o"]);
  fazer("brutamontes", { b: "#8A5A3A", B: "#6B4220", k: "#111111", t: "#E8E3D9" }, ["..bbbb..", ".bkbbkb.", ".bbbbbb.", "tbBBBBbt", ".bbbbbb.", "bbbbbbbb", ".bb..bb.", ".bb..bb."]);
  fazer("sombra", { s: "#1A1424", S: "#2A2238", e: "#D98AFF" }, ["...ss...", "..sees..", "..ssss..", ".ssssss.", "s.SSSS.s", "..ssss..", "..s..s..", "..s..s.."]);
  fazer("mercador", { h: "#6B4220", k: "#E8B890", e: "#222222", m: "#2E6B3A" }, ["..hhhh..", ".hhhhhh.", "..kkkk..", "..ekke..", "..kkkk..", ".mmmmmm.", ".mmmmmm.", "..m..m.."]);
  fazer("cinzento", { r: "#7A2E2E", k: "#3A1A1A", y: "#F5D442" }, ["..rrrr..", ".rrrrrr.", ".rkkkkr.", ".rykkyr.", ".rkkkkr.", "rrrrrrrr", ".rrrrrr.", "..r..r.."]);
  fazer("cristal", { c: "#F2A6E6", C: "#C77DFF", w: "#FFFFFF" }, ["....c...", "...cCc..", "..cCwCc.", ".cCwwCCc", "..cCCCc.", "...cCc..", "....c...", "........"]);
  fazer("dragao", { d: "#2A1A3A", D: "#4A3060", e: "#E07AFF", w: "#5A4A78" }, [
    "......dddd......", ".....dDDDDd.....", "....dDeDDeDd....", "....dDDDDDDd....", "ww...dDDDDd...ww", "www..dDDDDd..www",
    "wwww.dDDDDd.wwww", "wwwwwdDDDDdwwwww", ".wwwwdDDDDdwwww.", "..wwwdDDDDdwww..", "....dDDDDDDd....", "....dDDDDDDd....",
    ".....dDDDDd.....", "......dDDd......", ".......dd.......", ".......dd......."], 3);
  // projéteis e efeitos
  fazer("flechaP", { w: "#C9C9C9", m: "#7B5230" }, ["........", "........", "........", "mmmmmmww", "........", "........", "........", "........"], 1);
  fazer("fogo", { o: "#F5A030", y: "#FFF2A0", r: "#C9401E" }, ["..rr..", ".royr.", "royyor", "royyor", ".royr.", "..rr.."], 1);
  // ícones de itens (8x8)
  fazer("i_madeira", { t: "#8A5E36", T: "#6B4220", c: "#C49A6C" }, ["........", ".tttttt.", "tcTTTTct", "tcTccTct", "tcTTTTct", ".tttttt.", "........", "........"]);
  fazer("i_pedra", PE, ["........", ".ssSsss.", "sSsssSss", "ssssSsss", "sSssssSs", ".sssSss.", "........", "........"]);
  fazer("i_ferro", { k: "#8A8A8A", N: "#C9C9C9", n: "#EDEDED" }, ["........", "..kkkkk.", ".kNNNNNk", "kNnNNNNk", "kNNNNnk.", "kkkkkk..", "........", "........"]);
  fazer("i_ouro", { k: "#B8922E", N: "#E3C15A", n: "#FFF2A0" }, ["........", "..kkkkk.", ".kNNNNNk", "kNnNNNNk", "kNNNNnk.", "kkkkkk..", "........", "........"]);
  fazer("i_moeda", { y: "#E3C15A", Y: "#B8922E", w: "#FFF2A0" }, ["..yyyy..", ".yYYYYy.", "yYwYYYYy", "yYwYYYYy", "yYYYYYYy", "yYYYYYYy", ".yYYYYy.", "..yyyy.."]);
  fazer("i_brasa", { y: "#F8D55C", o: "#E08A1E", d: "#8C4A0E" }, ["......yo", ".....yod", "....yod.", "...yod..", "..yod...", ".yod....", "yod.....", "od......"]);
  fazer("i_perola", { a: "#0B4D42", b: "#1E8C78", c: "#6FE6D0" }, ["..aaaa..", ".abbbba.", "abcbbbba", "abccbbba", "abbbbbba", "abbbbbba", ".abbbba.", "..aaaa.."]);
  fazer("i_olho", { a: "#3A1E4A", g: "#B57BEA", l: "#E8C8FF", p: "#111111" }, ["..aaaa..", ".agggga.", "aglgggga", "aggppgga", "aggppgga", "agggggga", ".agggga.", "..aaaa.."]);
  fazer("i_flecha", { k: "#5E5E5E", w: "#7B5230", p: "#F5F5F5" }, [".......k", "......kk", ".....k..", "....w...", "...w....", "..w.....", "pw......", "pp......"]);
  fazer("i_linha", { w: "#EDEDED" }, ["......ww", ".....w..", "....w...", "...w....", "..ww....", ".w..w...", "w....w..", "......w."]);
  fazer("i_pao", { b: "#B07A3A", B: "#D9A55A" }, ["........", "..bbbb..", ".bBBBBb.", "bBbBbBBb", "bBBBBBBb", ".bbbbbb.", "........", "........"]);
  fazer("i_vida", { k: "#7A4A2A", c: "#BFE3F0", p: "#E0303A", P: "#FF8F8F" }, ["...kk...", "...cc...", "..cppc..", ".cPpppc.", ".cppppc.", ".cppppc.", "..cccc..", "........"]);
  fazer("i_fogo", { k: "#7A4A2A", c: "#BFE3F0", p: "#E49A3A", P: "#F5C27A" }, ["...kk...", "...cc...", "..cppc..", ".cPpppc.", ".cppppc.", ".cppppc.", "..cccc..", "........"]);
  fazer("i_arco", { w: "#7B5230", l: "#EDEDED" }, ["..www..l", ".w...w.l", "w.....wl", "w......l", "w.....wl", ".w...w.l", "..www..l", "........"]);
  fazer("i_isqueiro", { k: "#3A3A3A", f: "#C9C9C9" }, ["......k.", ".....kk.", "....kk..", "...k....", "..ff....", ".ff.....", "ff......", "f......."]);
  fazer("i_armadura", { s: "#C9C9C9", S: "#8A8A8A" }, ["ss....ss", "sSs..sSs", "sSSssSSs", ".sSSSSs.", ".sSSSSs.", ".sSSSSs.", ".ssssss.", "........"]);
  [["i_pic1", "#C49A6C"], ["i_pic2", "#6E6E6E"], ["i_pic3", "#EDEDED"]].forEach(function (a) {
    fazer(a[0], { p: a[1], w: "#7B5230", k: "#2A2A2A" }, [".ppppp..", "pk...pp.", "....wp..", "...w..p.", "..w.....", ".w......", "w.......", "........"]);
  });
  [["i_esp1", "#C49A6C"], ["i_esp2", "#8A8A8A"], ["i_esp3", "#EDEDED"]].forEach(function (a) {
    fazer(a[0], { d: a[1], h: "#7B5230" }, ["......dd", ".....ddd", "....ddd.", ".h.ddd..", "..hdd...", "..hh....", ".h..h...", "h......."]);
  });
  fazer("coracao", { r: "#E0303A", R: "#FF7F7F", k: "#3A0A0A" }, [".kk.kk..", "kRrkrrk.", "krrrrrk.", "krrrrrk.", ".krrrk..", "..krk...", "...k....", "........"]);
  fazer("coracaoMeio", { r: "#E0303A", R: "#FF7F7F", k: "#3A0A0A", v: "#4A2A2A" }, [".kk.kk..", "kRrkvvk.", "krrrvvk.", "krrrvvk.", ".krrvk..", "..krk...", "...k....", "........"]);
  fazer("coracaoVazio", { k: "#3A0A0A", v: "#4A2A2A" }, [".kk.kk..", "kvvkvvk.", "kvvvvvk.", "kvvvvvk.", ".kvvvk..", "..kvk...", "...k....", "........"]);

  // ===================== dados do jogo =====================
  var TILE = 16;
  var T = { GRAMA: 0, GRAMA2: 1, FLOR: 2, AGUA: 3, AREIA: 4, ARVORE: 5, PEDRA: 6, FERRO: 7, OURO: 8, CAMINHO: 9, PAREDE: 10, CHAO: 11,
    LAVA: 12, BASALTO: 13, CINZA: 14, FIMCHAO: 15, VAZIO: 16, PILAR: 17, PORTAL: 18, PORTAL_OFF: 19, TORRE: 20, PORTA: 21, MESA: 22, TIJOLO: 23, PONTE: 24 };
  var TSPR = ["grama", "grama2", "flor", "agua", "areia", "arvore", "pedra", "ferro", "ouro", "caminho", "parede", "chao", "lava", "basalto",
    "cinza", "fimchao", "vazio", "pilar", "portal", "portalOff", "torre", "porta", "mesa", "tijolo", "ponte"];
  var SOLIDO = {};
  [T.AGUA, T.ARVORE, T.PEDRA, T.FERRO, T.OURO, T.PAREDE, T.BASALTO, T.VAZIO, T.PILAR, T.TORRE, T.PORTA, T.MESA, T.TIJOLO, T.PORTAL_OFF].forEach(function (t) { SOLIDO[t] = true; });

  var ITENS = {
    madeira: ["Madeira", "i_madeira", "Das árvores."], pedra: ["Pedra", "i_pedra", "Das rochas, com picareta."],
    ferro: ["Ferro", "i_ferro", "Rocha com pintas bege, com picareta de pedra."], ouro: ["Ouro", "i_ouro", "No Abismo, com picareta de ferro, ou dos brutamontes."],
    moeda: ["Moedas", "i_moeda", "Para a loja da vila."], brasa: ["Brasa", "i_brasa", "Dos diabretes do Abismo."],
    perola: ["Pérola do vazio", "i_perola", "Do Mercador das Cinzas e das sombras."], olho: ["Olho do Dragão", "i_olho", "Brasa + pérola. Abre a Torre Antiga."],
    flecha: ["Flechas", "i_flecha", "Munição do arco."], linha: ["Linha", "i_linha", "Das aranhas. Faz o arco."],
    pao: ["Pão", "i_pao", "Recupera 4 de vida."], vida: ["Poção de vida", "i_vida", "Recupera 10 de vida."],
    fogo: ["Poção contra fogo", "i_fogo", "90 segundos sem queimar na lava."]
  };
  var USAVEIS = ["arco", "pao", "vida", "fogo"];
  var NOME_PIC = ["Mãos", "Picareta de madeira", "Picareta de pedra", "Picareta de ferro"];
  var NOME_ESP = ["Punhos", "Espada de madeira", "Espada de pedra", "Espada de ferro"];
  var DANO_ESP = [1, 2, 3, 5];

  var RECEITAS = [
    { id: "pic1", nome: "Picareta de madeira", spr: "i_pic1", custo: { madeira: 3 }, desc: "Minera pedra.", pode: function () { return E.eq.pic < 1; }, faz: function () { E.eq.pic = 1; conquista("pic"); } },
    { id: "esp1", nome: "Espada de madeira", spr: "i_esp1", custo: { madeira: 2 }, desc: "Dano 2.", pode: function () { return E.eq.esp < 1; }, faz: function () { E.eq.esp = 1; } },
    { id: "pic2", nome: "Picareta de pedra", spr: "i_pic2", custo: { pedra: 3, madeira: 2 }, desc: "Minera ferro.", pode: function () { return E.eq.pic < 2; }, faz: function () { E.eq.pic = 2; } },
    { id: "esp2", nome: "Espada de pedra", spr: "i_esp2", custo: { pedra: 2, madeira: 1 }, desc: "Dano 3.", pode: function () { return E.eq.esp < 2; }, faz: function () { E.eq.esp = 2; conquista("esp"); } },
    { id: "isq", nome: "Isqueiro", spr: "i_isqueiro", custo: { ferro: 1, pedra: 1 }, desc: "Acende o portal em ruínas.", pode: function () { return !E.eq.isq; }, faz: function () { E.eq.isq = true; } },
    { id: "pic3", nome: "Picareta de ferro", spr: "i_pic3", custo: { ferro: 3, madeira: 2 }, desc: "Minera ouro no Abismo.", pode: function () { return E.eq.pic < 3; }, faz: function () { E.eq.pic = 3; } },
    { id: "esp3", nome: "Espada de ferro", spr: "i_esp3", custo: { ferro: 2, madeira: 1 }, desc: "Dano 5.", pode: function () { return E.eq.esp < 3; }, faz: function () { E.eq.esp = 3; } },
    { id: "arm", nome: "Armadura de ferro", spr: "i_armadura", custo: { ferro: 5 }, desc: "Recebe 40% menos dano.", pode: function () { return !E.eq.arm; }, faz: function () { E.eq.arm = true; } },
    { id: "arco", nome: "Arco", spr: "i_arco", custo: { madeira: 3, linha: 2 }, desc: "Atira flechas com o botão B.", pode: function () { return !E.eq.arco; }, faz: function () { E.eq.arco = true; if (E.sel === "pao") E.sel = "arco"; } },
    { id: "flechas", nome: "4 flechas", spr: "i_flecha", custo: { madeira: 1, pedra: 1 }, desc: "Munição do arco.", pode: function () { return true; }, faz: function () { add("flecha", 4); } },
    { id: "olho", nome: "Olho do Dragão", spr: "i_olho", custo: { brasa: 1, perola: 1 }, desc: "Precisa de 6 para abrir a Torre Antiga.", pode: function () { return true; }, faz: function () { add("olho", 1); if (E.inv.olho >= 6) conquista("olhos"); } }
  ];
  var LOJA = [
    { item: "pao", qtd: 1, preco: 3 }, { item: "vida", qtd: 1, preco: 8 }, { item: "flecha", qtd: 8, preco: 6 }, { item: "fogo", qtd: 1, preco: 14 }
  ];
  var TROCA = [["perola", 1, 2, 22], ["flecha", 3, 6, 16], ["fogo", 1, 1, 8], ["moeda", 2, 4, 24], ["linha", 1, 3, 12], [null, 0, 0, 18]];
  var CONQ = [
    ["pic", "Primeira ferramenta", "Fazer uma picareta."], ["esp", "Lâmina de pedra", "Fazer a espada de pedra."], ["ferro", "Primeiro ferro", "Minerar ferro."],
    ["abismo", "Para o fogo", "Entrar no Abismo de Fogo."], ["brasa", "Fogo na mão", "Conseguir uma brasa."], ["troca", "Negócio fechado", "Trocar ouro com o Mercador das Cinzas."],
    ["olhos", "Seis olhos", "Ter 6 Olhos do Dragão."], ["torre", "A Torre Antiga", "Abrir a porta da torre."], ["cristais", "Sem cura", "Destruir os 4 cristais."],
    ["dragao", "Rota completa", "Derrotar o dragão."], ["rapido", "Corredor", "Zerar em menos de 20 minutos."], ["imortal", "Sem um arranhão", "Zerar sem morrer."]
  ];
  var MONSTROS = {
    lodo: { hp: 4, vel: 26, dano: 2, r: 6, ia: "perseguir", drops: [["moeda", 1, 2, 0.85], ["pao", 1, 1, 0.1]] },
    esqueleto: { hp: 5, vel: 32, dano: 2, r: 6, ia: "atirador", proj: "flecha", drops: [["flecha", 1, 3, 0.6], ["moeda", 1, 2, 0.6]] },
    aranha: { hp: 4, vel: 52, dano: 2, r: 6, ia: "perseguir", drops: [["linha", 1, 2, 0.75], ["moeda", 1, 1, 0.4]] },
    diabrete: { hp: 6, vel: 30, dano: 3, r: 6, ia: "atirador", proj: "fogo", voa: true, drops: [["brasa", 1, 1, 0.6], ["moeda", 1, 2, 0.4]] },
    brutamontes: { hp: 12, vel: 30, dano: 4, r: 7, ia: "perseguir", drops: [["ouro", 1, 2, 0.75]] },
    sombra: { hp: 7, vel: 46, dano: 3, r: 6, ia: "teleporte", drops: [["perola", 1, 1, 0.35]] }
  };

  // ===================== estado =====================
  var E = null;        // estado salvo
  var M = null;        // mundo atual (mapa e entidades)
  var jogando = false, pausado = true;
  var canvas = document.getElementById("tela"), ctx = canvas.getContext("2d");
  var VW = 320, VH = 192;

  function novoEstado() {
    return {
      v: 1, seed: (Math.random() * 1e9) | 0, mundo: "campos", x: 0, y: 0, hp: 20,
      inv: { madeira: 0, pedra: 0, ferro: 0, ouro: 0, moeda: 0, brasa: 0, perola: 0, olho: 0, flecha: 0, linha: 0, pao: 1, vida: 0, fogo: 0 },
      eq: { pic: 0, esp: 0, arm: false, arco: false, isq: false }, sel: "pao",
      f: { portal: false, torre: false, cristais: [true, true, true, true], dragao: false }, tempo: 0, mortes: 0, conq: {}
    };
  }
  function add(item, n) { E.inv[item] = (E.inv[item] || 0) + n; }

  // ===================== geração dos mundos =====================
  function criarMapa(w, h, fill) { var t = new Uint8Array(w * h); t.fill(fill); return { w: w, h: h, t: t }; }
  function tile(m, x, y) { return x < 0 || y < 0 || x >= m.w || y >= m.h ? T.VAZIO : m.t[y * m.w + x]; }
  function pôr(m, x, y, v) { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.t[y * m.w + x] = v; }
  function retangulo(m, x0, y0, w, h, v) { for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) pôr(m, x, y, v); }
  function cavar(m, a, b, chao, ponteSobre) {
    var x = a.x, y = a.y, n = 0;
    while ((x !== b.x || y !== b.y) && n++ < 2000) {
      if (x !== b.x && (y === b.y || Math.abs(b.x - x) > Math.abs(b.y - y))) x += x < b.x ? 1 : -1; else y += y < b.y ? 1 : -1;
      var t = tile(m, x, y);
      if (ponteSobre.indexOf(t) >= 0) pôr(m, x, y, T.PONTE);
      else if (SOLIDO[t] && t !== T.PORTAL_OFF && t !== T.PORTA && t !== T.TORRE && t !== T.PAREDE && t !== T.TIJOLO && t !== T.MESA) pôr(m, x, y, chao);
      else if (t === T.GRAMA || t === T.GRAMA2 || t === T.FLOR || t === T.AREIA || t === T.CINZA) pôr(m, x, y, chao);
    }
  }
  function espalhar(m, r, cx, cy, rmin, rmax, n, pode, v) {
    for (var i = 0, tent = 0; i < n && tent < 500; tent++) {
      var a = r() * Math.PI * 2, d = rmin + r() * (rmax - rmin), x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
      if (pode(tile(m, x, y))) { pôr(m, x, y, v); i++; }
    }
  }
  function ehGrama(t) { return t === T.GRAMA || t === T.GRAMA2 || t === T.FLOR; }

  function gerarCampos(seed) {
    var r = gerador(seed), W = 84, H = 84, c = 42, m = criarMapa(W, H, T.GRAMA);
    var n1 = ruido(r, 14), n2 = ruido(r, 6), nA = ruido(r, 7), nR = ruido(r, 9);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var n = 0.65 * n1(x, y) + 0.35 * n2(x, y), t;
      if (n < 0.3) t = T.AGUA; else if (n < 0.34) t = T.AREIA;
      else { var q = r(); t = q < 0.08 ? T.GRAMA2 : q < 0.11 ? T.FLOR : T.GRAMA;
        if (nA(x, y) > 0.62 && r() < 0.55) t = T.ARVORE; else if (nR(x, y) > 0.7) t = r() < 0.14 ? T.FERRO : T.PEDRA; }
      if (x < 2 || y < 2 || x > W - 3 || y > H - 3) t = T.ARVORE;
      pôr(m, x, y, t);
    }
    // vila
    retangulo(m, c - 9, c - 7, 19, 15, T.GRAMA);
    retangulo(m, c - 7, c - 5, 6, 5, T.PAREDE); retangulo(m, c - 6, c - 4, 4, 3, T.CHAO); pôr(m, c - 4, c - 1, T.CHAO); pôr(m, c - 6, c - 4, T.MESA);
    retangulo(m, c + 2, c - 5, 6, 5, T.PAREDE); retangulo(m, c + 3, c - 4, 4, 3, T.CHAO); pôr(m, c + 5, c - 1, T.CHAO);
    retangulo(m, c - 9, c + 2, 19, 1, T.CAMINHO); retangulo(m, c, c - 7, 1, 15, T.CAMINHO);
    var spawn = { x: c, y: c + 4 };
    // portal em ruínas e torre antiga, em lados opostos
    var a = r() * Math.PI * 2;
    var p = { x: clamp(Math.round(c + Math.cos(a) * 27), 7, W - 8), y: clamp(Math.round(c + Math.sin(a) * 27), 7, H - 8) };
    retangulo(m, p.x - 3, p.y - 3, 7, 8, T.GRAMA); retangulo(m, p.x, p.y - 1, 2, 3, T.PORTAL_OFF);
    pôr(m, p.x - 1, p.y - 2, T.PILAR); pôr(m, p.x + 2, p.y - 2, T.PILAR); pôr(m, p.x - 1, p.y + 2, T.PILAR);
    var b = a + Math.PI + (r() - 0.5) * 0.8;
    var tr = { x: clamp(Math.round(c + Math.cos(b) * 30), 8, W - 9), y: clamp(Math.round(c + Math.sin(b) * 30), 8, H - 9) };
    retangulo(m, tr.x - 4, tr.y - 4, 9, 10, T.GRAMA); retangulo(m, tr.x - 3, tr.y - 3, 7, 7, T.TORRE); pôr(m, tr.x, tr.y + 3, T.PORTA);
    cavar(m, spawn, { x: p.x, y: p.y + 3 }, T.CAMINHO, [T.AGUA]);
    cavar(m, spawn, { x: tr.x, y: tr.y + 5 }, T.CAMINHO, [T.AGUA]);
    // garantia de recursos perto da vila
    espalhar(m, r, c, c, 10, 15, 12, ehGrama, T.ARVORE);
    espalhar(m, r, c, c, 11, 17, 8, ehGrama, T.PEDRA);
    espalhar(m, r, c, c, 13, 19, 5, ehGrama, T.FERRO);
    return { nome: "campos", titulo: "Campos", mapa: m, spawn: spawn, portal: { x: p.x, y: p.y + 2 }, torre: { x: tr.x, y: tr.y + 4 },
      npcs: [{ tipo: "mercador", tx: c + 5, ty: c + 1 }], seguro: { x: c, y: c, r: 10 } };
  }

  function gerarAbismo(seed) {
    var r = gerador(seed + 77), W = 64, H = 64, c = 32, m = criarMapa(W, H, T.CINZA);
    var n1 = ruido(r, 11), nB = ruido(r, 6);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var t = T.CINZA;
      if (n1(x, y) < 0.3) t = T.LAVA; else if (nB(x, y) > 0.7) t = r() < 0.16 ? T.OURO : T.BASALTO;
      if (x < 2 || y < 2 || x > W - 3 || y > H - 3) t = T.BASALTO;
      pôr(m, x, y, t);
    }
    retangulo(m, c - 4, c - 6, 9, 11, T.CINZA); retangulo(m, c, c - 5, 2, 3, T.PORTAL);
    var a = r() * Math.PI * 2, f = { x: clamp(Math.round(c + Math.cos(a) * 20), 8, W - 9), y: clamp(Math.round(c + Math.sin(a) * 20), 8, H - 9) };
    retangulo(m, f.x - 5, f.y - 4, 11, 9, T.TIJOLO); retangulo(m, f.x - 4, f.y - 3, 9, 7, T.CINZA);
    pôr(m, f.x, f.y - 4, T.CINZA); pôr(m, f.x, f.y + 4, T.CINZA); pôr(m, f.x - 5, f.y, T.CINZA); pôr(m, f.x + 5, f.y, T.CINZA);
    var mc = { x: c + 7, y: c + 1 };
    retangulo(m, mc.x - 2, mc.y - 2, 5, 5, T.CINZA);
    cavar(m, { x: c, y: c }, f, T.CINZA, [T.LAVA]);
    cavar(m, { x: c, y: c }, mc, T.CINZA, [T.LAVA]);
    espalhar(m, r, c, c, 6, 13, 7, function (t) { return t === T.BASALTO || t === T.CINZA; }, T.OURO);
    return { nome: "abismo", titulo: "Abismo de Fogo", mapa: m, spawn: { x: c, y: c }, portal: { x: c, y: c - 2 }, fortaleza: f,
      npcs: [{ tipo: "cinzento", tx: mc.x, ty: mc.y }], seguro: { x: c, y: c, r: 5 } };
  }

  function gerarFim(seed) {
    var r = gerador(seed + 991), W = 50, H = 50, c = 25, m = criarMapa(W, H, T.VAZIO), n = ruido(r, 5);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var d = Math.sqrt((x - c) * (x - c) + (y - c) * (y - c));
      if (d < 16 + n(x, y) * 4) pôr(m, x, y, T.FIMCHAO);
    }
    var cris = [];
    [45, 135, 225, 315].forEach(function (g, i) {
      var a = g * Math.PI / 180, px = Math.round(c + Math.cos(a) * 10), py = Math.round(c + Math.sin(a) * 10);
      retangulo(m, px, py, 2, 2, T.PILAR);
      cris.push({ x: (px + 1) * TILE, y: (py + 2) * TILE + 8, i: i });
    });
    return { nome: "fim", titulo: "O Fim", mapa: m, spawn: { x: c, y: c + 14 }, centro: { x: c, y: c }, cristaisPos: cris, npcs: [], seguro: null };
  }

  var GERA = { campos: gerarCampos, abismo: gerarAbismo, fim: gerarFim };

  function entrar(nome, onde) {
    var g = GERA[nome](E.seed);
    M = g; M.ents = []; M.proj = []; M.textos = []; M.minas = {}; M.particulas = [];
    E.mundo = nome;
    if (nome === "campos" && E.f.portal) acenderPortal(true);
    M.npcs = M.npcs.map(function (n) { return { tipo: n.tipo, x: n.tx * TILE + 8, y: n.ty * TILE + 8, npc: true, r: 6 }; });
    if (nome === "fim") {
      M.cristais = M.cristaisPos.map(function (p, i) { return { tipo: "cristal", x: p.x, y: p.y, hp: E.f.cristais[i] ? 3 : 0, i: i, r: 7 }; });
      M.dragao = E.f.dragao ? null : { x: M.centro.x * TILE, y: (M.centro.y - 6) * TILE, hp: 80, max: 80, fase: "voando", ang: 0, t: 2, tc: 0, alvo: null, r: 18 };
      if (E.f.dragao) abrirSaida();
    }
    var p = onde === "portal" ? M.portal : (onde || M.spawn);
    J.x = p.x * TILE + 8; J.y = p.y * TILE + 8; J.vx = J.vy = 0;
    E.x = J.x; E.y = J.y;
    mostrarMsg(M.titulo, 1.8);
    salvar();
  }

  // ===================== jogador =====================
  var J = { x: 0, y: 0, r: 5, dir: "b", dx: 0, dy: 1, cdAtq: 0, inv: 0, anim: 0, atq: 0, fogo: 0, lava: 0, kx: 0, ky: 0 };

  function livre(x, y, r, voa, ehJogador) {
    var pts = [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]];
    for (var i = 0; i < 4; i++) {
      var tx = Math.floor(pts[i][0] / TILE), ty = Math.floor(pts[i][1] / TILE), t = tile(M.mapa, tx, ty);
      if (SOLIDO[t]) { if (voa && t !== T.VAZIO && t !== T.PAREDE && t !== T.TORRE && t !== T.TIJOLO) continue; return false; }
      if (!ehJogador && !voa && t === T.LAVA) return false;
    }
    return true;
  }
  function mover(e, dx, dy, voa, ehJogador) {
    if (dx && livre(e.x + dx, e.y, e.r, voa, ehJogador)) e.x += dx;
    if (dy && livre(e.x, e.y + dy, e.r, voa, ehJogador)) e.y += dy;
  }
  function tileFrente() {
    return { x: Math.floor((J.x + J.dx * 12) / TILE), y: Math.floor((J.y + J.dy * 12) / TILE) };
  }

  function ferirJogador(d) {
    if (J.inv > 0 || !jogando) return;
    if (E.eq.arm) d = Math.max(1, Math.round(d * 0.6));
    E.hp -= d; J.inv = 0.7; som("dor");
    if (E.hp <= 0) morrer();
  }
  function morrer() {
    E.mortes++; E.hp = 20; J.inv = 2;
    var p = M.spawn; J.x = p.x * TILE + 8; J.y = p.y * TILE + 8;
    M.ents = []; M.proj = [];
    mostrarMsg("Você caiu! Voltou para o começo do " + M.titulo + ".", 2.6);
    salvar();
  }

  function atacar() {
    if (J.cdAtq > 0) return;
    J.cdAtq = 0.32; J.atq = 0.15; som("golpe");
    var ax = J.x + J.dx * 12, ay = J.y + J.dy * 12, dano = DANO_ESP[E.eq.esp], acertou = false;
    var alvos = M.ents.concat(M.cristais ? M.cristais.filter(function (c) { return c.hp > 0; }) : []);
    alvos.forEach(function (e) {
      if (e.hp <= 0) return;
      if (Math.abs(e.x - ax) < 12 + e.r && Math.abs(e.y - ay) < 12 + e.r) { ferir(e, dano, J.dx, J.dy); acertou = true; }
    });
    if (M.dragao && dist({ x: ax, y: ay }, M.dragao) < 26) { ferirDragao(dano); acertou = true; }
    if (!acertou) minerar();
  }

  function minerar() {
    var f = tileFrente(), t = tile(M.mapa, f.x, f.y), k = f.x + "," + f.y, req = 0, item = null, depois = T.GRAMA, golpes = 3;
    if (t === T.ARVORE) { item = "madeira"; golpes = E.eq.esp >= 2 ? 2 : 3; }
    else if (t === T.PEDRA) { item = "pedra"; req = 1; golpes = Math.max(1, 4 - E.eq.pic); }
    else if (t === T.FERRO) { item = "ferro"; req = 2; golpes = Math.max(1, 5 - E.eq.pic); }
    else if (t === T.OURO) { item = "ouro"; req = 3; golpes = 3; depois = T.CINZA; }
    else return;
    if (E.eq.pic < req) { mostrarMsg("Precisa de " + NOME_PIC[req].toLowerCase() + ".", 1.6); return; }
    M.minas[k] = (M.minas[k] || 0) + 1;
    particulas(f.x * TILE + 8, f.y * TILE + 8, t === T.ARVORE ? "#6B4220" : t === T.OURO ? "#F5D442" : "#8A8A8A", 4);
    if (M.minas[k] >= golpes) {
      delete M.minas[k];
      if (M.nome === "abismo" && t !== T.OURO) depois = T.CINZA;
      pôr(M.mapa, f.x, f.y, depois); add(item, 1); som("pega");
      texto(f.x * TILE + 8, f.y * TILE, "+1 " + ITENS[item][0].toLowerCase());
      if (item === "ferro") conquista("ferro");
    }
  }

  function usar() {
    // conversa com quem está perto
    var npc = M.npcs.filter(function (n) { return dist(n, J) < 26; })[0];
    if (npc) { if (npc.tipo === "mercador") abrirLoja(); else abrirTroca(); return; }
    var f = tileFrente(), t = tile(M.mapa, f.x, f.y);
    if (t === T.PORTAL_OFF) {
      if (E.eq.isq) { acenderPortal(false); return; }
      mostrarMsg("O portal está apagado. Faça um isqueiro (1 ferro e 1 pedra).", 2.4); return;
    }
    if (t === T.PORTA) {
      if (E.inv.olho >= 6) { E.f.torre = true; conquista("torre"); som("portal"); mostrarMsg("Os 6 Olhos do Dragão brilham. A torre se abre!", 2); setTimeout(function () { entrar("fim"); }, 900); }
      else mostrarMsg("A porta tem 6 encaixes. Você tem " + E.inv.olho + " Olho" + (E.inv.olho === 1 ? "" : "s") + " do Dragão.", 2.4);
      return;
    }
    if (t === T.MESA) { abrirMenu("receitas"); return; }
    usarItem();
  }

  function usarItem() {
    var s = E.sel;
    if (s === "arco") {
      if (!E.eq.arco) { mostrarMsg("Você ainda não tem arco.", 1.4); return; }
      if (E.inv.flecha <= 0) { mostrarMsg("Sem flechas. Faça no menu ou compre na vila.", 1.8); return; }
      if (J.cdAtq > 0) return;
      E.inv.flecha--; J.cdAtq = 0.45; som("arco");
      M.proj.push({ x: J.x, y: J.y, vx: J.dx * 190, vy: J.dy * 190, dano: 3, dono: "j", tipo: "flecha", vida: 1.4 });
      return;
    }
    if (!E.inv[s]) { mostrarMsg("Você não tem " + ITENS[s][0].toLowerCase() + ".", 1.4); return; }
    if (s === "pao" || s === "vida") {
      if (E.hp >= 20) { mostrarMsg("A vida já está cheia.", 1.2); return; }
      E.inv[s]--; E.hp = Math.min(20, E.hp + (s === "pao" ? 4 : 10)); som("cura"); texto(J.x, J.y - 10, "+" + (s === "pao" ? 4 : 10) + " vida");
    } else if (s === "fogo") {
      E.inv.fogo--; J.fogo = 90; som("cura"); mostrarMsg("Resistente ao fogo por 90 segundos.", 1.8);
    }
  }
  function opcoesItem() { return USAVEIS.filter(function (u) { return u === "arco" ? E.eq.arco : true; }); }
  function trocarItem() { var o = opcoesItem(), i = o.indexOf(E.sel); E.sel = o[(i + 1) % o.length]; som("clique"); }

  function acenderPortal(silencioso) {
    for (var i = 0; i < M.mapa.t.length; i++) if (M.mapa.t[i] === T.PORTAL_OFF) M.mapa.t[i] = T.PORTAL;
    if (!silencioso) { E.f.portal = true; som("portal"); mostrarMsg("O portal acendeu! Entre nele.", 2); salvar(); }
  }
  function abrirSaida() { retangulo(M.mapa, M.centro.x, M.centro.y - 1, 2, 3, T.PORTAL); }

  // ===================== monstros =====================
  function ferir(e, d, kx, ky) {
    if (e.tipo === "cristal") {
      e.hp -= 1; particulas(e.x, e.y, "#F2A6E6", 6); som("cristal");
      if (e.hp <= 0) {
        E.f.cristais[e.i] = false; texto(e.x, e.y - 10, "Cristal destruído!");
        if (E.f.cristais.every(function (c) { return !c; })) { conquista("cristais"); mostrarMsg("Todos os cristais caíram! O dragão não se cura mais.", 2.4); }
      }
      return;
    }
    e.hp -= d; e.kb = 0.15; e.kx = kx * 120; e.ky = ky * 120; som("acerto");
    particulas(e.x, e.y, "#FFFFFF", 3);
    if (e.def.ia === "teleporte" && e.hp > 0 && Math.random() < 0.5) teleportar(e);
    if (e.hp <= 0) {
      e.morto = true; particulas(e.x, e.y, "#C9C9C9", 8);
      e.def.drops.forEach(function (d) {
        if (Math.random() < d[3]) { var n = d[1] + Math.floor(Math.random() * (d[2] - d[1] + 1)); add(d[0], n); texto(e.x, e.y - 8, "+" + n + " " + ITENS[d[0]][0].toLowerCase());
          if (d[0] === "brasa") conquista("brasa"); }
      });
    }
  }
  function teleportar(e) {
    for (var i = 0; i < 20; i++) {
      var x = e.x + (Math.random() - 0.5) * 120, y = e.y + (Math.random() - 0.5) * 120;
      if (livre(x, y, e.r, false, false)) { particulas(e.x, e.y, "#D98AFF", 6); e.x = x; e.y = y; return; }
    }
  }
  function gerarMonstros(dt) {
    M.tSpawn = (M.tSpawn || 0) - dt;
    if (M.tSpawn > 0) return;
    M.tSpawn = 1.2;
    var max = M.nome === "fim" ? (M.dragao ? 2 : 3) : 7;
    if (M.ents.length >= max) return;
    var tipo;
    if (M.nome === "campos") { var q = Math.random(); tipo = q < 0.45 ? "lodo" : q < 0.7 ? "esqueleto" : "aranha"; }
    else if (M.nome === "abismo") {
      var perto = M.fortaleza && dist(J, { x: M.fortaleza.x * TILE, y: M.fortaleza.y * TILE }) < 200;
      tipo = Math.random() < (perto ? 0.75 : 0.4) ? "diabrete" : "brutamontes";
    } else tipo = "sombra";
    var def = MONSTROS[tipo];
    for (var i = 0; i < 12; i++) {
      var a = Math.random() * Math.PI * 2, d = 110 + Math.random() * 110, x = J.x + Math.cos(a) * d, y = J.y + Math.sin(a) * d;
      var tx = Math.floor(x / TILE), ty = Math.floor(y / TILE), t = tile(M.mapa, tx, ty);
      if (t === T.LAVA || t === T.VAZIO || SOLIDO[t]) continue;
      if (M.seguro && Math.abs(tx - M.seguro.x) < M.seguro.r && Math.abs(ty - M.seguro.y) < M.seguro.r) continue;
      if (!livre(x, y, def.r, def.voa, false)) continue;
      M.ents.push({ tipo: tipo, def: def, x: x, y: y, hp: def.hp, r: def.r, t: Math.random() * 2, cd: 0, wx: 0, wy: 0, wt: 0 });
      return;
    }
  }
  function atualizarMonstros(dt) {
    M.ents.forEach(function (e) {
      var d = dist(e, J), dx = (J.x - e.x) / (d || 1), dy = (J.y - e.y) / (d || 1), v = e.def.vel * dt, ia = e.def.ia;
      e.t += dt; e.cd -= dt;
      if (e.kb > 0) { e.kb -= dt; mover(e, e.kx * dt, e.ky * dt, e.def.voa, false); return; }
      if (d > 420) { e.morto = true; return; }
      if (ia === "atirador") {
        if (d < 52) mover(e, -dx * v, -dy * v, e.def.voa, false);
        else if (d > 96 && d < 220) mover(e, dx * v, dy * v, e.def.voa, false);
        if (d < 150 && e.cd <= 0) {
          e.cd = 2.2;
          var vel = e.def.proj === "fogo" ? 95 : 120;
          M.proj.push({ x: e.x, y: e.y, vx: dx * vel, vy: dy * vel, dano: e.def.dano, dono: "m", tipo: e.def.proj, vida: 2.2 });
        }
      } else {
        if (d < 170) mover(e, dx * v, dy * v, e.def.voa, false);
        else {
          e.wt -= dt;
          if (e.wt <= 0) { e.wt = 1 + Math.random() * 2; var a = Math.random() * Math.PI * 2; e.wx = Math.cos(a); e.wy = Math.sin(a); }
          mover(e, e.wx * v * 0.5, e.wy * v * 0.5, e.def.voa, false);
        }
      }
      if (d < J.r + e.r + 2 && e.cd <= 0 && ia !== "atirador") { e.cd = 0.9; ferirJogador(e.def.dano); }
    });
    M.ents = M.ents.filter(function (e) { return !e.morto; });
  }

  // ===================== dragão =====================
  function ferirDragao(d) {
    var g = M.dragao; if (!g) return;
    g.hp -= d; som("acerto"); particulas(g.x, g.y, "#E07AFF", 6);
    if (g.hp <= 0) {
      M.dragao = null; E.f.dragao = true; conquista("dragao");
      for (var i = 0; i < 40; i++) particulas(g.x, g.y, i % 2 ? "#E07AFF" : "#FFF2A0", 1);
      abrirSaida(); som("vitoria");
      mostrarMsg("O dragão caiu! Entre no portal do centro.", 3);
      salvar();
    }
  }
  function atualizarDragao(dt) {
    var g = M.dragao; if (!g) return;
    var cx = M.centro.x * TILE + 8, cy = M.centro.y * TILE + 8, vivos = M.cristais.filter(function (c) { return c.hp > 0; }).length;
    if (vivos) g.hp = Math.min(g.max, g.hp + vivos * 0.9 * dt);
    g.t -= dt; g.tc -= dt;
    if (g.fase === "voando") {
      g.ang += dt * 0.55;
      var tx = cx + Math.cos(g.ang) * 120, ty = cy + Math.sin(g.ang) * 90;
      g.x += (tx - g.x) * Math.min(1, dt * 2); g.y += (ty - g.y) * Math.min(1, dt * 2);
      if (g.t <= 0) {
        var q = Math.random();
        if (!vivos && q < 0.45) { g.fase = "pousando"; }
        else if (q < 0.75) {
          g.t = 2.2 + Math.random() * 1.5;
          var d = dist(g, J) || 1;
          for (var k = -1; k <= 1; k++) {
            var a = Math.atan2(J.y - g.y, J.x - g.x) + k * 0.25;
            M.proj.push({ x: g.x, y: g.y, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, dano: 4, dono: "m", tipo: "fogo", vida: 3 });
          }
        } else { g.fase = "mergulho"; g.alvo = { x: J.x, y: J.y }; g.t = 1.6; }
      }
    } else if (g.fase === "mergulho") {
      var dd = dist(g, g.alvo) || 1;
      g.x += (g.alvo.x - g.x) / dd * 170 * dt; g.y += (g.alvo.y - g.y) / dd * 170 * dt;
      if (dd < 8 || g.t <= 0) { g.fase = "voando"; g.t = 2 + Math.random() * 2; }
    } else if (g.fase === "pousando") {
      var d2 = Math.sqrt((cx - g.x) * (cx - g.x) + (cy - g.y) * (cy - g.y)) || 1;
      g.x += (cx - g.x) / d2 * 110 * dt; g.y += (cy - g.y) / d2 * 110 * dt;
      if (d2 < 6) { g.fase = "pousado"; g.t = 4.5; mostrarMsg("O dragão pousou! Ataque agora!", 1.4); }
    } else if (g.fase === "pousado") {
      if (g.t <= 0) { g.fase = "voando"; g.t = 3; }
    }
    if (dist(g, J) < 20 && g.tc <= 0 && g.fase !== "pousado") { g.tc = 1; ferirJogador(4); }
  }

  // ===================== projéteis, textos e partículas =====================
  function atualizarProj(dt) {
    M.proj.forEach(function (p) {
      p.vida -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      var t = tile(M.mapa, Math.floor(p.x / TILE), Math.floor(p.y / TILE));
      if (p.dono === "j") {
        var alvos = M.ents.concat(M.cristais ? M.cristais.filter(function (c) { return c.hp > 0; }) : []);
        for (var i = 0; i < alvos.length; i++) {
          if (alvos[i].hp > 0 && dist(p, alvos[i]) < alvos[i].r + 4) { ferir(alvos[i], p.dano, p.vx / 190, p.vy / 190); p.vida = 0; return; }
        }
        if (M.dragao && dist(p, M.dragao) < M.dragao.r) { ferirDragao(p.dano); p.vida = 0; return; }
      } else if (dist(p, J) < J.r + 4) { ferirJogador(p.dano); p.vida = 0; return; }
      if (SOLIDO[t] && t !== T.AGUA && t !== T.VAZIO && t !== T.PILAR && t !== T.PORTAL_OFF) p.vida = 0;
    });
    M.proj = M.proj.filter(function (p) { return p.vida > 0; });
    M.textos.forEach(function (x) { x.t -= dt; x.y -= 14 * dt; });
    M.textos = M.textos.filter(function (x) { return x.t > 0; });
    M.particulas.forEach(function (q) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; });
    M.particulas = M.particulas.filter(function (q) { return q.t > 0; });
  }
  function texto(x, y, s) { M.textos.push({ x: x, y: y, s: s, t: 1.2 }); }
  function particulas(x, y, cor, n) {
    for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, v = 20 + Math.random() * 50; M.particulas.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.4 + Math.random() * 0.3, cor: cor }); }
  }

  // ===================== conquistas e objetivo =====================
  function conquista(id) {
    if (E.conq[id]) return;
    E.conq[id] = true;
    var c = CONQ.filter(function (x) { return x[0] === id; })[0];
    if (c) { mostrarMsg("Missão cumprida: " + c[1], 2.2); som("conquista"); }
  }
  function objetivo() {
    var o = E.inv.olho;
    if (M.nome === "campos") {
      if (E.eq.pic < 1) return ["Bata nas árvores (A) para juntar 3 madeiras. Depois abra o menu (≡ ou M) e faça uma picareta.", null];
      if (E.eq.pic < 2) return ["Minere pedra e faça a picareta de pedra (3 pedras e 2 madeiras).", null];
      if (!E.eq.isq) return ["Ache ferro (rocha com pintas bege) e faça um isqueiro: 1 ferro e 1 pedra.", null];
      if (o >= 6) return ["Você tem os 6 Olhos do Dragão! Vá até a Torre Antiga e use a porta (B).", M.torre];
      if (!E.f.portal) return ["Vá até o portal em ruínas e use o isqueiro nele (B). Siga a seta.", M.portal];
      return ["Entre no portal aceso e vá para o Abismo de Fogo. Leve a picareta de ferro para o ouro.", M.portal];
    }
    if (M.nome === "abismo") {
      if (o >= 6) return ["Você tem os 6 olhos! Volte pelo portal para os Campos.", M.portal];
      var falta = 6 - o;
      var txt = "Olhos " + o + "/6 · brasas " + E.inv.brasa + " · pérolas " + E.inv.perola + ". Diabretes dão brasa; troque ouro por pérola com o Mercador das Cinzas. Faça os olhos no menu.";
      if (E.inv.brasa < falta) return [txt, M.fortaleza];
      if (E.inv.perola < falta) return [txt, { x: M.npcs[0].x / TILE | 0, y: M.npcs[0].y / TILE | 0 }];
      return ["Você tem brasas e pérolas! Abra o menu e faça os Olhos do Dragão.", null];
    }
    var vivos = M.cristais.filter(function (c) { return c.hp > 0; });
    if (vivos.length) { var c = vivos[0]; return ["Destrua os cristais (" + vivos.length + " restantes): eles curam o dragão. Flechas alcançam de longe.", { x: c.x / TILE | 0, y: c.y / TILE | 0 }]; }
    if (M.dragao) return ["Derrote o dragão! Quando ele pousar no centro, ataque com tudo.", null];
    return ["Entre no portal do centro da ilha.", M.centro];
  }

  // ===================== som (beeps simples) =====================
  var AC = null, somLigado = LS.get("rdj-som", true);
  function som(tipo) {
    if (!somLigado) return;
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      var f = { golpe: 180, acerto: 320, pega: 660, dor: 120, arco: 520, cura: 760, portal: 240, cristal: 900, clique: 440, conquista: 880, vitoria: 990, compra: 600 }[tipo] || 400;
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = tipo === "dor" || tipo === "golpe" ? "square" : "triangle";
      o.frequency.setValueAtTime(f, AC.currentTime);
      if (tipo === "conquista" || tipo === "vitoria" || tipo === "portal") o.frequency.exponentialRampToValueAtTime(f * 1.5, AC.currentTime + 0.25);
      g.gain.setValueAtTime(0.06, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 0.25);
      o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + 0.26);
    } catch (e) {}
  }

  // ===================== entrada =====================
  var teclas = {}, joy = { x: 0, y: 0, id: null }, segurandoA = false;
  window.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].indexOf(k) >= 0) e.preventDefault();
    if (!jogando || pausado) {
      if ((k === "m" || k === "escape") && jogando && (!document.getElementById("menu").hidden || !document.getElementById("loja").hidden)) fecharTelas();
      return;
    }
    teclas[k] = true;
    if (e.repeat) return;
    if (k === "j" || k === " ") atacar();
    if (k === "k" || k === "e") usar();
    if (k === "q") trocarItem();
    if (k === "m" || k === "escape") abrirMenu("receitas");
  });
  window.addEventListener("keyup", function (e) { teclas[e.key.toLowerCase()] = false; });
  window.addEventListener("blur", function () { teclas = {}; segurandoA = false; });

  var elToque = document.getElementById("toque"), elDir = document.getElementById("direcional"), elBola = document.getElementById("direcional-bola");
  var ehToque = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
  function centroDir() { var b = elDir.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, r: b.width / 2 }; }
  window.addEventListener("pointerdown", function (e) {
    if (!jogando || pausado || e.pointerType === "mouse") return;
    if (e.target.closest && e.target.closest(".bt")) return;
    if (e.clientX < window.innerWidth * 0.5 && joy.id == null) { joy.id = e.pointerId; moverJoy(e); }
  });
  window.addEventListener("pointermove", function (e) { if (e.pointerId === joy.id) moverJoy(e); });
  function soltarJoy(e) { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; elBola.style.transform = ""; } }
  window.addEventListener("pointerup", soltarJoy); window.addEventListener("pointercancel", soltarJoy);
  function moverJoy(e) {
    var c = centroDir(), dx = e.clientX - c.x, dy = e.clientY - c.y, d = Math.sqrt(dx * dx + dy * dy), max = c.r;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    joy.x = dx / max; joy.y = dy / max;
    elBola.style.transform = "translate(" + dx + "px," + dy + "px)";
  }
  function botao(id, aoApertar, aoSoltar) {
    var b = document.getElementById(id);
    b.addEventListener("pointerdown", function (e) { e.preventDefault(); b.classList.add("ativo"); aoApertar(); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { b.addEventListener(ev, function () { b.classList.remove("ativo"); if (aoSoltar) aoSoltar(); }); });
  }
  botao("bt-a", function () { if (jogando && !pausado) { segurandoA = true; atacar(); } }, function () { segurandoA = false; });
  botao("bt-b", function () { if (jogando && !pausado) usar(); });
  botao("bt-item", function () { if (jogando && !pausado) trocarItem(); });
  botao("bt-menu", function () { if (jogando && !pausado) abrirMenu("receitas"); });

  // ===================== laço principal =====================
  var ultimo = 0, tAnim = 0, tSalvar = 0;
  function laco(agora) {
    var dt = Math.min(0.05, (agora - ultimo) / 1000 || 0); ultimo = agora;
    if (jogando && !pausado) atualizar(dt);
    if (M) desenhar();
    requestAnimationFrame(laco);
  }
  function atualizar(dt) {
    tAnim += dt; E.tempo += dt; tSalvar += dt;
    J.cdAtq -= dt; J.inv -= dt; J.atq -= dt;
    if (J.fogo > 0) J.fogo -= dt;
    if (segurandoA) atacar();
    var mx = 0, my = 0;
    if (teclas.arrowleft || teclas.a) mx -= 1; if (teclas.arrowright || teclas.d) mx += 1;
    if (teclas.arrowup || teclas.w) my -= 1; if (teclas.arrowdown || teclas.s) my += 1;
    if (joy.id != null) { mx = joy.x; my = joy.y; }
    var mag = Math.sqrt(mx * mx + my * my);
    if (mag > 0.2) {
      if (mag > 1) { mx /= mag; my /= mag; }
      var vel = 72 * dt;
      mover(J, mx * vel, my * vel, false, true);
      if (Math.abs(mx) > Math.abs(my)) { J.dir = mx > 0 ? "d" : "e"; J.dx = mx > 0 ? 1 : -1; J.dy = 0; }
      else { J.dir = my > 0 ? "b" : "c"; J.dx = 0; J.dy = my > 0 ? 1 : -1; }
      J.anim += dt;
    }
    E.x = J.x; E.y = J.y;
    // chão especial
    var tAq = tile(M.mapa, Math.floor(J.x / TILE), Math.floor(J.y / TILE));
    if (tAq === T.LAVA) {
      J.lava -= dt;
      if (J.fogo <= 0 && J.lava <= 0) { J.lava = 0.5; ferirJogador(2); if (E.hp > 0) mostrarMsg("A lava queima! Saia ou use a poção contra fogo.", 1.2); }
    }
    if (tAq === T.PORTAL && !M.tPortal) {
      M.tPortal = true; som("portal");
      if (M.nome === "campos") { conquista("abismo"); entrar("abismo"); }
      else if (M.nome === "abismo") entrar("campos", "portal");
      else if (M.nome === "fim") vencer();
      return;
    }
    if (tAq !== T.PORTAL) M.tPortal = false;
    gerarMonstros(dt); atualizarMonstros(dt); atualizarDragao(dt); atualizarProj(dt);
    if (tMsg > 0) { tMsg -= dt; if (tMsg <= 0) elMsg.hidden = true; }
    if (tSalvar > 10) { tSalvar = 0; salvar(); }
    atualizarHud();
  }

  // ===================== desenho =====================
  function ajustarTela() {
    var w = window.innerWidth, h = window.innerHeight;
    if (w >= h) { VH = 200; VW = Math.round(VH * w / h); } else { VW = 220; VH = Math.round(VW * h / w); }
    canvas.width = VW; canvas.height = VH; ctx.imageSmoothingEnabled = false;
    // a caixa do objetivo fica entre os corações e o item; se não couber, desce para baixo deles
    var esc = w / VW, lado = 100 * esc, livreW = w - 2 * lado, el = document.getElementById("hud-obj");
    if (livreW >= 300) { el.style.maxWidth = Math.min(640, livreW - 12) + "px"; el.style.top = ""; }
    else { el.style.maxWidth = (w - 24) + "px"; el.style.top = Math.round(36 * esc) + "px"; }
  }
  window.addEventListener("resize", ajustarTela);
  function desenhar() {
    var m = M.mapa, camX = clamp(Math.round(J.x - VW / 2), 0, Math.max(0, m.w * TILE - VW)), camY = clamp(Math.round(J.y - VH / 2), 0, Math.max(0, m.h * TILE - VH));
    ctx.fillStyle = M.nome === "fim" ? "#0A0812" : "#000"; ctx.fillRect(0, 0, VW, VH);
    var x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE), x1 = Math.ceil((camX + VW) / TILE), y1 = Math.ceil((camY + VH) / TILE);
    var quadro = Math.floor(tAnim * 2) % 2;
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var t = tile(m, x, y), n = TSPR[t];
      if (quadro && (t === T.AGUA || t === T.LAVA || t === T.PORTAL)) n += "2";
      ctx.drawImage(SPR[n], x * TILE - camX, y * TILE - camY);
    }
    // rachaduras da mineração
    for (var k in M.minas) { var p = k.split(","); ctx.fillStyle = "rgba(0,0,0," + (0.15 * M.minas[k]) + ")"; ctx.fillRect(p[0] * TILE - camX + 3, p[1] * TILE - camY + 3, 10, 10); }
    // npcs, cristais, monstros
    M.npcs.forEach(function (n) { desenharSpr(n.tipo, n.x, n.y, camX, camY); if (dist(n, J) < 34) balao(n.x - camX, n.y - camY - 14); });
    if (M.cristais) M.cristais.forEach(function (c) {
      if (c.hp <= 0) return;
      if (M.dragao) { ctx.strokeStyle = "rgba(242,166,230,0.5)"; ctx.beginPath(); ctx.moveTo(c.x - camX, c.y - camY); ctx.lineTo(M.dragao.x - camX, M.dragao.y - camY); ctx.stroke(); }
      desenharSpr("cristal", c.x, c.y + Math.sin(tAnim * 3 + c.i) * 2, camX, camY);
    });
    M.ents.forEach(function (e) {
      var pisca = e.kb > 0 && Math.floor(tAnim * 20) % 2;
      if (!pisca) desenharSpr(e.tipo, e.x, e.y + (e.def.voa ? Math.sin(tAnim * 4 + e.t) * 2 : 0), camX, camY);
      if (e.hp < e.def.hp) { ctx.fillStyle = "#000"; ctx.fillRect(e.x - camX - 7, e.y - camY - 11, 14, 2); ctx.fillStyle = "#E0303A"; ctx.fillRect(e.x - camX - 7, e.y - camY - 11, 14 * e.hp / e.def.hp, 2); }
    });
    // jogador
    if (!(J.inv > 0 && Math.floor(tAnim * 16) % 2)) {
      var bob = Math.floor(J.anim * 8) % 2 ? 1 : 0;
      ctx.drawImage(SPR["heroi_" + J.dir], Math.round(J.x - camX - 8), Math.round(J.y - camY - 9 - bob));
      if (J.fogo > 0) { ctx.strokeStyle = "rgba(245,160,48,0.7)"; ctx.strokeRect(Math.round(J.x - camX - 9), Math.round(J.y - camY - 10), 18, 19); }
    }
    if (J.atq > 0) {
      var ex = J.x + J.dx * 12 - camX, ey = J.y + J.dy * 12 - camY;
      ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fillRect(Math.round(ex - 5), Math.round(ey - 5), 10, 10);
      var es = SPR[E.eq.esp ? "i_esp" + E.eq.esp : "i_pic1"];
      if (E.eq.esp) ctx.drawImage(es, Math.round(ex - 8), Math.round(ey - 8));
    }
    // dragão
    if (M.dragao) {
      var g = M.dragao, s = SPR.dragao;
      ctx.globalAlpha = 0.35; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(g.x - camX, g.y - camY + 22, 18, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.drawImage(s, Math.round(g.x - camX - s.width / 2), Math.round(g.y - camY - s.height / 2 - (g.fase === "pousado" ? 0 : 6)));
    }
    // projéteis
    M.proj.forEach(function (p) {
      if (p.tipo === "fogo") ctx.drawImage(SPR.fogo, Math.round(p.x - camX - 3), Math.round(p.y - camY - 3));
      else { ctx.save(); ctx.translate(Math.round(p.x - camX), Math.round(p.y - camY)); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.drawImage(SPR.flechaP, -4, -4); ctx.restore(); }
    });
    M.particulas.forEach(function (q) { ctx.fillStyle = q.cor; ctx.fillRect(Math.round(q.x - camX), Math.round(q.y - camY), 2, 2); });
    ctx.font = "8px 'Pixelify Sans', monospace"; ctx.textAlign = "center";
    M.textos.forEach(function (x) { ctx.fillStyle = "#000"; ctx.fillText(x.s, Math.round(x.x - camX) + 1, Math.round(x.y - camY) + 1); ctx.fillStyle = "#FFF2A0"; ctx.fillText(x.s, Math.round(x.x - camX), Math.round(x.y - camY)); });
    desenharHudCanvas(camX, camY);
  }
  function desenharSpr(n, x, y, camX, camY) { var s = SPR[n]; ctx.drawImage(s, Math.round(x - camX - s.width / 2), Math.round(y - camY - s.height / 2 - 1)); }
  function balao(x, y) { ctx.fillStyle = "#F2EBDD"; ctx.fillRect(Math.round(x - 4), Math.round(y - 5), 8, 7); ctx.fillStyle = "#2A1E15"; ctx.font = "7px monospace"; ctx.textAlign = "center"; ctx.fillText("B", Math.round(x), Math.round(y + 1)); }
  function desenharHudCanvas(camX, camY) {
    // vida: 10 corações
    for (var i = 0; i < 10; i++) {
      var v = E.hp - i * 2, n = v >= 2 ? "coracao" : v === 1 ? "coracaoMeio" : "coracaoVazio";
      ctx.drawImage(SPR[n], 4 + i * 9, 4, 8, 8);
    }
    // item escolhido e moedas
    var sel = E.sel, icone = sel === "arco" ? "i_arco" : ITENS[sel][1], qt = sel === "arco" ? E.inv.flecha : E.inv[sel];
    ctx.fillStyle = "rgba(18,13,9,0.8)"; ctx.fillRect(VW - 46, 3, 43, 20);
    ctx.drawImage(SPR[icone], VW - 44, 5);
    ctx.font = "8px 'Pixelify Sans', monospace"; ctx.textAlign = "left"; ctx.fillStyle = "#F2EBDD"; ctx.fillText("x" + qt, VW - 26, 16);
    ctx.drawImage(SPR.i_moeda, 4, 15, 8, 8); ctx.fillText(String(E.inv.moeda), 14, 22);
    ctx.drawImage(SPR.i_olho, 34, 15, 8, 8); ctx.fillText(E.inv.olho + "/6", 44, 22);
    ctx.textAlign = "right"; ctx.fillStyle = "#C4B4A0"; ctx.fillText(fmt(E.tempo), VW - 4, 32);
    // seta para o objetivo
    var alvo = objetivoAtual && objetivoAtual[1];
    if (alvo) {
      var ax = alvo.x * TILE + 8 - camX, ay = alvo.y * TILE + 8 - camY;
      if (ax < 0 || ay < 0 || ax > VW || ay > VH) {
        var a = Math.atan2(ay - VH / 2, ax - VW / 2), r = Math.min(VW, VH) / 2 - 22, px = VW / 2 + Math.cos(a) * r, py = VH / 2 + Math.sin(a) * r * 0.9;
        ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.fillStyle = "#FFF2A0"; ctx.strokeStyle = "#2A1E15";
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -6); ctx.lineTo(-2, 0); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      }
    }
  }

  // ===================== HUD em texto =====================
  var elHud = document.getElementById("hud"), elObj = document.getElementById("hud-obj"), elMsg = document.getElementById("hud-msg");
  var elDrag = document.getElementById("hud-dragao"), elDragVida = document.getElementById("hud-dragao-vida");
  var tMsg = 0, objetivoAtual = null, ultimoObj = "";
  function mostrarMsg(s, t) { elMsg.textContent = s; elMsg.hidden = false; tMsg = t || 1.6; }
  function atualizarHud() {
    objetivoAtual = objetivo();
    if (objetivoAtual[0] !== ultimoObj) { ultimoObj = objetivoAtual[0]; elObj.textContent = ultimoObj; }
    elDrag.hidden = !(M.nome === "fim" && M.dragao);
    if (M.dragao) elDragVida.style.width = Math.max(0, M.dragao.hp / M.dragao.max * 100) + "%";
  }

  // ===================== telas (menu, loja, troca) =====================
  var telas = ["titulo", "como", "historia", "menu", "loja", "vitoria"];
  function mostrarTela(id) { telas.forEach(function (t) { document.getElementById(t).hidden = t !== id; }); pausado = !!id; elToque.hidden = !!id || !ehToque || !jogando; elHud.hidden = !jogando; }
  function fecharTelas() { mostrarTela(null); if (jogando && M) atualizarHud(); salvar(); }
  function iconeHtml(spr) { var c = document.createElement("canvas"); c.width = 16; c.height = 16; var x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(SPR[spr], 0, 0, 16, 16); return c; }
  function linha(spr, titulo, sub, botaoTxt, habilitado, aoClicar, classe) {
    var d = document.createElement("div"); d.className = "item-linha" + (classe ? " " + classe : "");
    d.appendChild(iconeHtml(spr));
    var t = document.createElement("div"); t.innerHTML = "<b></b><small></small>"; t.firstChild.textContent = titulo; t.lastChild.textContent = sub; d.appendChild(t);
    if (botaoTxt) { var b = document.createElement("button"); b.type = "button"; b.textContent = botaoTxt; b.disabled = !habilitado; b.addEventListener("click", aoClicar); d.appendChild(b); }
    else d.appendChild(document.createElement("span"));
    return d;
  }
  function custoTxt(c) { return Object.keys(c).map(function (k) { return c[k] + " " + ITENS[k][0].toLowerCase() + " (" + (E.inv[k] || 0) + ")"; }).join(", "); }
  function temCusto(c) { return Object.keys(c).every(function (k) { return (E.inv[k] || 0) >= c[k]; }); }
  var abaAtual = "receitas";
  function abrirMenu(aba) { abaAtual = aba || abaAtual; renderMenu(); mostrarTela("menu"); }
  function renderMenu() {
    document.querySelectorAll("#menu .abas button").forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-aba") === abaAtual)); });
    var el = document.getElementById("menu-conteudo"); el.innerHTML = "";
    if (abaAtual === "receitas") {
      RECEITAS.forEach(function (r) {
        var pode = r.pode(), tem = temCusto(r.custo);
        el.appendChild(linha(r.spr, r.nome, pode ? r.desc + " Leva: " + custoTxt(r.custo) + "." : "Você já tem.", pode ? "Fazer" : null, pode && tem, function () {
          if (!temCusto(r.custo) || !r.pode()) return;
          Object.keys(r.custo).forEach(function (k) { E.inv[k] -= r.custo[k]; });
          r.faz(); som("compra"); renderMenu();
        }, pode ? "" : "feito"));
      });
    } else if (abaAtual === "inventario") {
      el.appendChild(linha("i_pic" + Math.max(1, E.eq.pic), NOME_PIC[E.eq.pic], "Ferramenta", null));
      el.appendChild(linha(E.eq.esp ? "i_esp" + E.eq.esp : "i_esp1", NOME_ESP[E.eq.esp], "Dano " + DANO_ESP[E.eq.esp], null));
      if (E.eq.arm) el.appendChild(linha("i_armadura", "Armadura de ferro", "40% menos dano", null));
      if (E.eq.arco) el.appendChild(linha("i_arco", "Arco", "Use com B quando escolhido", null));
      if (E.eq.isq) el.appendChild(linha("i_isqueiro", "Isqueiro", "Acende portais", null));
      Object.keys(ITENS).forEach(function (k) { if (E.inv[k]) el.appendChild(linha(ITENS[k][1], ITENS[k][0] + " × " + E.inv[k], ITENS[k][2], null)); });
    } else if (abaAtual === "missoes") {
      CONQ.forEach(function (c) { el.appendChild(linha(E.conq[c[0]] ? "i_olho" : "i_moeda", (E.conq[c[0]] ? "✓ " : "") + c[1], c[2], null, false, null, E.conq[c[0]] ? "ok" : "")); });
    } else {
      el.appendChild(linha("i_isqueiro", "Som", somLigado ? "Ligado" : "Desligado", somLigado ? "Desligar" : "Ligar", true, function () { somLigado = !somLigado; LS.set("rdj-som", somLigado); renderMenu(); }));
      el.appendChild(linha("i_moeda", "Tempo de jogo", fmt(E.tempo) + " · " + E.mortes + " queda" + (E.mortes === 1 ? "" : "s"), null));
      el.appendChild(linha("i_pao", "Salvar e sair", "Volta para a tela inicial. Dá para continuar depois.", "Sair", true, function () { salvar(); jogando = false; irTitulo(); }));
    }
  }
  document.querySelectorAll("#menu .abas button").forEach(function (b) { b.addEventListener("click", function () { abaAtual = b.getAttribute("data-aba"); renderMenu(); }); });
  document.getElementById("menu-fechar").addEventListener("click", fecharTelas);

  var elLojaC = document.getElementById("loja-conteudo"), elLojaLog = document.getElementById("loja-log");
  function abrirLoja() {
    document.getElementById("loja-titulo").textContent = "Mercador da vila";
    document.getElementById("loja-sub").textContent = "“Moedas você ganha derrotando monstros. O que vai levar?”";
    elLojaLog.textContent = ""; renderLoja(); mostrarTela("loja");
  }
  function renderLoja() {
    elLojaC.innerHTML = "";
    elLojaC.appendChild(linha("i_moeda", "Suas moedas: " + E.inv.moeda, "", null));
    LOJA.forEach(function (o) {
      elLojaC.appendChild(linha(ITENS[o.item][1], (o.qtd > 1 ? o.qtd + " " : "") + ITENS[o.item][0], ITENS[o.item][2] + " Preço: " + o.preco + " moedas.", "Comprar", E.inv.moeda >= o.preco, function () {
        if (E.inv.moeda < o.preco) return;
        E.inv.moeda -= o.preco; add(o.item, o.qtd); som("compra"); elLojaLog.textContent = "Comprou " + (o.qtd > 1 ? o.qtd + " " : "") + ITENS[o.item][0].toLowerCase() + "."; renderLoja();
      }));
    });
  }
  function abrirTroca() {
    document.getElementById("loja-titulo").textContent = "Mercador das Cinzas";
    document.getElementById("loja-sub").textContent = "“Ouro! Me dê ouro e eu te dou… alguma coisa.” Cada barra vale um sorteio.";
    elLojaLog.textContent = ""; renderTroca(); mostrarTela("loja");
  }
  function sortearTroca() {
    var tot = TROCA.reduce(function (s, t) { return s + t[3]; }, 0), q = Math.random() * tot;
    for (var i = 0; i < TROCA.length; i++) { q -= TROCA[i][3]; if (q <= 0) return TROCA[i]; }
    return TROCA[TROCA.length - 1];
  }
  function renderTroca() {
    elLojaC.innerHTML = "";
    elLojaC.appendChild(linha("i_ouro", "Seu ouro: " + E.inv.ouro, "Minere ouro com a picareta de ferro ou derrote brutamontes.", "Dar 1 ouro", E.inv.ouro > 0, function () {
      if (E.inv.ouro <= 0) return;
      E.inv.ouro--; conquista("troca");
      var t = sortearTroca();
      if (!t[0]) { elLojaLog.textContent = "Ele examinou o ouro e te deu… só cinzas."; som("clique"); }
      else { var n = t[1] + Math.floor(Math.random() * (t[2] - t[1] + 1)); add(t[0], n); som("pega"); elLojaLog.textContent = "Você ganhou " + n + " " + ITENS[t[0]][0].toLowerCase() + "!"; }
      renderTroca();
    }));
    elLojaC.appendChild(linha("i_perola", "Pérolas: " + E.inv.perola + " · Brasas: " + E.inv.brasa, "Cada Olho do Dragão leva 1 pérola e 1 brasa.", null));
  }
  document.getElementById("loja-fechar").addEventListener("click", fecharTelas);

  // ===================== início, salvar, vitória =====================
  function salvar() { if (E && jogando) LS.set("rdj-save", E); }
  function irTitulo() {
    var s = LS.get("rdj-save", null);
    document.getElementById("t-continuar").hidden = !(s && s.v === 1 && !s.f.dragao);
    var rec = LS.get("rdj-recorde", null);
    document.getElementById("t-recorde").textContent = rec ? "Seu recorde: " + fmt(rec) : "";
    mostrarTela("titulo");
  }
  var HIST = [
    "Dizem que o dragão dormia no Fim desde sempre. Ontem ele acordou.",
    "Para chegar até ele, é preciso atravessar os Campos e o Abismo de Fogo e juntar 6 Olhos do Dragão, que abrem a Torre Antiga.",
    "Comece com as mãos: madeira, pedra, ferro. O resto, você descobre no caminho."
  ];
  var passoHist = 0;
  document.getElementById("t-novo").addEventListener("click", function () {
    E = novoEstado(); passoHist = 0;
    document.getElementById("historia-texto").textContent = HIST[0]; mostrarTela("historia");
  });
  document.getElementById("historia-seguir").addEventListener("click", function () {
    passoHist++;
    if (passoHist < HIST.length) { document.getElementById("historia-texto").textContent = HIST[passoHist]; return; }
    comecar(true);
  });
  document.getElementById("t-continuar").addEventListener("click", function () {
    var s = LS.get("rdj-save", null); if (!s) return;
    E = s; comecar(false);
  });
  document.getElementById("t-como").addEventListener("click", function () { mostrarTela("como"); });
  document.getElementById("como-voltar").addEventListener("click", function () { if (jogando) mostrarTela("menu"); else irTitulo(); });
  document.getElementById("vitoria-novo").addEventListener("click", function () { document.getElementById("t-novo").click(); });

  function comecar(novo) {
    jogando = true; ultimoObj = "";
    var mundo = E.mundo || "campos", pos = null;
    if (!novo && E.x) pos = { x: Math.floor(E.x / TILE), y: Math.floor(E.y / TILE) };
    entrar(mundo, pos);
    if (!novo && pos) { J.x = E.x; J.y = E.y; }
    mostrarTela(null);
  }
  function vencer() {
    jogando = false;
    if (E.tempo < 20 * 60) conquista("rapido");
    if (E.mortes === 0) conquista("imortal");
    var rec = LS.get("rdj-recorde", null), novo = !rec || E.tempo < rec;
    if (novo) LS.set("rdj-recorde", E.tempo);
    var feitas = CONQ.filter(function (c) { return E.conq[c[0]]; }).length;
    document.getElementById("vitoria-texto").textContent = "Tempo: " + fmt(E.tempo) + (novo ? " (recorde novo!)" : " · recorde: " + fmt(rec)) +
      ". Quedas: " + E.mortes + ". Missões: " + feitas + " de " + CONQ.length + ". A Rota do Dragão está completa.";
    LS.del("rdj-save");
    mostrarTela("vitoria");
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) { salvar(); teclas = {}; } });

  // para testes automatizados
  window.__rd = { estado: function () { return E; }, mundo: function () { return M; }, jogador: J, entrar: entrar, add: add, objetivo: function () { return objetivo(); }, usar: usar, atacar: atacar };

  // usa o mesmo service worker do guia: o jogo abre sem internet e pode ser instalado
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () { navigator.serviceWorker.register("../sw.js").catch(function () {}); });
  }

  ajustarTela();
  irTitulo();
  requestAnimationFrame(laco);
})();
