/* Rota do Dragão: o jogo. Aventura em 3D low-poly vista de cima, feita com Three.js.
   Três mundos (Campos, Abismo de Fogo e o Fim), receitas, loja, escambo e o dragão.
   Os ícones dos itens e do HUD continuam em pixel art, desenhados a partir de moldes de 8x8. */
import * as THREE from "./vendor/three.module.min.js";
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
  var canvas = document.getElementById("tela");
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
      npcs: [{ tipo: "mercador", tx: c + 5, ty: c + 1 }], seguro: { x: c, y: c, r: 10 },
      casas: [{ x: c - 7, y: c - 5, w: 6, h: 5 }, { x: c + 2, y: c - 5, w: 6, h: 5 }] };
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
    if (R.pronto) { construirMundo(); R.camIni = false; }
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
      pôr(M.mapa, f.x, f.y, depois); tileMudou(f.x, f.y); add(item, 1); som("pega");
      texto(f.x * TILE + 8, f.y * TILE, "+1 " + ITENS[item][0].toLowerCase());
      if (item === "ferro") conquista("ferro");
    }
  }

  function usar() {
    // conversa com quem está perto
    var npc = M.npcs.filter(function (n) { return dist(n, J) < 26; })[0];
    if (npc) { if (npc.tipo === "mercador") abrirLoja(); else abrirTroca(); return; }
    // portal, porta da torre ou mesa: vale o que estiver à frente ou em volta do jogador
    var f = tileFrente(), t = tile(M.mapa, f.x, f.y), jx = Math.floor(J.x / TILE), jy = Math.floor(J.y / TILE);
    var USAVEL = [T.PORTAL_OFF, T.PORTA, T.MESA];
    if (USAVEL.indexOf(t) < 0) {
      for (var oy = -1; oy <= 1 && USAVEL.indexOf(t) < 0; oy++) for (var ox = -1; ox <= 1; ox++) {
        var tv = tile(M.mapa, jx + ox, jy + oy); if (USAVEL.indexOf(tv) >= 0) { t = tv; break; }
      }
    }
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
    if (R.grupo && !silencioso) { construirPortais(); montarMinimapa(); }
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
      if (E.eq.pic < 1) return ["Bata nas árvores (clique ou A) para juntar 3 madeiras. Depois abra o menu (M ou ≡) e faça uma picareta.", null];
      if (E.eq.pic < 2) return ["Minere pedra e faça a picareta de pedra (3 pedras e 2 madeiras).", null];
      if (!E.eq.isq) return ["Ache ferro (rocha com pintas bege) e faça um isqueiro: 1 ferro e 1 pedra.", null];
      if (o >= 6) return ["Você tem os 6 Olhos do Dragão! Vá até a Torre Antiga e use a porta (E ou B).", M.torre];
      if (!E.f.portal) return ["Vá até o portal em ruínas e use o isqueiro nele (E ou B). Siga a seta.", M.portal];
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
  var AC = null, somLigado = LS.get("rdj-som", true), musicaLigada = LS.get("rdj-musica", true), ruidoBuf = null;
  function audio() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); return AC; }
  // barulho curto filtrado: golpes, pedra quebrando, passos
  function chiado(freq, dur, vol, tipoFiltro) {
    var ac = audio();
    if (!ruidoBuf) { ruidoBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate); var d = ruidoBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = ruidoBuf; f.type = tipoFiltro || "bandpass"; f.frequency.value = freq; f.Q.value = 1.2;
    g.gain.setValueAtTime(vol, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(ac.destination); src.start(); src.stop(ac.currentTime + dur + 0.02);
  }
  function som(tipo) {
    if (!somLigado) return;
    try {
      audio();
      if (tipo === "golpe") { chiado(900, 0.12, 0.12); return; }
      if (tipo === "acerto") { chiado(400, 0.15, 0.2, "lowpass"); }
      if (tipo === "dor") { chiado(250, 0.25, 0.25, "lowpass"); }
      var f = { golpe: 180, acerto: 320, pega: 660, dor: 120, arco: 520, cura: 760, portal: 240, cristal: 900, clique: 440, conquista: 880, vitoria: 990, compra: 600 }[tipo] || 400;
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = tipo === "dor" || tipo === "golpe" ? "square" : "triangle";
      o.frequency.setValueAtTime(f, AC.currentTime);
      if (tipo === "conquista" || tipo === "vitoria" || tipo === "portal") o.frequency.exponentialRampToValueAtTime(f * 1.5, AC.currentTime + 0.25);
      g.gain.setValueAtTime(0.06, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 0.25);
      o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + 0.26);
    } catch (e) {}
  }

  // música ambiente feita na hora: notas suaves e um acorde de fundo, diferentes em cada mundo
  var MUSICA = {
    campos: { escala: [0, 2, 4, 7, 9], base: 60, acordes: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], tom: "triangle", passo: 0.42, chance: 0.55 },
    abismo: { escala: [0, 1, 3, 7, 8], base: 48, acordes: [[0, 3, 7], [1, 5, 8], [-2, 1, 5], [0, 3, 7]], tom: "sawtooth", passo: 0.6, chance: 0.35 },
    fim: { escala: [0, 2, 4, 6, 8, 10], base: 57, acordes: [[0, 4, 8], [2, 6, 10], [-2, 2, 6], [0, 4, 8]], tom: "sine", passo: 0.55, chance: 0.45 }
  };
  var mus = { proxima: 0, passo: 0, mestre: null, mundo: null };
  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function tocarNota(nota, quando, dur, vol, tom, alvo) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = tom; o.frequency.value = hz(nota);
    g.gain.setValueAtTime(0.0001, quando); g.gain.linearRampToValueAtTime(vol, quando + Math.min(0.08, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
    o.connect(g); g.connect(alvo); o.start(quando); o.stop(quando + dur + 0.05);
  }
  function atualizarMusica() {
    var tocar = musicaLigada && jogando && !document.hidden && M;
    if (!tocar) { if (mus.mestre) { mus.mestre.gain.setTargetAtTime(0, AC.currentTime, 0.3); } return; }
    try {
      audio();
      if (!mus.mestre) {
        mus.mestre = AC.createGain(); mus.mestre.gain.value = 0;
        var filtro = AC.createBiquadFilter(); filtro.type = "lowpass"; filtro.frequency.value = 2200;
        mus.mestre.connect(filtro); filtro.connect(AC.destination);
      }
      mus.mestre.gain.setTargetAtTime(M.nome === "abismo" ? 0.05 : 0.07, AC.currentTime, 0.5);
      var cfg = MUSICA[M.nome];
      if (mus.mundo !== M.nome) { mus.mundo = M.nome; mus.proxima = AC.currentTime + 0.3; mus.passo = 0; }
      // agenda as próximas notas com uma pequena folga, para não engasgar
      while (mus.proxima < AC.currentTime + 0.6) {
        var t = mus.proxima, compasso = Math.floor(mus.passo / 8) % cfg.acordes.length;
        if (mus.passo % 8 === 0) cfg.acordes[compasso].forEach(function (n) { tocarNota(cfg.base - 12 + n, t, cfg.passo * 8.2, 0.16, "sine", mus.mestre); });
        if (Math.random() < cfg.chance) {
          var grau = cfg.escala[Math.floor(Math.random() * cfg.escala.length)], oit = Math.random() < 0.3 ? 12 : 0;
          tocarNota(cfg.base + grau + oit, t, cfg.passo * (Math.random() < 0.3 ? 3 : 1.6), 0.22, cfg.tom === "sawtooth" ? "triangle" : cfg.tom, mus.mestre);
        }
        mus.passo++; mus.proxima += cfg.passo;
      }
    } catch (e) {}
  }
  setInterval(function () { if (AC || (musicaLigada && jogando)) atualizarMusica(); }, 250);

  // ===================== entrada =====================
  // PC: WASD anda, o mouse mira, clique esquerdo quebra/corta/ataca, clique direito usa o item, E fala e usa portais.
  var teclas = {}, joy = { x: 0, y: 0, id: null }, segurandoA = false, mira = null, usouMouse = false;
  window.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].indexOf(k) >= 0) e.preventDefault();
    if (!jogando || pausado) {
      if ((k === "m" || k === "escape") && jogando && (!document.getElementById("menu").hidden || !document.getElementById("loja").hidden)) fecharTelas();
      return;
    }
    teclas[k] = true;
    if (e.repeat) return;
    if (k === " " || k === "j") atacar();
    if (k === "e" || k === "k" || k === "f") usar();
    if (k === "r") usarItem();
    if (k === "q") trocarItem();
    if (k === "m" || k === "escape" || k === "tab") { e.preventDefault(); abrirMenu("receitas"); }
  });
  window.addEventListener("keyup", function (e) { teclas[e.key.toLowerCase()] = false; });
  window.addEventListener("blur", function () { teclas = {}; segurandoA = false; });
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  // zoom: rodinha do mouse no computador, pinça com dois dedos no celular
  var zoom = LS.get("rdj-zoom", 1);
  function mudarZoom(z) { zoom = Math.max(0.65, Math.min(1.6, z)); LS.set("rdj-zoom", Math.round(zoom * 100) / 100); }
  canvas.addEventListener("wheel", function (e) { if (!jogando || pausado) return; e.preventDefault(); mudarZoom(zoom * (e.deltaY > 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
  var pinca = null;
  function distToques(t) { var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy); }
  window.addEventListener("touchstart", function (e) {
    if (e.touches.length === 2 && jogando && !pausado && !(e.target.closest && e.target.closest(".bt"))) {
      pinca = { d: distToques(e.touches), z: zoom }; joy.id = null; joy.x = joy.y = 0; elBola.style.transform = "";
    }
  }, { passive: true });
  window.addEventListener("touchmove", function (e) { if (pinca && e.touches.length === 2) mudarZoom(pinca.z * pinca.d / Math.max(20, distToques(e.touches))); }, { passive: true });
  window.addEventListener("touchend", function (e) { if (e.touches.length < 2) pinca = null; });
  canvas.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse") { usouMouse = true; mira = { cx: e.clientX, cy: e.clientY }; } });
  canvas.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || !jogando || pausado) return;
    usouMouse = true; mira = { cx: e.clientX, cy: e.clientY }; atualizarMira();
    if (e.button === 0) { segurandoA = true; atacar(); }
    else if (e.button === 2) usarItem();
  });
  window.addEventListener("pointerup", function (e) { if (e.pointerType === "mouse" && e.button === 0) segurandoA = false; });

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
    if (M && R.pronto) { desenhar(dt); medirVelocidade(); }
    requestAnimationFrame(laco);
  }
  function atualizar(dt) {
    tAnim += dt; E.tempo += dt; tSalvar += dt;
    J.cdAtq -= dt; J.inv -= dt; J.atq -= dt;
    if (J.fogo > 0) J.fogo -= dt;
    if (segurandoA) atacar();
    var mx = 0, my = 0;
    if (teclas.a || teclas.arrowleft) mx -= 1; if (teclas.d || teclas.arrowright) mx += 1;
    if (teclas.w || teclas.arrowup) my -= 1; if (teclas.s || teclas.arrowdown) my += 1;
    if (joy.id != null) { mx = joy.x; my = joy.y; }
    var mag = Math.sqrt(mx * mx + my * my);
    J.andando = mag > 0.2;
    if (J.andando) {
      if (mag > 1) { mx /= mag; my /= mag; }
      var vel = 74 * dt;
      mover(J, mx * vel, my * vel, false, true);
      J.anim += dt;
      if (!usouMouse || joy.id != null) { var mm = Math.sqrt(mx * mx + my * my) || 1; J.dx = mx / mm; J.dy = my / mm; }
    }
    if (usouMouse && joy.id == null) atualizarMira();
    E.x = J.x; E.y = J.y;
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

  // ===================== motor 3D (Three.js, low-poly) =====================
  // 1 tile = 1 unidade. O x do mapa vira x no 3D e o y do mapa vira z.
  var R = { pronto: false, grupo: null, porTile: {}, modelos: [], tPortal: 0 };
  var hud = document.getElementById("hud2d"), hctx = hud.getContext("2d");
  var GEO = {}, MAT = {};
  function cor(h) { return new THREE.Color(h); }
  function mat(nome, opc) { if (!MAT[nome]) MAT[nome] = new THREE.MeshStandardMaterial(Object.assign({ flatShading: true, roughness: 0.85, metalness: 0 }, opc)); return MAT[nome]; }

  // qualidade gráfica: alta no computador, média no celular; cai sozinha se o jogo ficar lento
  var QUAL = {
    alta: { nome: "Alta", pr: function () { return Math.min(window.devicePixelRatio || 1, 2); }, sombra: 2048, capim: 1, ar: 1 },
    media: { nome: "Média", pr: function () { return Math.min(window.devicePixelRatio || 1, 1.25); }, sombra: 1024, capim: 0.5, ar: 0.6 },
    baixa: { nome: "Baixa", pr: function () { return Math.min(window.devicePixelRatio || 1, 0.85); }, sombra: 0, capim: 0, ar: 0.3 }
  };
  var ORDEM_QUAL = ["alta", "media", "baixa"];
  var qualEscolhida = LS.get("rdj-qual", null), qualidade = QUAL[qualEscolhida] ? qualEscolhida : (ehToque ? "media" : "alta");
  function aplicarQualidade() {
    if (!R.pronto) return;
    var q = QUAL[qualidade];
    R.ren.setPixelRatio(q.pr()); ajustarTela();
    R.ren.shadowMap.enabled = !!q.sombra;
    if (q.sombra) { R.sol.shadow.mapSize.set(q.sombra, q.sombra); if (R.sol.shadow.map) { R.sol.shadow.map.dispose(); R.sol.shadow.map = null; } }
    R.cena.traverse(function (o) { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.needsUpdate = true; }); });
    if (M) construirMundo();
  }
  // mede a velocidade nos primeiros segundos de jogo; se ficar abaixo de 24 quadros por segundo, baixa um nível
  var medida = { ini: 0, n: 0, feita: false };
  function medirVelocidade() {
    if (medida.feita || qualEscolhida || !jogando || pausado) { medida.ini = 0; return; }
    var agora = performance.now();
    if (!medida.ini) { medida.ini = agora; medida.n = 0; return; }
    var seg = (agora - medida.ini) / 1000;
    if (seg < 1.5) return; // começo de mundo sempre engasga
    if (medida.n0 == null) { medida.n0 = medida.n; medida.t0 = agora; }
    medida.n++;
    if (seg > 6.5) {
      medida.feita = true;
      var fps = (medida.n - medida.n0) / ((agora - medida.t0) / 1000);
      if (fps < 24 && qualidade !== "baixa") {
        qualidade = ORDEM_QUAL[ORDEM_QUAL.indexOf(qualidade) + 1]; aplicarQualidade();
        if (qualidade !== "baixa") { medida = { ini: 0, n: 0, feita: false }; } // mede de novo no nível novo
        mostrarMsg("Gráficos ajustados para " + QUAL[qualidade].nome.toLowerCase() + " para o jogo ficar mais leve. Dá para mudar em Opções.", 3);
      }
    }
  }
  function iniciar3d() {
    R.ren = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
    R.ren.setPixelRatio(QUAL[qualidade].pr());
    R.ren.shadowMap.enabled = true; R.ren.shadowMap.type = THREE.PCFSoftShadowMap;
    R.ren.outputColorSpace = THREE.SRGBColorSpace; R.ren.toneMapping = THREE.ACESFilmicToneMapping; R.ren.toneMappingExposure = 1.12;
    R.cena = new THREE.Scene();
    R.cam = new THREE.PerspectiveCamera(40, 1, 0.1, 220);
    R.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3a2a1a, 0.9); R.cena.add(R.hemi);
    R.sol = new THREE.DirectionalLight(0xfff1d6, 1.7); R.sol.castShadow = true;
    var ms = QUAL[qualidade].sombra || 1024; R.sol.shadow.mapSize.set(ms, ms); R.ren.shadowMap.enabled = !!QUAL[qualidade].sombra;
    var sc = R.sol.shadow.camera; sc.left = -20; sc.right = 20; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 60;
    R.sol.shadow.bias = -0.0006; R.sol.shadow.normalBias = 0.02;
    R.cena.add(R.sol); R.cena.add(R.sol.target);
    R.ray = new THREE.Raycaster(); R.chao = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    // geometrias compartilhadas
    GEO.tronco = new THREE.CylinderGeometry(0.11, 0.16, 0.8, 6); GEO.tronco.translate(0, 0.4, 0);
    GEO.copa = new THREE.IcosahedronGeometry(0.62, 0); GEO.copa.translate(0, 1.15, 0);
    GEO.copa2 = new THREE.IcosahedronGeometry(0.42, 0); GEO.copa2.translate(0, 1.65, 0);
    GEO.rocha = new THREE.DodecahedronGeometry(0.48, 0); GEO.rocha.scale(1, 0.75, 1); GEO.rocha.translate(0, 0.28, 0);
    GEO.gema = new THREE.OctahedronGeometry(0.13, 0);
    GEO.caixa = new THREE.BoxGeometry(1, 1, 1); GEO.caixa.translate(0, 0.5, 0);
    GEO.prisma = new THREE.CylinderGeometry(0.48, 0.52, 1, 6); GEO.prisma.translate(0, 0.5, 0);
    GEO.flor = new THREE.ConeGeometry(0.07, 0.22, 5); GEO.flor.translate(0, 0.11, 0);
    GEO.tufo = new THREE.ConeGeometry(0.05, 0.25, 4); GEO.tufo.translate(0, 0.12, 0);
    GEO.esfera = new THREE.IcosahedronGeometry(0.5, 1);
    GEO.pinho1 = new THREE.ConeGeometry(0.6, 0.9, 7); GEO.pinho1.translate(0, 0.95, 0);
    GEO.pinho2 = new THREE.ConeGeometry(0.45, 0.75, 7); GEO.pinho2.translate(0, 1.45, 0);
    GEO.pinho3 = new THREE.ConeGeometry(0.28, 0.55, 7); GEO.pinho3.translate(0, 1.9, 0);
    GEO.rochas = [0, 1, 2].map(function (v) { return rochaIrregular(v); });
    GEO.capim = capim();
    for (var k in GEO) GEO[k].compartilhada = true;
    GEO.rochas.forEach(function (g) { g.compartilhada = true; });
    R.uTempo = { value: 0 };
    R.pronto = true;
  }

  // rocha com cantos deslocados (o mesmo canto recebe sempre o mesmo deslocamento, então não abre buracos)
  function rochaIrregular(v) {
    var g = new THREE.DodecahedronGeometry(0.48, v === 2 ? 1 : 0), p = g.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + v * 11.1) * 43758.5453; h = h - Math.floor(h);
      var k = 0.78 + h * 0.4; p.setXYZ(i, x * k, y * k * (0.7 + v * 0.08), z * k);
    }
    g.computeVertexNormals(); g.translate(0, 0.26, 0); return g;
  }
  // tufo de capim: três folhas finas em ângulos diferentes
  function capim() {
    var pos = [];
    for (var i = 0; i < 3; i++) {
      var a = i * 2.1, c = Math.cos(a) * 0.05, s_ = Math.sin(a) * 0.05, ix = Math.cos(a + 0.6) * 0.06, iz = Math.sin(a + 0.6) * 0.06;
      pos.push(-c, 0, -s_, c, 0, s_, ix, 0.28 + i * 0.05, iz, c, 0, s_, -c, 0, -s_, ix, 0.28 + i * 0.05, iz);
    }
    var g = new THREE.BufferGeometry(), nor = []; for (var k = 0; k < pos.length / 3; k++) nor.push(0, 1, 0);
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); return g;
  }
  // vento: folhas, flores e capim balançam no shader (quanto mais alto o vértice, mais balança)
  function comVento(material, forca, base) {
    material.onBeforeCompile = function (sh) {
      sh.uniforms.uTempo = R.uTempo;
      sh.vertexShader = "uniform float uTempo;\n" + sh.vertexShader.replace("#include <begin_vertex>", [
        "#include <begin_vertex>",
        "#ifdef USE_INSTANCING",
        "vec3 ip = instanceMatrix[3].xyz;",
        "#else",
        "vec3 ip = vec3(0.0);",
        "#endif",
        "float hv = max(position.y - " + base.toFixed(2) + ", 0.0);",
        "transformed.x += sin(uTempo * 1.8 + ip.x * 0.7 + ip.z * 0.4) * hv * " + forca.toFixed(3) + ";",
        "transformed.z += cos(uTempo * 1.4 + ip.x * 0.3 + ip.z * 0.8) * hv * " + (forca * 0.6).toFixed(3) + ";"].join("\n"));
    };
    material.customProgramCacheKey = function () { return "vento" + forca + "_" + base; };
    return material;
  }
  // ondas na água e na lava (plano subdividido; as facetas brilham com o sol)
  function comOndas(material, amp, vel) {
    material.onBeforeCompile = function (sh) {
      sh.uniforms.uTempo = R.uTempo;
      sh.vertexShader = "uniform float uTempo;\n" + sh.vertexShader.replace("#include <begin_vertex>", [
        "#include <begin_vertex>",
        "transformed.z += (sin(position.x * 1.7 + uTempo * " + vel.toFixed(2) + ") + cos(position.y * 1.3 + uTempo * " + (vel * 0.8).toFixed(2) + ") + sin((position.x + position.y) * 0.9 - uTempo * " + (vel * 0.6).toFixed(2) + ")) * " + amp.toFixed(3) + ";"].join("\n"));
    };
    material.customProgramCacheKey = function () { return "ondas" + amp + "_" + vel; };
    return material;
  }
  // altura do chão em qualquer ponto (mesma divisão de triângulos do terreno)
  function alturaEm(x, z) {
    var c = R.cant; if (!c) return 0;
    var W = R.cantW, x0 = Math.floor(x), z0 = Math.floor(z);
    if (x0 < 0 || z0 < 0 || x0 >= W - 1 || z0 >= R.cantH - 1) return 0;
    var fx = x - x0, fz = z - z0, i = z0 * W + x0, a = c[i], b = c[i + 1], cc = c[i + W], d = c[i + W + 1];
    return fx + fz < 1 ? a + (b - a) * fx + (cc - a) * fz : d + (cc - d) * (1 - fx) + (b - d) * (1 - fz);
  }
  function alturaBase(t) {
    if (t === T.AGUA || t === T.PONTE) return -0.45;
    if (t === T.LAVA) return -0.4;
    if (t === T.AREIA) return 0.02;
    if (t === T.CAMINHO) return 0.04;
    if (t === T.CHAO || t === T.PAREDE || t === T.MESA) return 0.06;
    if (t === T.VAZIO) return -6;
    return 0.1;
  }
  var COR_CHAO = {};
  COR_CHAO[T.GRAMA] = "#58A238"; COR_CHAO[T.GRAMA2] = "#5EA83C"; COR_CHAO[T.FLOR] = "#58A238"; COR_CHAO[T.AGUA] = "#2E5A9E"; COR_CHAO[T.PONTE] = "#2E5A9E";
  COR_CHAO[T.AREIA] = "#E3D59A"; COR_CHAO[T.CAMINHO] = "#B08A5E"; COR_CHAO[T.CHAO] = "#C49A6C"; COR_CHAO[T.PAREDE] = "#C49A6C"; COR_CHAO[T.MESA] = "#C49A6C";
  COR_CHAO[T.LAVA] = "#7A2A10"; COR_CHAO[T.CINZA] = "#8A5446"; COR_CHAO[T.FIMCHAO] = "#E5E0A8"; COR_CHAO[T.TORRE] = "#7E7E7E"; COR_CHAO[T.PORTA] = "#7E7E7E";
  COR_CHAO[T.TIJOLO] = "#5E3C35"; COR_CHAO[T.PORTAL] = "#1E0F2E"; COR_CHAO[T.PORTAL_OFF] = "#1E0F2E";
  function corChao(t) {
    if (COR_CHAO[t]) return COR_CHAO[t];
    if (M.nome === "abismo") return COR_CHAO[T.CINZA];
    if (M.nome === "fim") return COR_CHAO[T.FIMCHAO];
    return COR_CHAO[T.GRAMA];
  }

  function construirMundo() {
    if (R.grupo) { R.cena.remove(R.grupo); R.grupo.traverse(function (o) { if (o.geometry && !o.geometry.compartilhada) o.geometry.dispose(); }); }
    R.modelos.forEach(function (o) { if (o.parent) o.parent.remove(o); }); R.modelos = [];
    M.ents.forEach(function (e) { e.obj = null; }); M.proj.forEach(function (q) { q.obj = null; });
    R.grupo = new THREE.Group(); R.cena.add(R.grupo); R.porTile = {};
    var m = M.mapa, rnd = gerador(E.seed + (M.nome === "abismo" ? 5 : M.nome === "fim" ? 9 : 1));
    // clima de cada mundo
    var ceu = { campos: 0xa9d4f2, abismo: 0x3a0e08, fim: 0x0c0818 }[M.nome];
    R.cena.background = cor(ceu); R.cena.fog = new THREE.Fog(ceu, M.nome === "campos" ? 24 : 15, M.nome === "campos" ? 52 : 38);
    if (M.nome === "campos") { R.hemi.color.set(0xc4e0ff); R.hemi.groundColor.set(0x5a4a2a); R.hemi.intensity = 0.8; R.sol.color.set(0xffe0b0); R.sol.intensity = 2.3; }
    else if (M.nome === "abismo") { R.hemi.color.set(0xffa070); R.hemi.groundColor.set(0x4a1a10); R.hemi.intensity = 1.15; R.sol.color.set(0xffb080); R.sol.intensity = 1.4; }
    else { R.hemi.color.set(0xb8a0ff); R.hemi.groundColor.set(0x14101e); R.hemi.intensity = 0.65; R.sol.color.set(0xe8dcff); R.sol.intensity = 1.0; }
    // relevo: morros suaves longe das construções, caminhos e água; perto delas o chão fica plano
    var W = m.w, H = m.h, cant = new Float32Array((W + 1) * (H + 1)), corC = new Float32Array((W + 1) * (H + 1) * 3);
    var NATURAL = {}; [T.GRAMA, T.GRAMA2, T.FLOR, T.ARVORE, T.PEDRA, T.FERRO, T.OURO, T.BASALTO, T.CINZA, T.FIMCHAO, T.AREIA].forEach(function (t) { NATURAL[t] = 1; });
    var rH = gerador(E.seed + 31), morro1 = ruido(rH, 9), morro2 = ruido(rH, 4), mancha = ruido(rH, 7), mancha2 = ruido(rH, 3);
    var ampMundo = M.nome === "campos" ? 1.1 : M.nome === "abismo" ? 1.3 : 0.6;
    var c3 = new THREE.Color(), cA = new THREE.Color();
    for (var cy = 0; cy <= H; cy++) for (var cx = 0; cx <= W; cx++) {
      var s = 0, n = 0, minimo = 9, cr = 0, cg = 0, cb = 0, nc = 0;
      for (var oy = -1; oy <= 0; oy++) for (var ox = -1; ox <= 0; ox++) {
        var tt = tile(m, cx + ox, cy + oy); if (tt === T.VAZIO && M.nome !== "fim") tt = M.nome === "abismo" ? T.BASALTO : T.ARVORE;
        var hb = alturaBase(tt); s += hb; n++; if (hb < minimo) minimo = hb;
        if (tt !== T.VAZIO && (NATURAL[tt] || tt === T.AGUA || tt === T.LAVA)) { cA.set(corChao(tt)); cr += cA.r; cg += cA.g; cb += cA.b; nc++; }
      }
      var h = minimo < -1 ? minimo : (minimo < 0 ? minimo : s / n);
      if (h >= 0) {
        var perto = 9;
        for (var dy = -3; dy <= 2 && perto > 0; dy++) for (var dx = -3; dx <= 2; dx++) {
          var tv = tile(m, cx + dx, cy + dy);
          if (!NATURAL[tv] && !(tv === T.VAZIO && M.nome !== "fim")) { var dd = Math.max(Math.abs(dx + 0.5), Math.abs(dy + 0.5)) - 0.5; if (dd < perto) perto = dd; }
        }
        var amp = perto >= 3 ? 1 : perto <= 1 ? 0 : (perto - 1) / 2;
        h += amp * ampMundo * (morro1(cx, cy) * 0.75 + morro2(cx, cy) * 0.25) + (rnd() - 0.5) * 0.08;
      }
      var ci = cy * (W + 1) + cx; cant[ci] = h;
      // cor do canto: média dos tiles em volta, com manchas grandes mais claras e mais escuras
      if (nc) { cr /= nc; cg /= nc; cb /= nc; } else { cA.set(corChao(M.nome === "campos" ? T.GRAMA : M.nome === "abismo" ? T.CINZA : T.FIMCHAO)); cr = cA.r; cg = cA.g; cb = cA.b; }
      var luz = 0.86 + mancha(cx, cy) * 0.22 + mancha2(cx, cy) * 0.08 + (h > 0.1 ? Math.min(0.12, (h - 0.1) * 0.12) : 0);
      if (M.nome === "campos" && cg > cr && cg > cb) { var amarelo = Math.max(0, mancha2(cx + 40, cy) - 0.55) * 0.5; cr += amarelo * 0.5; cg += amarelo * 0.15; }
      corC[ci * 3] = cr * luz; corC[ci * 3 + 1] = cg * luz; corC[ci * 3 + 2] = cb * luz;
    }
    R.cant = cant; R.cantW = W + 1; R.cantH = H + 1;
    var pos = [], cols = [];
    var proprio = null;
    function vert(cx, cy) {
      var ci = cy * (W + 1) + cx; pos.push(cx, cant[ci], cy);
      if (proprio) { var l = 0.9 + mancha(cx, cy) * 0.14 + mancha2(cx * 3, cy * 3) * 0.06; cols.push(proprio.r * l, proprio.g * l, proprio.b * l); }
      else cols.push(corC[ci * 3], corC[ci * 3 + 1], corC[ci * 3 + 2]);
    }
    var cP = new THREE.Color();
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var t = tile(m, x, y); if (t === T.VAZIO) continue;
      proprio = NATURAL[t] || t === T.AGUA || t === T.LAVA ? null : cP.set(corChao(t));
      vert(x, y); vert(x, y + 1); vert(x + 1, y); vert(x + 1, y); vert(x, y + 1); vert(x + 1, y + 1);
    }
    var gc = new THREE.BufferGeometry();
    gc.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); gc.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); gc.computeVertexNormals();
    var chao = new THREE.Mesh(gc, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
    chao.receiveShadow = true; R.grupo.add(chao);
    if (M.nome === "fim") { // ilha flutuando: borda de pedra embaixo e estrelas
      var ilha = new THREE.Mesh(new THREE.CylinderGeometry(15, 7, 7, 14, 1), mat("fimrocha", { color: 0xb8b07a }));
      ilha.position.set(M.centro.x + 0.5, -3.6, M.centro.y + 0.5); R.grupo.add(ilha);
      var est = [], r2 = gerador(E.seed + 3);
      for (var i = 0; i < 600; i++) est.push((r2() - 0.5) * 160 + 25, -10 - r2() * 40, (r2() - 0.5) * 160 + 25);
      var ge = new THREE.BufferGeometry(); ge.setAttribute("position", new THREE.Float32BufferAttribute(est, 3));
      R.grupo.add(new THREE.Points(ge, new THREE.PointsMaterial({ color: 0xcfc8ff, size: 0.35, fog: false })));
    }
    // água e lava
    if (M.nome === "campos") { R.agua = new THREE.Mesh(new THREE.PlaneGeometry(W, H, W, H), comOndas(new THREE.MeshStandardMaterial({ color: 0x2f78c8, transparent: true, opacity: 0.82, roughness: 0.08, metalness: 0.05, flatShading: true }), 0.025, 1.6)); }
    else if (M.nome === "abismo") { R.agua = new THREE.Mesh(new THREE.PlaneGeometry(W, H, W, H), comOndas(new THREE.MeshStandardMaterial({ color: 0xf07020, emissive: 0xff4a08, emissiveIntensity: 1.1, roughness: 0.55, flatShading: true }), 0.04, 0.7)); }
    else R.agua = null;
    if (R.agua) { R.agua.rotation.x = -Math.PI / 2; R.agua.position.set(W / 2, -0.16, H / 2); R.agua.receiveShadow = true; R.grupo.add(R.agua); }
    // objetos por tipo de tile (instanciados)
    var lista = {}; function pega(n) { return lista[n] || (lista[n] = []); }
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      t = tile(m, x, y);
      var j1 = (rnd() - 0.5) * 0.2, j2 = (rnd() - 0.5) * 0.2, esc = 0.85 + rnd() * 0.4, rot = rnd() * Math.PI * 2;
      var item = { x: x + 0.5 + j1, z: y + 0.5 + j2, s: esc, r: rot, tx: x, ty: y };
      item.v = Math.floor(rnd() * 3);
      if (t === T.ARVORE) { pega("tronco").push(item); if (rnd() < 0.35) { pega("pinho1").push(item); pega("pinho2").push(item); pega("pinho3").push(item); } else { pega("copa").push(item); if (rnd() < 0.6) pega("copa2").push(item); } }
      else if (t === T.PEDRA) pega("rocha" + item.v).push(item);
      else if (t === T.FERRO) { pega("rocha" + item.v).push(item); pega("gemaFerro").push(item); }
      else if (t === T.OURO) { pega("rochaEscura").push(item); pega("gemaOuro").push(item); }
      else if (t === T.BASALTO) { item.h = 0.7 + rnd() * 1.4; pega("basalto").push(item); }
      else if (t === T.PAREDE) pega("parede").push({ x: x + 0.5, z: y + 0.5, tx: x, ty: y });
      else if (t === T.TORRE) pega("torre").push({ x: x + 0.5, z: y + 0.5, tx: x, ty: y, h: 3 + (((x + y) % 2) ? 0.35 : 0) });
      else if (t === T.TIJOLO) pega("tijolo").push({ x: x + 0.5, z: y + 0.5, tx: x, ty: y, h: 1.2 + ((x + y) % 3) * 0.25 });
      else if (t === T.PILAR) pega("pilar").push({ x: x + 0.5, z: y + 0.5, tx: x, ty: y, h: M.nome === "fim" ? 2.4 : 1.4 + rnd() });
      else if (t === T.MESA) pega("mesa").push({ x: x + 0.5, z: y + 0.5, tx: x, ty: y });
      else if (t === T.PORTA) pega("porta").push({ x: x + 0.5, z: y + 0.5, tx: x, ty: y });
      else if (t === T.PONTE) pega("ponte").push({ x: x + 0.5, z: y + 0.5, tx: x, ty: y });
      else if (t === T.FLOR) pega("flor").push(item);
      else if (t === T.GRAMA2) pega("tufo").push(item);
      // capim espalhado pela grama e pela cinza
      if ((t === T.GRAMA || t === T.GRAMA2 || t === T.FLOR) && rnd() < 0.55 * QUAL[qualidade].capim) { var nq = 1 + Math.floor(rnd() * 3); for (var q = 0; q < nq; q++) pega("capim").push({ x: x + rnd(), z: y + rnd(), s: 0.7 + rnd() * 0.7, r: rnd() * 6.3, tx: x, ty: y }); }
      if (t === T.CINZA && rnd() < 0.08) pega("seixo").push({ x: x + rnd(), z: y + rnd(), s: 0.25 + rnd() * 0.25, r: rnd() * 6.3, tx: x, ty: y, v: Math.floor(rnd() * 3) });
    }
    var cores = { verde: ["#3E8E2E", "#4C9A30", "#5AA83A", "#367F2A", "#6BAF3C"], pinho: ["#24603A", "#2B6E40", "#1F5534"], capim: ["#6CB844", "#7CC650", "#5EA83C", "#8ACF58"], ferro: "#E3B48F", ouro: "#F5D442", flor: ["#E04A4A", "#F5D442", "#F2F2F2", "#B57BEA"] };
    // cada tipo é dividido em blocos de 12x12 tiles: o que está fora da câmera (e da sombra) nem é desenhado
    function inst(nome, geo, material, itens, ajuste) {
      if (!itens || !itens.length) return;
      var blocos = {};
      itens.forEach(function (it) { var k = Math.floor(it.tx / 12) + "," + Math.floor(it.ty / 12); (blocos[k] || (blocos[k] = [])).push(it); });
      for (var k in blocos) instBloco(geo, material, blocos[k], ajuste);
    }
    function instBloco(geo, material, itens, ajuste) {
      var im = new THREE.InstancedMesh(geo, material, itens.length), o = new THREE.Object3D(), cc = new THREE.Color();
      im.castShadow = !material.semSombra; im.receiveShadow = true;
      itens.forEach(function (it, i) {
        o.position.set(it.x, alturaEm(it.x, it.z), it.z); o.rotation.set(0, it.r || 0, 0); o.scale.set(1, 1, 1);
        var corI = ajuste(o, it, i, cc); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
        if (corI) im.setColorAt(i, cc);
        var k = it.tx + "," + it.ty; (R.porTile[k] || (R.porTile[k] = [])).push({ im: im, i: i });
      });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere(); R.grupo.add(im);
    }
    var base = { tronco: mat("tronco", { color: 0x6b4220 }), copa: mat("copa", { color: 0xffffff }), rocha: mat("rocha", { color: 0x8a8a8a }),
      rochaEscura: mat("rochaEscura", { color: 0x3e3e46 }), gema: mat("gema", { color: 0xffffff, emissive: 0x3a2a10, roughness: 0.4, metalness: 0.3 }),
      basalto: mat("basalto", { color: 0x45454c }), parede: mat("parede", { color: 0x9c7448 }), torre: mat("torre", { color: 0x8c8c8c }),
      tijolo: mat("tijolo", { color: 0x4a1e24 }), pilar: mat("pilar", { color: 0x3a2a55, roughness: 0.35, metalness: 0.25 }), mesa: mat("mesa", { color: 0xb08a5a }),
      porta: mat("porta", { color: 0x4a2e18 }), ponte: mat("ponte", { color: 0x9c7448 }), flor: mat("flor", { color: 0xffffff }) };
    inst("tronco", GEO.tronco, base.tronco, lista.tronco, function (o, it) { o.scale.set(it.s, it.s, it.s); });
    var folha = comVento(new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 0.8 }), 0.06, 0.6);
    inst("copa", GEO.copa, folha, lista.copa, function (o, it, i, cc) { o.scale.set(it.s, it.s, it.s); cc.set(cores.verde[(it.tx * 7 + it.ty * 3) % 5]); return true; });
    inst("copa2", GEO.copa2, folha, lista.copa2, function (o, it, i, cc) { o.scale.set(it.s, it.s, it.s); cc.set(cores.verde[(it.tx * 3 + it.ty * 5 + 1) % 5]); return true; });
    ["pinho1", "pinho2", "pinho3"].forEach(function (nm, q) {
      inst(nm, GEO[nm], folha, lista[nm], function (o, it, i, cc) { o.scale.set(it.s * 0.95, it.s * 1.1, it.s * 0.95); cc.set(cores.pinho[(it.tx + it.ty + q) % 3]); return true; });
    });
    [0, 1, 2].forEach(function (v) { inst("rocha" + v, GEO.rochas[v], base.rocha, lista["rocha" + v], function (o, it) { o.scale.set(it.s, it.s, it.s); }); });
    inst("rochaEscura", GEO.rochas[1], base.rochaEscura, lista.rochaEscura, function (o, it) { o.scale.set(it.s, it.s, it.s); });
    var matCapim = comVento(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), 0.35, 0.0); matCapim.semSombra = true;
    inst("capim", GEO.capim, matCapim, lista.capim, function (o, it, i, cc) { o.scale.set(it.s, it.s, it.s); cc.set(cores.capim[i % 4]); return true; });
    inst("seixo", GEO.rochas[0], mat("seixo", { color: 0x5a3a32 }), lista.seixo, function (o, it) { o.scale.set(it.s, it.s * 0.7, it.s); });
    [["gemaFerro", cores.ferro], ["gemaOuro", cores.ouro]].forEach(function (g) {
      var it3 = []; (lista[g[0]] || []).forEach(function (it) { for (var q = 0; q < 3; q++) it3.push({ x: it.x + Math.cos(q * 2.1 + it.r) * 0.22, z: it.z + Math.sin(q * 2.1 + it.r) * 0.22, s: it.s, r: it.r + q, tx: it.tx, ty: it.ty, q: q }); });
      inst(g[0], GEO.gema, base.gema, it3, function (o, it, i, cc) { o.position.y += 0.38 + it.q * 0.08; o.rotation.set(0.5, it.r, 0.3); cc.set(g[1]); return true; });
    });
    inst("basalto", GEO.prisma, base.basalto, lista.basalto, function (o, it) { o.scale.set(1, it.h, 1); });
    base.parede.color.set(0xffffff); base.torre.color.set(0xffffff);
    inst("parede", GEO.caixa, base.parede, lista.parede, function (o, it, i, cc) { o.scale.set(1, 1.15, 1); cc.set(["#9C7448", "#8E6A40", "#A87C4E"][(it.tx * 5 + it.ty * 3) % 3]); return true; });
    inst("torre", GEO.caixa, base.torre, lista.torre, function (o, it, i, cc) { o.scale.set(1, it.h, 1); cc.set(["#8C8C8C", "#7C7E84", "#9A9690", "#848078"][(it.tx * 7 + it.ty * 3) % 4]); return true; });
    inst("tijolo", GEO.caixa, base.tijolo, lista.tijolo, function (o, it) { o.scale.set(1, it.h, 1); });
    inst("pilar", GEO.caixa, base.pilar, lista.pilar, function (o, it) { o.scale.set(1, it.h, 1); });
    inst("mesa", GEO.caixa, base.mesa, lista.mesa, function (o) { o.scale.set(0.85, 0.8, 0.85); });
    inst("porta", GEO.caixa, base.porta, lista.porta, function (o) { o.scale.set(1, 2.4, 1.05); });
    inst("ponte", GEO.caixa, base.ponte, lista.ponte, function (o) { o.position.y = -0.18; o.scale.set(1, 0.14, 0.92); });
    var matFlor = comVento(new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 0.7 }), 0.25, 0.0); matFlor.semSombra = true;
    inst("flor", GEO.flor, matFlor, lista.flor, function (o, it, i, cc) { o.position.y += 0.06; cc.set(cores.flor[i % 4]); return true; });
    inst("tufo", GEO.tufo, matCapim, lista.tufo, function (o, it, i, cc) { o.position.y += 0.04; o.scale.set(1.6, 1.6, 1.6); cc.set("#4A8F2E"); return true; });
    // telhados das casas da vila
    R.telhados = [];
    (M.casas || []).forEach(function (c) {
      var tel = new THREE.Mesh(new THREE.ConeGeometry(Math.max(c.w, c.h) * 0.74, 1.6, 4), new THREE.MeshStandardMaterial({ color: 0xa83a2a, flatShading: true, roughness: 0.8, transparent: true }));
      tel.rotation.y = Math.PI / 4; tel.scale.set(c.w / Math.max(c.w, c.h), 1, c.h / Math.max(c.w, c.h));
      tel.position.set(c.x + c.w / 2, alturaEm(c.x + c.w / 2, c.y + c.h / 2) + 1.15 + 0.8, c.y + c.h / 2); tel.castShadow = true; tel.userData.casa = c; R.grupo.add(tel); R.telhados.push(tel);
    });
    // olhos na porta da torre
    (lista.porta || []).forEach(function (p) {
      for (var q = 0; q < 6; q++) {
        var g = new THREE.Mesh(GEO.gema, mat("olhoPorta", { color: 0x3a1e4a, emissive: 0x7a3ab0, emissiveIntensity: 0.6 }));
        g.position.set(p.x - 0.3 + (q % 3) * 0.3, alturaEm(p.x, p.z) + 0.8 + Math.floor(q / 3) * 0.6, p.z + 0.55); g.scale.setScalar(0.7); R.grupo.add(g);
      }
    });
    construirPortais();
    // personagens fixos
    R.jog = modeloJogador(); R.grupo.add(R.jog);
    M.npcs.forEach(function (n) { n.obj = modeloNpc(n.tipo); R.grupo.add(n.obj); });
    if (M.cristais) M.cristais.forEach(function (c) { c.obj = modeloCristal(); R.grupo.add(c.obj); });
    if (M.dragao) { R.drag = modeloDragao(); R.grupo.add(R.drag); } else R.drag = null;
    R.raio = new THREE.Group(); R.grupo.add(R.raio);
    R.alvoTile = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.04, 1.04), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.5 }));
    R.alvoTile.visible = false; R.grupo.add(R.alvoTile);
    R.particulas = []; R.textoCam = null;
    criarAr(); montarMinimapa();
  }
  // partículas do ar: pólen nos Campos, brasas subindo no Abismo, brilhos no Fim
  var texBrilho = null;
  function criarAr() {
    if (!texBrilho) {
      var cv = document.createElement("canvas"); cv.width = cv.height = 32; var c2 = cv.getContext("2d"), gr = c2.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,0.6)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      c2.fillStyle = gr; c2.fillRect(0, 0, 32, 32); texBrilho = new THREE.CanvasTexture(cv);
    }
    var cfg = { campos: [140, 0xfff4b0, 0.18], abismo: [260, 0xff8a30, 0.2], fim: [180, 0xd9a6ff, 0.22] }[M.nome], n = Math.max(20, Math.round(cfg[0] * QUAL[qualidade].ar)), arr = new Float32Array(n * 3), vel = [];
    for (var i = 0; i < n; i++) { arr[i * 3] = (Math.random() - 0.5) * 34; arr[i * 3 + 1] = Math.random() * 6; arr[i * 3 + 2] = (Math.random() - 0.5) * 30; vel.push(Math.random() * 6.3); }
    var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    R.ar = new THREE.Points(g, new THREE.PointsMaterial({ color: cfg[1], size: cfg[2], map: texBrilho, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    R.ar.userData.fase = vel; R.ar.frustumCulled = false; R.grupo.add(R.ar);
  }
  function atualizarAr(dt, px, pz) {
    if (!R.ar) return;
    var a = R.ar.geometry.attributes.position, f = R.ar.userData.fase, sobe = M.nome === "abismo" ? 1.1 : M.nome === "fim" ? 0.25 : 0.08;
    for (var i = 0; i < a.count; i++) {
      var x = a.getX(i), y = a.getY(i), z = a.getZ(i);
      x += Math.sin(tAnim * 0.7 + f[i]) * dt * 0.4; z += Math.cos(tAnim * 0.5 + f[i] * 1.3) * dt * 0.3; y += sobe * dt * (0.6 + (f[i] % 1));
      if (y > 6) y = 0;
      if (x - px > 17) x -= 34; else if (px - x > 17) x += 34;
      if (z - pz > 15) z -= 30; else if (pz - z > 15) z += 30;
      a.setXYZ(i, x, y, z);
    }
    a.needsUpdate = true;
  }
  function construirPortais() {
    if (R.portais) R.grupo.remove(R.portais);
    R.portais = new THREE.Group(); R.grupo.add(R.portais);
    var m = M.mapa, ligado = mat("portalOn", { color: 0x7d35c4, emissive: 0x9a4ae8, emissiveIntensity: 1.2, roughness: 0.3 }), apagado = mat("portalOff", { color: 0x2a1e3a, roughness: 0.5 });
    for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) {
      var t = tile(m, x, y);
      if (t !== T.PORTAL && t !== T.PORTAL_OFF) continue;
      var p = new THREE.Mesh(GEO.caixa, t === T.PORTAL ? ligado : apagado); p.scale.set(1, 0.12, 1); p.position.set(x + 0.5, alturaEm(x + 0.5, y + 0.5) + 0.06, y + 0.5); p.receiveShadow = true; R.portais.add(p);
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (d) {
        var tv = tile(m, x + d[0], y + d[1]);
        if (tv === T.PORTAL || tv === T.PORTAL_OFF) return;
        var b = new THREE.Mesh(GEO.caixa, mat("obsidiana", { color: 0x1e0f2e, roughness: 0.35, metalness: 0.25 }));
        b.scale.set(d[0] ? 0.2 : 1, 0.5, d[1] ? 0.2 : 1); b.position.set(x + 0.5 + d[0] * 0.5, alturaEm(x + 0.5, y + 0.5), y + 0.5 + d[1] * 0.5); b.castShadow = true; R.portais.add(b);
      });
    }
  }
  // minimapa: 1 pixel por tile, desenhado uma vez por mundo e atualizado quando um tile muda
  var COR_MAPA = {};
  function corMapa(t) {
    if (COR_MAPA[t] == null) {
      var c = { }; c[T.ARVORE] = "#2E6B2A"; c[T.AGUA] = "#2F68B8"; c[T.PONTE] = "#9C7448"; c[T.PEDRA] = "#8A8A8A"; c[T.FERRO] = "#C9A07A"; c[T.OURO] = "#E3C15A";
      c[T.LAVA] = "#E8661E"; c[T.BASALTO] = "#3A3A40"; c[T.PAREDE] = "#9C7448"; c[T.TORRE] = "#B0B0B0"; c[T.PORTA] = "#4A2E18"; c[T.TIJOLO] = "#6A2A30";
      c[T.PILAR] = "#3A2A55"; c[T.PORTAL] = "#B57BEA"; c[T.PORTAL_OFF] = "#3A2A55"; c[T.VAZIO] = "rgba(0,0,0,0)"; c[T.CAMINHO] = "#C49A6C"; c[T.CHAO] = "#C49A6C"; c[T.MESA] = "#C49A6C";
      COR_MAPA[t] = c[t] || corChao(t);
    }
    return COR_MAPA[t];
  }
  function montarMinimapa() {
    var m = M.mapa; R.mini = document.createElement("canvas"); R.mini.width = m.w; R.mini.height = m.h;
    var c = R.mini.getContext("2d"); COR_MAPA = {};
    for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) { c.fillStyle = corMapa(tile(m, x, y)); c.fillRect(x, y, 1, 1); }
  }
  function desenharMinimapa() {
    if (!R.mini) return;
    var tam = VW < 260 ? 56 : 70, mx = VW - tam - 4, my = 38;
    var ob = elObj.getBoundingClientRect(), esc = window.innerWidth / VW;
    if (!elObj.hidden && ob.right / esc > mx && ob.top / esc < my + tam) my = Math.max(my, Math.ceil(ob.bottom / esc) + 4);
    var raio = 18, px = J.x / TILE, pz = J.y / TILE, k = tam / (raio * 2);
    hctx.save();
    hctx.fillStyle = "rgba(10,7,5,0.75)"; hctx.fillRect(mx - 2, my - 2, tam + 4, tam + 4);
    hctx.beginPath(); hctx.rect(mx, my, tam, tam); hctx.clip();
    hctx.imageSmoothingEnabled = false;
    hctx.drawImage(R.mini, px - raio, pz - raio, raio * 2, raio * 2, mx, my, tam, tam);
    function ponto(x, z, cor, r) { var sx = mx + (x - px + raio) * k, sy = my + (z - pz + raio) * k; hctx.fillStyle = cor; hctx.fillRect(Math.round(sx - r), Math.round(sy - r), r * 2, r * 2); }
    M.npcs.forEach(function (n) { ponto(n.x / TILE, n.y / TILE, "#FFF2A0", 1.5); });
    M.ents.forEach(function (e) { ponto(e.x / TILE, e.y / TILE, "#E0303A", 1); });
    if (M.dragao) ponto(M.dragao.x / TILE, M.dragao.y / TILE, "#E07AFF", 2.5);
    var alvo = objetivoAtual && objetivoAtual[1];
    if (alvo) {
      var ax = Math.max(px - raio + 1, Math.min(px + raio - 1, alvo.x + 0.5)), az = Math.max(pz - raio + 1, Math.min(pz + raio - 1, alvo.y + 0.5));
      ponto(ax, az, Math.floor(tAnim * 3) % 2 ? "#FFF2A0" : "#E3C15A", 2.5);
    }
    // o jogador: seta branca apontando para onde ele olha
    var cx = mx + tam / 2, cy = my + tam / 2, an = Math.atan2(J.dy, J.dx);
    hctx.translate(cx, cy); hctx.rotate(an); hctx.fillStyle = "#FFFFFF"; hctx.strokeStyle = "#000";
    hctx.beginPath(); hctx.moveTo(4, 0); hctx.lineTo(-3, -3); hctx.lineTo(-1.5, 0); hctx.lineTo(-3, 3); hctx.closePath(); hctx.fill(); hctx.stroke();
    hctx.restore();
    hctx.strokeStyle = "#6E5441"; hctx.strokeRect(mx - 1.5, my - 1.5, tam + 3, tam + 3);
  }
  function tileMudou(x, y) {
    if (R.mini) { var c = R.mini.getContext("2d"); c.clearRect(x, y, 1, 1); c.fillStyle = corMapa(tile(M.mapa, x, y)); c.fillRect(x, y, 1, 1); }
    var lista = R.porTile[x + "," + y]; if (!lista) return;
    var z = new THREE.Matrix4().makeScale(0, 0, 0);
    lista.forEach(function (l) { l.im.setMatrixAt(l.i, z); l.im.instanceMatrix.needsUpdate = true; });
    delete R.porTile[x + "," + y];
  }

  // ---------- modelos low-poly ----------
  function bloco(w, h, d, cor_, x, y, z, nome) {
    var m = new THREE.Mesh(GEO.caixa, mat(nome || ("c" + cor_), { color: cor_ })); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; return m;
  }
  function modeloJogador() {
    var g = new THREE.Group();
    g.add(bloco(0.28, 0.06, 0.32, 0x3a2410, 0, 0, 0.02, "bota"));
    var pe = bloco(0.12, 0.34, 0.14, 0x2a3a6e, -0.08, 0, 0, "calca"), pd = bloco(0.12, 0.34, 0.14, 0x2a3a6e, 0.08, 0, 0, "calca");
    g.add(pe); g.add(pd);
    g.add(bloco(0.36, 0.38, 0.22, 0x3e8ec9, 0, 0.34, 0, "camisa"));
    var be = bloco(0.1, 0.34, 0.12, 0xe8b890, -0.23, 0.36, 0, "pele"), bd = new THREE.Group();
    bd.position.set(0.23, 0.7, 0); bd.add(bloco(0.1, 0.34, 0.12, 0xe8b890, 0, -0.34, 0, "pele"));
    var ferramenta = new THREE.Group(); ferramenta.position.set(0, -0.32, 0.08); bd.add(ferramenta);
    g.add(be); g.add(bd);
    g.add(bloco(0.32, 0.3, 0.3, 0xe8b890, 0, 0.72, 0, "pele"));
    g.add(bloco(0.34, 0.1, 0.32, 0x4a2e18, 0, 0.98, 0, "cabelo"));
    g.add(bloco(0.34, 0.2, 0.08, 0x4a2e18, 0, 0.8, -0.14, "cabelo"));
    var olhos = [-0.07, 0.07].map(function (x) { return bloco(0.05, 0.05, 0.02, 0x222222, x, 0.82, 0.155, "olho"); }); olhos.forEach(function (o) { g.add(o); });
    g.add(bloco(0.38, 0.05, 0.24, 0x5a3a1e, 0, 0.36, 0, "cinto"));
    g.add(bloco(0.26, 0.3, 0.12, 0x7b5230, 0, 0.36, -0.17, "mochila"));
    g.add(bloco(0.28, 0.06, 0.14, 0x5a3a1e, 0, 0.66, -0.17, "cinto"));
    var capa = new THREE.Group(); capa.position.set(0, 0.7, -0.12);
    var pano = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.55, 1, 3), mat("capa", { color: 0xb8322a, side: THREE.DoubleSide, roughness: 0.9 }));
    pano.position.y = -0.27; pano.castShadow = true; capa.add(pano); g.add(capa);
    g.userData = { pe: pe, pd: pd, be: be, bd: bd, ferramenta: ferramenta, nivel: -1, capa: capa };
    silhueta(g);
    g.scale.setScalar(1.3);
    return g;
  }
  // quando algo fica na frente do herói, aparece só a silhueta dele (desenhada onde está escondido)
  var matSil = null;
  function silhueta(g) {
    // ordem: cenário (0), depois a silhueta (5, só onde o cenário está na frente), depois o herói (10)
    if (!matSil) { matSil = new THREE.MeshBasicMaterial({ color: 0xc9a640, depthWrite: false, depthFunc: THREE.GreaterDepth, fog: false }); }
    var malhas = []; g.traverse(function (o) { if (o.isMesh) malhas.push(o); });
    malhas.forEach(function (m) {
      m.renderOrder = 10;
      var c = new THREE.Mesh(m.geometry, matSil); c.position.copy(m.position); c.rotation.copy(m.rotation); c.scale.copy(m.scale); c.renderOrder = 5; m.parent.add(c);
    });
  }
  function atualizarFerramenta() {
    var u = R.jog.userData, nivel = E.eq.esp * 10 + E.eq.pic;
    if (u.nivel === nivel) return; u.nivel = nivel;
    while (u.ferramenta.children.length) u.ferramenta.remove(u.ferramenta.children[0]);
    var cores_ = [0xc49a6c, 0xc49a6c, 0x8a8a8a, 0xededed];
    if (E.eq.esp) { u.ferramenta.add(bloco(0.04, 0.08, 0.04, 0x7b5230, 0, -0.04, 0, "cabo")); u.ferramenta.add(bloco(0.16, 0.03, 0.03, 0x5e3e22, 0, 0.02, 0, "guarda")); u.ferramenta.add(bloco(0.05, 0.45, 0.02, cores_[E.eq.esp], 0, 0.04, 0, "lamina" + E.eq.esp)); u.ferramenta.rotation.x = Math.PI / 2; }
    else if (E.eq.pic) { u.ferramenta.add(bloco(0.04, 0.4, 0.04, 0x7b5230, 0, -0.1, 0, "cabo")); u.ferramenta.add(bloco(0.32, 0.06, 0.05, cores_[E.eq.pic], 0, 0.26, 0, "pic" + E.eq.pic)); u.ferramenta.rotation.x = Math.PI / 2; }
  }
  function modeloNpc(tipo) {
    var g = new THREE.Group(), manto = tipo === "mercador" ? 0x2e6b3a : 0x7a2e2e;
    var corpo = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.75, 6), mat("manto" + tipo, { color: manto })); corpo.position.y = 0.38; corpo.castShadow = true; g.add(corpo);
    g.add(bloco(0.3, 0.28, 0.28, tipo === "mercador" ? 0xe8b890 : 0x3a1a1a, 0, 0.72, 0, "cabeca" + tipo));
    if (tipo === "mercador") { var ch = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 8), mat("chapeu", { color: 0x6b4220 })); ch.position.y = 1.02; g.add(ch); g.add(bloco(0.2, 0.14, 0.2, 0x6b4220, 0, 1.04, 0, "chapeu")); }
    else { [-0.07, 0.07].forEach(function (x) { var o = bloco(0.06, 0.05, 0.02, 0xf5d442, x, 0.8, 0.15, "olhoCinza"); o.material = mat("olhoCinzaE", { color: 0xf5d442, emissive: 0xf5d442, emissiveIntensity: 1 }); g.add(o); }); }
    g.scale.setScalar(1.25);
    var bal = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), mat("balao", { color: 0xfff2a0, emissive: 0xfff2a0, emissiveIntensity: 0.8 })); bal.position.y = 1.35; g.add(bal); g.userData.balao = bal;
    return g;
  }
  function modeloCristal() {
    var g = new THREE.Group();
    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.3, 6), mat("baseCristal", { color: 0x2a1e3a })); base.position.y = 0.15; base.castShadow = true; g.add(base);
    var c = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), mat("cristal", { color: 0xf2a6e6, emissive: 0xc77dff, emissiveIntensity: 1.1, roughness: 0.2 })); c.position.y = 0.9; g.add(c); g.userData.c = c;
    return g;
  }
  function modeloDragao() {
    var g = new THREE.Group(), escuro = mat("dragao", { color: 0x2a1a3a, roughness: 0.6 }), claro = mat("dragao2", { color: 0x4a3060 });
    var corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 2.6, 7), escuro); corpo.rotation.x = Math.PI / 2; corpo.castShadow = true; g.add(corpo);
    var cauda = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.4, 6), escuro); cauda.rotation.x = -Math.PI / 2; cauda.position.z = -2.3; cauda.castShadow = true; g.add(cauda);
    var pesc = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 1.2, 6), escuro); pesc.rotation.x = Math.PI / 2.6; pesc.position.set(0, 0.35, 1.6); g.add(pesc);
    var cab = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.9), claro); cab.position.set(0, 0.62, 2.3); cab.castShadow = true; g.add(cab);
    [-0.18, 0.18].forEach(function (x) { var o = new THREE.Mesh(GEO.caixa, mat("olhoDragao", { color: 0xe07aff, emissive: 0xe07aff, emissiveIntensity: 2 })); o.scale.set(0.1, 0.08, 0.05); o.position.set(x, 0.7, 2.76); g.add(o); });
    [-0.2, 0.2].forEach(function (x) { var ch = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 4), claro); ch.position.set(x, 0.95, 2.05); ch.rotation.x = -0.6; g.add(ch); });
    function asa(lado) {
      var p = new THREE.Group(), forma = new THREE.Shape();
      forma.moveTo(0, 0); forma.lineTo(3.4, 0.4); forma.lineTo(2.8, -1.4); forma.lineTo(1.6, -0.9); forma.lineTo(0.8, -1.6); forma.lineTo(0, -0.8);
      var m = new THREE.Mesh(new THREE.ShapeGeometry(forma), mat("asa", { color: 0x5a4a78, side: THREE.DoubleSide, roughness: 0.7 }));
      m.rotation.x = -Math.PI / 2; m.scale.x = lado; m.castShadow = true; p.add(m); p.position.set(lado * 0.4, 0.3, 0.6); return p;
    }
    var ae = asa(-1), ad = asa(1); g.add(ae); g.add(ad);
    g.userData = { ae: ae, ad: ad };
    g.scale.setScalar(1.1);
    return g;
  }
  function modeloMonstro(tipo) {
    var g = new THREE.Group();
    if (tipo === "lodo") {
      var s = new THREE.Mesh(GEO.esfera, mat("lodo", { color: 0x5fcf5a, transparent: true, opacity: 0.85, roughness: 0.3 })); s.scale.set(0.8, 0.6, 0.8); s.position.y = 0.3; s.castShadow = true; g.add(s); g.userData.corpo = s;
      [-0.14, 0.14].forEach(function (x) { g.add(bloco(0.08, 0.1, 0.04, 0x1e3a1e, x, 0.36, 0.38, "olhoLodo")); });
    } else if (tipo === "esqueleto" || tipo === "sombra") {
      var c1 = tipo === "esqueleto" ? 0xd9d9d9 : 0x1a1424, alto = tipo === "sombra" ? 1.4 : 1;
      g.add(bloco(0.08, 0.4 * alto, 0.08, c1, -0.08, 0, 0, "osso" + tipo)); g.add(bloco(0.08, 0.4 * alto, 0.08, c1, 0.08, 0, 0, "osso" + tipo));
      g.add(bloco(0.3, 0.36 * alto, 0.16, c1, 0, 0.4 * alto, 0, "osso" + tipo));
      g.add(bloco(0.07, 0.36 * alto, 0.07, c1, -0.2, 0.42 * alto, 0, "osso" + tipo)); g.add(bloco(0.07, 0.36 * alto, 0.07, c1, 0.2, 0.42 * alto, 0, "osso" + tipo));
      g.add(bloco(0.3, 0.28, 0.28, c1, 0, 0.78 * alto, 0, "osso" + tipo));
      var oc = tipo === "esqueleto" ? 0x222222 : 0xd98aff;
      [-0.07, 0.07].forEach(function (x) { var o = bloco(0.06, 0.06, 0.02, oc, x, 0.88 * alto, 0.15, "olho" + tipo); if (tipo === "sombra") o.material = mat("olhoSombra", { color: oc, emissive: oc, emissiveIntensity: 1.5 }); g.add(o); });
    } else if (tipo === "aranha") {
      var corpo = new THREE.Mesh(GEO.esfera, mat("aranha", { color: 0x2a2626 })); corpo.scale.set(0.6, 0.35, 0.75); corpo.position.y = 0.25; corpo.castShadow = true; g.add(corpo);
      for (var i = 0; i < 4; i++) [-1, 1].forEach(function (l) { var p = bloco(0.5, 0.04, 0.04, 0x1e1a1a, l * 0.4, 0.2, -0.24 + i * 0.16, "perna"); p.rotation.z = l * 0.4; g.add(p); });
      [-0.1, 0.1].forEach(function (x) { var o = bloco(0.06, 0.06, 0.03, 0xe02020, x, 0.32, 0.36, "olhoAranha"); o.material = mat("olhoAranhaE", { color: 0xe02020, emissive: 0xe02020, emissiveIntensity: 1 }); g.add(o); });
    } else if (tipo === "diabrete") {
      var b = new THREE.Mesh(GEO.esfera, mat("diabrete", { color: 0xf5a030, emissive: 0xff6010, emissiveIntensity: 0.8 })); b.scale.setScalar(0.62); b.position.y = 0.5; b.castShadow = true; g.add(b); g.userData.corpo = b;
      [-0.16, 0.16].forEach(function (x) { var ch = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 4), mat("chifre", { color: 0x5a1a0a })); ch.position.set(x, 0.85, 0); g.add(ch); });
      [-0.1, 0.1].forEach(function (x) { g.add(bloco(0.07, 0.07, 0.03, 0x2a1a0a, x, 0.56, 0.3, "olhoDiabrete")); });
    } else if (tipo === "brutamontes") {
      g.add(bloco(0.18, 0.4, 0.2, 0x6b4220, -0.14, 0, 0, "bruto2")); g.add(bloco(0.18, 0.4, 0.2, 0x6b4220, 0.14, 0, 0, "bruto2"));
      g.add(bloco(0.62, 0.55, 0.4, 0x8a5a3a, 0, 0.38, 0, "bruto")); g.add(bloco(0.4, 0.36, 0.36, 0x8a5a3a, 0, 0.95, 0.04, "bruto"));
      [-0.14, 0.14].forEach(function (x) { var p = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 4), mat("presa", { color: 0xe8e3d9 })); p.position.set(x, 0.92, 0.26); g.add(p); });
      g.add(bloco(0.14, 0.5, 0.14, 0x8a5a3a, -0.4, 0.38, 0, "bruto")); g.add(bloco(0.14, 0.5, 0.14, 0x8a5a3a, 0.4, 0.38, 0, "bruto"));
    }
    g.scale.setScalar(1.3);
    return g;
  }
  function particula3d(x, y, z, corHex, n) {
    for (var i = 0; i < n; i++) {
      var p = new THREE.Mesh(GEO.caixa, mat("p" + corHex, { color: corHex, emissive: corHex, emissiveIntensity: 0.3 }));
      p.scale.setScalar(0.08); p.position.set(x, y, z);
      var a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 2.5;
      p.userData = { vx: Math.cos(a) * v, vy: 2 + Math.random() * 3, vz: Math.sin(a) * v, t: 0.5 + Math.random() * 0.3 };
      R.grupo.add(p); R.particulas.push(p);
    }
  }

  // ---------- mira com o mouse ----------
  var vNdc = new THREE.Vector2(), vPonto = new THREE.Vector3();
  function atualizarMira() {
    if (!mira || !R.pronto) return;
    vNdc.set(mira.cx / window.innerWidth * 2 - 1, -(mira.cy / window.innerHeight) * 2 + 1);
    R.ray.setFromCamera(vNdc, R.cam);
    if (!R.ray.ray.intersectPlane(R.chao, vPonto)) return;
    var dx = vPonto.x * TILE - J.x, dy = vPonto.z * TILE - J.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > 2) { J.dx = dx / d; J.dy = dy / d; }
  }

  // ---------- desenho de cada quadro ----------
  var vTmp = new THREE.Vector3();
  function desenhar(dt) {
    var px = J.x / TILE, pz = J.y / TILE, hj = alturaEm(px, pz);
    R.uTempo.value += dt;
    R.camY = R.camY == null ? hj : R.camY + (hj - R.camY) * Math.min(1, dt * 4);
    R.chao.constant = -hj;
    // câmera: de cima e um pouco de lado, seguindo o jogador
    var longe = (VH > VW ? 1.55 : 1) * zoom, alt = (M.nome === "fim" ? 12.5 : 9.5) * longe, rec = (M.nome === "fim" ? 9 : 7) * longe;
    var alvoCam = vTmp.set(px, alt + R.camY, pz + rec);
    if (!R.camIni) { R.cam.position.copy(alvoCam); R.camIni = true; } else R.cam.position.lerp(alvoCam, Math.min(1, dt * 6));
    R.cam.lookAt(R.cam.position.x, R.cam.position.y - alt + 0.3, R.cam.position.z - rec);
    R.sol.position.set(px + 11, 14, pz + 5); R.sol.target.position.set(px, 0, pz); R.sol.target.updateMatrixWorld();
    // jogador
    var j = R.jog, u = j.userData;
    atualizarFerramenta();
    j.position.set(px, hj + 0.02, pz);
    j.rotation.y = Math.atan2(J.dx, J.dy);
    var passo = J.andando ? Math.sin(J.anim * 12) * 0.6 : 0;
    u.pe.rotation.x = passo; u.pd.rotation.x = -passo; u.be.rotation.x = -passo;
    u.bd.rotation.x = J.atq > 0 ? -1.6 + (0.15 - J.atq) * 14 : passo * 0.6;
    j.visible = !(J.inv > 0 && Math.floor(tAnim * 16) % 2);
    u.capa.rotation.x = (J.andando ? 0.55 : 0.12) + Math.sin(tAnim * (J.andando ? 9 : 2)) * (J.andando ? 0.12 : 0.05);
    atualizarAr(dt, px, pz);
    // água/lava e portais
    if (R.agua && M.nome === "abismo") R.agua.material.emissiveIntensity = 0.95 + Math.sin(tAnim * 2) * 0.2;
    MAT.portalOn && (MAT.portalOn.emissiveIntensity = 1 + Math.sin(tAnim * 4) * 0.4);
    // telhados ficam transparentes com o jogador dentro da casa
    (R.telhados || []).forEach(function (tel) { var c = tel.userData.casa, dentro = px > c.x && px < c.x + c.w && pz > c.y && pz < c.y + c.h + 0.5; tel.material.opacity += ((dentro ? 0.15 : 1) - tel.material.opacity) * Math.min(1, dt * 8); });
    // bloco mirado (o que o clique vai quebrar)
    var f = tileFrente(), tf = tile(M.mapa, f.x, f.y), minavel = tf === T.ARVORE || tf === T.PEDRA || tf === T.FERRO || tf === T.OURO;
    R.alvoTile.visible = minavel; if (minavel) R.alvoTile.position.set(f.x + 0.5, alturaEm(f.x + 0.5, f.y + 0.5) + (tf === T.ARVORE ? 0.9 : 0.5), f.y + 0.5);
    if (minavel) R.alvoTile.scale.y = tf === T.ARVORE ? 1.8 : 1;
    // npcs e cristais
    M.npcs.forEach(function (n) { n.obj.position.set(n.x / TILE, alturaEm(n.x / TILE, n.y / TILE), n.y / TILE); n.obj.rotation.y = Math.atan2(J.x - n.x, J.y - n.y); n.obj.userData.balao.visible = dist(n, J) < 34; n.obj.userData.balao.rotation.y += dt * 3; });
    while (R.raio.children.length) { var rc = R.raio.children.pop(); rc.geometry.dispose(); }
    if (M.cristais) M.cristais.forEach(function (c) {
      c.obj.visible = c.hp > 0; if (c.hp <= 0) return;
      c.obj.position.set(c.x / TILE, alturaEm(c.x / TILE, c.y / TILE), c.y / TILE); c.obj.userData.c.rotation.y += dt * 2; c.obj.userData.c.position.y = 0.9 + Math.sin(tAnim * 3 + c.i) * 0.1;
      if (M.dragao && R.drag) {
        var gl = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(c.x / TILE, 1, c.y / TILE), R.drag.position.clone()]);
        R.raio.add(new THREE.Line(gl, R.matRaio || (R.matRaio = new THREE.LineBasicMaterial({ color: 0xf2a6e6, transparent: true, opacity: 0.6 }))));
      }
    });
    // monstros
    var vivos = new Set();
    M.ents.forEach(function (e) {
      if (!e.obj) { e.obj = modeloMonstro(e.tipo); R.grupo.add(e.obj); R.modelos.push(e.obj); }
      vivos.add(e.obj);
      var voa = e.def.voa ? 0.5 + Math.sin(tAnim * 4 + e.t) * 0.12 : 0.1;
      e.obj.position.set(e.x / TILE, voa + alturaEm(e.x / TILE, e.y / TILE) - 0.08, e.y / TILE);
      e.obj.rotation.y = Math.atan2(J.x - e.x, J.y - e.y);
      if (e.obj.userData.corpo && e.tipo === "lodo") e.obj.userData.corpo.scale.y = 0.6 + Math.sin(e.t * 6) * 0.08;
      e.obj.visible = !(e.kb > 0 && Math.floor(tAnim * 20) % 2);
    });
    R.modelos = R.modelos.filter(function (o) { if (!vivos.has(o)) { R.grupo.remove(o); return false; } return true; });
    // dragão
    if (R.drag) {
      if (!M.dragao) { particula3d(R.drag.position.x, R.drag.position.y, R.drag.position.z, 0xe07aff, 30); R.grupo.remove(R.drag); R.drag = null; construirPortais(); }
      else {
        var g = M.dragao, voando = g.fase !== "pousado", alvoY = voando ? 3.2 + Math.sin(tAnim * 2) * 0.3 : 0.9;
        var nx = g.x / TILE, nz = g.y / TILE, dxg = nx - R.drag.position.x, dzg = nz - R.drag.position.z;
        if (Math.abs(dxg) + Math.abs(dzg) > 0.01) R.drag.rotation.y = Math.atan2(dxg, dzg);
        R.drag.position.set(nx, R.drag.position.y + (alvoY - R.drag.position.y) * Math.min(1, dt * 3), nz);
        var bate = Math.sin(tAnim * (voando ? 7 : 2)) * (voando ? 0.6 : 0.15);
        R.drag.userData.ae.rotation.z = bate; R.drag.userData.ad.rotation.z = -bate;
      }
    }
    // projéteis
    var projVivos = new Set();
    M.proj.forEach(function (p) {
      if (!p.obj) {
        if (p.tipo === "fogo") { p.obj = new THREE.Mesh(GEO.esfera, mat("bolaFogo", { color: 0xffa030, emissive: 0xff6010, emissiveIntensity: 2 })); p.obj.scale.setScalar(0.32); }
        else { p.obj = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 4), mat("flecha", { color: 0xd9c9a0 })); p.obj.rotation.x = Math.PI / 2; var gp = new THREE.Group(); gp.add(p.obj); p.obj = gp; }
        R.grupo.add(p.obj);
      }
      projVivos.add(p.obj);
      p.obj.position.set(p.x / TILE, alturaEm(p.x / TILE, p.y / TILE) + 0.6, p.y / TILE);
      p.obj.rotation.y = Math.atan2(p.vx, p.vy);
    });
    R.grupo.children.slice().forEach(function (o) { if (o.userData.proj && !projVivos.has(o)) R.grupo.remove(o); });
    projVivos.forEach(function (o) { o.userData.proj = true; });
    // partículas: as do jogo (2D) viram cubinhos 3D
    M.particulas.forEach(function (q) { if (!q.feita) { q.feita = true; particula3d(q.x / TILE, alturaEm(q.x / TILE, q.y / TILE) + 0.6, q.y / TILE, parseInt(q.cor.slice(1), 16), 1); } });
    R.particulas = R.particulas.filter(function (p) {
      var d = p.userData; d.t -= dt; d.vy -= 9 * dt;
      p.position.x += d.vx * dt; p.position.z += d.vz * dt; p.position.y = Math.max(alturaEm(p.position.x, p.position.z) + 0.04, p.position.y + d.vy * dt);
      if (d.t <= 0) { R.grupo.remove(p); return false; } return true;
    });
    R.ren.render(R.cena, R.cam);
    desenharHud();
  }

  // ---------- HUD 2D por cima do 3D ----------
  function telaDe(x, y, z) { vTmp.set(x, y, z).project(R.cam); return { x: (vTmp.x + 1) / 2 * VW, y: (1 - vTmp.y) / 2 * VH, frente: vTmp.z < 1 }; }
  function desenharHud() {
    hctx.clearRect(0, 0, VW, VH);
    hctx.font = "8px 'Pixelify Sans', monospace"; hctx.textAlign = "center";
    M.textos.forEach(function (x) {
      var s = telaDe(x.x / TILE, alturaEm(x.x / TILE, x.y / TILE) + 1.2 + (1.2 - x.t), x.y / TILE); if (!s.frente) return;
      hctx.fillStyle = "#000"; hctx.fillText(x.s, Math.round(s.x) + 1, Math.round(s.y) + 1); hctx.fillStyle = "#FFF2A0"; hctx.fillText(x.s, Math.round(s.x), Math.round(s.y));
    });
    M.ents.forEach(function (e) {
      if (e.hp >= e.def.hp) return;
      var s = telaDe(e.x / TILE, alturaEm(e.x / TILE, e.y / TILE) + 1.4, e.y / TILE);
      hctx.fillStyle = "#000"; hctx.fillRect(Math.round(s.x - 8), Math.round(s.y), 16, 3); hctx.fillStyle = "#E0303A"; hctx.fillRect(Math.round(s.x - 8), Math.round(s.y), 16 * e.hp / e.def.hp, 3);
    });
    for (var i = 0; i < 10; i++) { var v = E.hp - i * 2, n = v >= 2 ? "coracao" : v === 1 ? "coracaoMeio" : "coracaoVazio"; hctx.drawImage(SPR[n], 4 + i * 9, 4, 8, 8); }
    var sel = E.sel, icone = sel === "arco" ? "i_arco" : ITENS[sel][1], qt = sel === "arco" ? E.inv.flecha : E.inv[sel];
    hctx.fillStyle = "rgba(18,13,9,0.8)"; hctx.fillRect(VW - 46, 3, 43, 20); hctx.drawImage(SPR[icone], VW - 44, 5);
    hctx.textAlign = "left"; hctx.fillStyle = "#F2EBDD"; hctx.fillText("x" + qt, VW - 26, 16);
    hctx.drawImage(SPR.i_moeda, 4, 15, 8, 8); hctx.fillText(String(E.inv.moeda), 14, 22);
    hctx.drawImage(SPR.i_olho, 34, 15, 8, 8); hctx.fillText(E.inv.olho + "/6", 44, 22);
    if (J.fogo > 0) { hctx.drawImage(SPR.i_fogo, 66, 15, 8, 8); hctx.fillText(Math.ceil(J.fogo) + "s", 76, 22); }
    hctx.textAlign = "right"; hctx.fillStyle = "#C4B4A0"; hctx.fillText(fmt(E.tempo), VW - 4, 32);
    var alvo = objetivoAtual && objetivoAtual[1];
    if (alvo) {
      var s2 = telaDe(alvo.x + 0.5, 0.5, alvo.y + 0.5);
      if (!s2.frente || s2.x < 0 || s2.y < 0 || s2.x > VW || s2.y > VH) {
        var a = Math.atan2(s2.y - VH / 2, s2.x - VW / 2), r = Math.min(VW, VH) / 2 - 22, ax = VW / 2 + Math.cos(a) * r, ay = VH / 2 + Math.sin(a) * r * 0.9;
        hctx.save(); hctx.translate(ax, ay); hctx.rotate(a); hctx.fillStyle = "#FFF2A0"; hctx.strokeStyle = "#2A1E15";
        hctx.beginPath(); hctx.moveTo(8, 0); hctx.lineTo(-5, -6); hctx.lineTo(-2, 0); hctx.lineTo(-5, 6); hctx.closePath(); hctx.fill(); hctx.stroke(); hctx.restore();
      }
    }
    desenharMinimapa();
    if (usouMouse && mira && jogando && !pausado) { // mira
      var mx = mira.cx / window.innerWidth * VW, my = mira.cy / window.innerHeight * VH;
      hctx.strokeStyle = "rgba(255,255,255,0.8)"; hctx.beginPath(); hctx.arc(mx, my, 4, 0, Math.PI * 2); hctx.moveTo(mx - 7, my); hctx.lineTo(mx - 5, my); hctx.moveTo(mx + 5, my); hctx.lineTo(mx + 7, my); hctx.stroke();
    }
  }
  function ajustarTela() {
    var w = window.innerWidth, h = window.innerHeight;
    if (w >= h) { VH = 200; VW = Math.round(VH * w / h); } else { VW = 220; VH = Math.round(VW * h / w); }
    hud.width = VW; hud.height = VH; hctx.imageSmoothingEnabled = false;
    if (R.ren) { R.ren.setSize(w, h, false); R.cam.aspect = w / h; R.cam.fov = w >= h ? 40 : 50; R.cam.updateProjectionMatrix(); }
    var esc = w / VW, lado = 100 * esc, livreW = w - 2 * lado, el = document.getElementById("hud-obj");
    if (livreW >= 300) { el.style.maxWidth = Math.min(640, livreW - 12) + "px"; el.style.top = ""; }
    else { el.style.maxWidth = (w - 24) + "px"; el.style.top = Math.round(36 * esc) + "px"; }
  }
  window.addEventListener("resize", ajustarTela);

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
      el.appendChild(linha("i_perola", "Música", musicaLigada ? "Ligada" : "Desligada", musicaLigada ? "Desligar" : "Ligar", true, function () { musicaLigada = !musicaLigada; LS.set("rdj-musica", musicaLigada); atualizarMusica(); renderMenu(); }));
      el.appendChild(linha("i_olho", "Gráficos: " + QUAL[qualidade].nome, qualidade === "alta" ? "Sombras e capim completos." : qualidade === "media" ? "Menos capim e sombras mais simples." : "Sem sombras e sem capim. Para celular mais fraco.", "Mudar", true, function () {
        qualidade = ORDEM_QUAL[(ORDEM_QUAL.indexOf(qualidade) + 1) % 3]; qualEscolhida = qualidade; LS.set("rdj-qual", qualidade); aplicarQualidade(); renderMenu();
      }));
      el.appendChild(linha("i_arco", "Zoom da câmera", Math.round(100 / zoom) + "%. Rodinha do mouse ou pinça com dois dedos.", "Padrão", zoom !== 1, function () { mudarZoom(1); renderMenu(); }));
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
    if (!R.pronto) document.getElementById("t-recorde").textContent = "Este navegador não conseguiu abrir o 3D (WebGL). Tente o Chrome ou atualize o navegador.";
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
  window.__rd = { estado: function () { return E; }, mundo: function () { return M; }, jogador: J, entrar: entrar, add: add, objetivo: function () { return objetivo(); }, usar: usar, atacar: atacar, r: function () { return R; } };

  // usa o mesmo service worker do guia: o jogo abre sem internet e pode ser instalado
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () { navigator.serviceWorker.register("../sw.js").catch(function () {}); });
  }

  try { iniciar3d(); } catch (e) { R.pronto = false; }
  ajustarTela();
  irTitulo();
  requestAnimationFrame(laco);
})();
