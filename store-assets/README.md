# Assets da Chrome Web Store — Aegis

Materiais para a listagem da extensão na Chrome Web Store.

## Conteúdo

- `icone-128.png` — ícone da listagem (128×128).
- `icone-512.png` — ícone em alta resolução.
- `descricao.md` — texto para o campo **Descrição** da listagem.
- `extensao/` — capturas de tela (1280×800, o tamanho pedido pela loja):
  - `01-nova-conta.png` — popup: gerar senha e criar conta.
  - `02-autofill-2fa.png` — popup: autofill de credenciais + código 2FA.
  - `03-cofre.png` — app: tela do Cofre.
  - `04-notas.png` — app: notas seguras (estilo Keep).

## Observações

- As capturas usam a UI real (CSS compilado) com dados de demonstração fictícios.
- O pacote para upload é um `.zip` do build **sem o campo `key`** no manifest;
  após publicar, atualize o Item ID do OAuth client no Google Cloud Console.
- URL de Política de Privacidade: `https://aegis.jesiel.cloud/privacidade`.
