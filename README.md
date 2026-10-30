# Rota do Dragão

Guia de fã para zerar o Minecraft rápido: roteiro em 9 etapas com cronômetro, testador de seeds,
mural de seeds da comunidade, o melhor bioma para cada coisa, as melhores coisas para conseguir,
farms e missões difíceis. Cobre Java e Bedrock.

Site: **https://oedoardo.github.io/rota-do-dragao/**

## Como funciona

- O site inteiro é o `index.html`, sem etapa de build. O GitHub Pages publica a branch `main`.
- O que cada visitante marca (etapas, missões, recorde, "Minhas seeds") fica no navegador dele.
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
