# Chat da LP

O frontend original do ZIP foi reaproveitado e compilado para esta pasta. A LP carrega `css/solar-chat.css` e `js/solar-chat.js`; o iframe carrega este `index.html` somente na primeira abertura.

O áudio `media/boas-vindas.mp3` é uma cópia exata do MP3 fornecido pelo usuário. A mensagem textual foi adaptada a partir do roteiro genérico da conversa.

## Demonstração

O chat envia o cadastro para o mesmo `appsScriptUrl` configurado no início de `index.html`. O payload inclui respostas, contato, potência, geração, economia, UTMs e identificadores de clique. Em caso de falha, as respostas permanecem na janela e o mesmo `request_id` é reutilizado na nova tentativa. Ao recarregar a LP, a conversa é reiniciada; parâmetros de campanha e identificador de sessão permanecem temporariamente no `sessionStorage`.

Para ativar cadastros futuramente, configure e valide um backend e o WhatsApp correto antes de habilitar o botão. Não considere um envio concluído sem confirmação real do servidor.

## Manutenção

O código editável fica em `../.chat-source/src`. Dentro de `.chat-source`, use `npm.cmd install` e `npm.cmd run build`. Os testes `node test.mjs` e `node audio-test.mjs` usam Edge e a LP em `http://127.0.0.1:8080/`.

Na hospedagem estática, envie a pasta `chat/` junto da LP, CSS, JS e imagens. Não é necessário publicar `.chat-source`, `node_modules` ou os testes.
