# Justificativas de permissão — Chrome Web Store

Textos para o formulário "Justificativa da permissão" da listagem da extensão.
Baseados no uso real do código. Cada campo aceita até 1.000 caracteres.

## activeTab

Usada para identificar o site aberto no momento em que você aciona a extensão. A partir da URL da aba ativa, o popup obtém apenas o domínio para (1) mostrar as credenciais do cofre que correspondem àquele site e (2) pré-preencher o campo "Domínio" ao criar uma nova conta. Também é usada para preencher os campos de login da aba ativa quando você clica em "Preencher". Não lemos o conteúdo da página nem acessamos outras abas.

## clipboardWrite

Usada para copiar, a seu pedido, a senha, o nome de usuário ou o código 2FA (TOTP) de um item do cofre para a área de transferência, ao tocar no botão de copiar. Só escrevemos na área de transferência mediante ação explícita do usuário e nunca lemos o conteúdo dela.

## identity

Usada para autenticar o usuário no Google via chrome.identity.getAuthToken, obtendo um token OAuth para acessar o Google Drive. Isso permite sincronizar o cofre — já cifrado no dispositivo — em uma pasta privada do aplicativo (appDataFolder) na conta do próprio usuário. O token autoriza apenas o armazenamento do arquivo cifrado; não temos acesso ao conteúdo do cofre.

## storage

Usada para armazenar localmente o cofre de forma cifrada (chrome.storage.local) e o estado da sessão enquanto o cofre está desbloqueado (chrome.storage.session). Nenhum dado sensível é gravado em texto puro; a chave de decifração é derivada da senha-mestra e nunca é persistida.

## Permissão do host

Duas necessidades: (1) "https://www.googleapis.com/*" — chamadas à API do Google Drive para enviar e baixar o arquivo cifrado do cofre na pasta privada do app. (2) O content script roda em páginas http/https para oferecer preenchimento automático: detecta os campos de login e, quando você seleciona uma credencial, preenche usuário e senha na página atual. O casamento é por domínio e o preenchimento ocorre apenas por ação sua. O content script não lê, coleta nem transmite o conteúdo das páginas — apenas localiza os campos de login para preenchê-los. O acesso amplo é necessário porque um gerenciador de senhas precisa funcionar em qualquer site onde você tenha uma conta.

## Código remoto

Não, não estou usando código remoto. Todo o JavaScript é empacotado no build da
extensão; não há `<script>` externo, módulos remotos nem `eval()`. As chamadas ao
Google são apenas dados (REST), não código executável.

---

Observação: o aviso de "revisão detalhada" aparece por causa do content script em
todos os sites (`http://*/*`, `https://*/*`), necessário para o autofill funcionar
em qualquer página — comum em gerenciadores de senha.
