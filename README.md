# Rota do Dragão

Guia de fã para zerar o Minecraft rápido, em português. Tem roteiro em 9 etapas com cronômetro,
modo partida e uma seed de início com dicas em cada etapa, mochila do End, calculadoras (Nether e
Overworld, achar a fortaleza com 2 olhos, viagem, baús, XP), guias de Trial Chambers, arqueologia,
pesca e comida, dicas para iniciantes, glossário, atalhos, comidas, dimensões,
poções, mobs, seeds e mural da comunidade, biomas (lista completa), itens e encantamentos, farms,
aldeões, construções, redstone, mods, missões, histórico de versões e 100 curiosidades. Cobre
Java e Bedrock, e pode ser instalado no celular como app (funciona sem internet).

Site: **https://oedoardo.github.io/rota-do-dragao/**

Jogo: **https://oedoardo.github.io/rota-do-dragao/jogo/**. Aventura original em 3D low-poly, vista de cima:
Campos, Abismo de Fogo e o Fim, com receitas, loja, escambo, 6 tipos de monstro e o dragão. Roda no
navegador e no celular (controles de toque), pode ser instalado e funciona sem internet. No computador:
WASD anda, o mouse mira, clique esquerdo quebra e ataca, clique direito usa o item, E interage. Código em
`jogo/`, com o [Three.js](https://threejs.org) 0.170 (licença MIT) em `jogo/vendor/`; o progresso fica salvo no aparelho.

## Como funciona

- O site inteiro é o `index.html`, sem etapa de build. O GitHub Pages publica a branch `main`.
- `cena.js` desenha a ilha 3D do topo. Ele só baixa o Three.js (de `jogo/vendor/`) quando a faixa
  aparece na tela e para de desenhar quando ela sai.
- `sw.js`, `manifest.webmanifest` e os ícones `icone-*.png` deixam o site instalável e usável sem
  internet. A página sempre confere com o GitHub se há versão nova e avisa o visitante.
- O que cada visitante marca (etapas, missões, mochila, recorde) fica no navegador dele.
- O mural usa o projeto Supabase `rota-do-dragao`, tabela `public.seeds`. As regras estão em
  [`supabase/mural.sql`](supabase/mural.sql): qualquer pessoa lê e envia, ninguém de fora edita
  nem apaga, e só entram números (seed e distâncias).
- A chave do Supabase que aparece no `index.html` é a chave publicável, pública por definição.
  Quem protege os dados são as regras do banco.
- Para tirar uma seed do mural: painel do Supabase > Table Editor > `seeds` > apagar a linha.
- Projeto gratuito do Supabase pausa depois de 1 semana sem uso. Se o mural sair do ar, reative o
  projeto no painel. O resto do guia continua funcionando.

## Atualização

Uma tarefa agendada revisa o guia toda semana e atualiza este repositório quando sai versão nova
do jogo.

Guia de fã, sem ligação com a Mojang ou a Microsoft. Minecraft é marca da Microsoft.
