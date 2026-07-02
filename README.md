# Aegis — Gerenciador de senhas & 2FA

Cofre de senhas com tema escuro e destaque roxo, autenticador TOTP em tempo real, gerador de senhas fortes e extensão Chrome com autofill. Implementado a partir do handoff de design (alta fidelidade), em **Vite + TypeScript + React**.

<p>
  <em>Superfícies:</em> App mobile <strong>PWA</strong> (iOS/Android) · <strong>Extensão Chrome</strong> (MV3)
</p>

## Arquitetura

Monorepo (npm workspaces) com lógica compartilhada entre PWA e extensão:

```
aegis/
├─ packages/
│  ├─ core/                 # lógica pura, sem UI (TypeScript)
│  │  ├─ totp.ts            # TOTP RFC 6238 (HMAC-SHA1, 30s, 6 dígitos) via WebCrypto
│  │  ├─ generator.ts       # gerador de senha/passphrase com crypto.getRandomValues
│  │  ├─ crypto.ts          # AES-256-GCM + PBKDF2-SHA256 (600k iterações)
│  │  ├─ drive.ts           # camada REST do Google Drive (appDataFolder) — só ciphertext
│  │  ├─ sync.ts            # merge por item (updatedAt + tombstones), determinístico
│  │  ├─ backup.ts          # export/import de arquivo .aegis criptografado
│  │  ├─ webauthn.ts        # desbloqueio biométrico (WebAuthn / Passkeys)
│  │  ├─ strength.ts        # classificação de força de senha
│  │  ├─ base32.ts          # RFC 4648 (segredos TOTP)
│  │  └─ demo.ts            # dados de demonstração (opcional no onboarding)
│  └─ ui/                   # design tokens + componentes React compartilhados
├─ apps/
│  ├─ pwa/                  # app mobile (manifest, service worker, 6 telas, sync Drive)
│  └─ extension/            # extensão Chrome MV3 (popup + content script + pull do Drive)
```

## Rodando

```bash
npm install

# PWA em modo dev (http://localhost:5173)
npm run dev

# Build de tudo (PWA + extensão)
npm run build
```

### Carregando a extensão no Chrome

1. `npm run build:extension` — gera `apps/extension/dist/`
2. Abra `chrome://extensions`, ative o **Modo do desenvolvedor**
3. **Carregar sem compactação** → selecione `apps/extension/dist`
4. No popup: **Conectar com Google** baixa o cofre cifrado do Drive → digite a **senha-mestra** para desbloquear. A partir daí o popup mostra as contas da página, o gerador e os códigos 2FA reais.
5. Para testar o autofill, sirva a página demo **por HTTP** (content scripts não rodam em `file://`):
   ```bash
   npx serve apps/extension/demo   # abra http://localhost:3000/acmebank.html
   ```
   Com o cofre desbloqueado, o dropdown "AEGIS · N contas para <domínio>" aparece sob o campo de e-mail.

> A extensão só **puxa** o cofre do Drive (leitura); a edição continua no app PWA. O cofre decifrado vive em `chrome.storage.session` (some ao fechar o navegador) e é liberado ao content script para o autofill — "Bloquear" no popup limpa a sessão na hora.

## Telas (PWA)

| Tela | Descrição |
| --- | --- |
| **Onboarding** | Primeira execução: cria o cofre e define a senha-mestra (opção de dados de exemplo) |
| **Bloqueio** | Senha-mestra sempre; biometria (WebAuthn) como atalho quando ativada |
| **Cofre** | Busca, pastas (Todos/Pessoal/Trabalho/Financeiro), badges PASSKEY, indicador 2FA e força, botão + para novos itens |
| **Detalhe** | Copiar usuário/senha, revelar senha, força derivada da senha real, código 2FA com anel de 30s, editar/compartilhar/excluir |
| **Novo/Editar item** | Nome, domínio, usuário, senha (com gerador embutido), pasta, segredo 2FA (base32 ou `otpauth://`), notas |
| **Autenticador** | Códigos TOTP ao vivo; adicionar token por QR Code (câmera) ou entrada manual; remover tokens |
| **Gerador** | Modos caracteres/palavras, comprimento 8–40, toggles de conjuntos, força colorida |
| **Ajustes** | Biometria real (WebAuthn), bloqueio automático (1/5/15 min), exportar/importar `.aegis`, bloquear cofre |

## Persistência e sincronização

**Local:** o cofre é gravado em `localStorage` **sempre cifrado** (AES-256-GCM). A chave é
derivada da senha-mestra via PBKDF2 e existe apenas em memória enquanto o app está
desbloqueado — recarregar a página exige desbloquear de novo. Para o desbloqueio
biométrico, a chave do cofre é embrulhada (`wrapKey`) por uma chave de dispositivo
não-extraível no IndexedDB e só é desembrulhada após uma asserção WebAuthn com
`userVerification: required`.

**Nuvem (Google Drive):** conectando a conta Google (Ajustes → Sincronização na nuvem), o
**mesmo envelope cifrado** é gravado na pasta oculta `appDataFolder` do Drive do usuário —
por-app, por-usuário, invisível no Drive normal. O Google só enxerga ciphertext; a chave de
descriptografia nunca sai do dispositivo. OAuth (Google Identity Services) é usado **apenas
para autenticar** o acesso ao Drive, com o escopo mínimo `drive.appdata`.

Sincronização é **merge por item**, não last-write-wins de arquivo: cada credencial/token
carrega um `updatedAt` e exclusões viram tombstones, então dois dispositivos editando em
paralelo convergem sem se sobrescrever (`mergeVaults` em `packages/core/src/sync.ts` é
comutativo e idempotente). O ciclo é pull → decifra → merge → push, disparado ao desbloquear
e após cada alteração (debounced).

### Configurar o Google Drive (opcional)

1. Crie um **OAuth Client ID** (tipo "Web application") em
   [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials),
   habilite a **Google Drive API** e adicione a origem do app em "Authorized JavaScript origins".
2. Copie `apps/pwa/.env.example` para `apps/pwa/.env` e preencha `VITE_GOOGLE_CLIENT_ID`.
3. Sem essa variável o app funciona 100% offline — a opção de conectar aparece desabilitada com a devida indicação.

**Para a extensão** (mesmo Client ID Web): o Chrome usa o redirect
`https://<extension-id>.chromiumapp.org/`. Descubra o `<extension-id>` em
`chrome://extensions` (com a extensão carregada) e adicione essa URL em
"Authorized redirect URIs" do OAuth Client. Defina `VITE_GOOGLE_CLIENT_ID`
também para o build da extensão (`apps/extension/.env`). Para um id estável
entre reinstalações, fixe uma `key` no `manifest.json`.

## Segurança

- **TOTP real** (RFC 6238): HMAC-SHA1 via WebCrypto, validado contra os vetores de teste do RFC.
- **Criptografia E2E**: o backup `.aegis` é cifrado com AES-256-GCM; a chave é derivada da senha-mestra com PBKDF2-SHA256 (600k iterações, recomendação OWASP). Nenhum servidor vê texto claro.
- **Biometria**: WebAuthn/Passkeys com `userVerification: required` — a digital nunca sai do dispositivo. Sem autenticador de plataforma, a demo usa o fluxo simulado do protótipo.
- **Gerador**: CSPRNG (`crypto.getRandomValues`) com rejection sampling (sem viés de módulo) e garantia de ao menos um caractere por conjunto ativo.
- **Autofill**: o content script casa o domínio da página com as entradas do cofre e preenche apenas no documento principal, via eventos de input nativos.

> **Nota:** a extensão Chrome ainda usa os dados de exemplo (sincronização real com o cofre da PWA exigiria backend ou import do `.aegis` na extensão). Próximos passos naturais: Argon2id no lugar de PBKDF2, login Google (OIDC) para sincronização e unwrap da chave condicionado criptograficamente à asserção WebAuthn (PRF/largeBlob).

## Design

Tokens, tipografia (Sora / Manrope / JetBrains Mono), cores e microinterações seguem o handoff — ver `packages/ui/src/tokens.css`. Avatares de serviços são círculos com iniciais (não são logos das marcas); nomes de serviços são apenas rótulos de exemplo.
