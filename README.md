# Servidor Sinuca/Truco GoScripts

Servidor de encontro do jogo: fila para achar oponente, lista de amigos (online/offline/jogando),
convites e repasse das mensagens da partida. As regras rodam no celular de quem cria a partida.
Não precisa de banco de dados nem de dependências (só Node 18+).

## Publicar no Render (plano grátis)

1. Suba estes arquivos (`server.js`, `package.json`, `README.md`) num repositório do GitHub,
   por exemplo `Goscriptsbr/sinuca-servidor`.
2. Em https://render.com → **New → Web Service** → conecte o GitHub e escolha o repositório.
3. Configure:
   - **Name:** `sinuca-goscripts` (o jogo já aponta para `wss://sinuca-goscripts.onrender.com`;
     se o nome estiver ocupado, use outro e avise para trocar o endereço no jogo)
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
4. Clique em **Create Web Service**. Quando aparecer "Live", abra o endereço no navegador:
   deve aparecer "Servidor Sinuca/Truco GoScripts no ar".

No plano grátis o servidor dorme após 15 minutos sem ninguém; o primeiro jogador espera ~1 minuto.

## Testar no computador

    PORT=10000 node server.js
