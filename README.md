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
│  │  ├─ backup.ts          # export/import de arquivo .aegis criptografado
│  │  ├─ webauthn.ts        # desbloqueio biométrico (WebAuthn / Passkeys)
│  │  ├─ strength.ts        # classificação de força de senha
│  │  ├─ base32.ts          # RFC 4648 (segredos TOTP)
│  │  └─ demo.ts            # dados de demonstração (sem backend)
│  └─ ui/                   # design tokens + componentes React compartilhados
├─ apps/
│  ├─ pwa/                  # app mobile (manifest, service worker, 6 telas)
│  └─ extension/            # extensão Chrome MV3 (popup + content script de autofill)
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
4. Para testar o autofill, sirva a página demo:
   ```bash
   npx serve apps/extension/demo
   ```
   e abra `acmebank.html` — o dropdown "AEGIS · 1 conta para acmebank.com.br" aparece sob o campo de e-mail. O popup da toolbar mostra as contas da página, o gerador e os códigos 2FA ao vivo.

## Telas (PWA)

| Tela | Descrição |
| --- | --- |
| **Bloqueio** | Desbloqueio biométrico (WebAuthn quando disponível; animação de varredura) |
| **Cofre** | Busca, pastas (Todos/Pessoal/Trabalho/Financeiro), badges PASSKEY, indicador 2FA e força |
| **Detalhe** | Copiar usuário/senha, revelar senha, barras de força, código 2FA vinculado com anel de 30s |
| **Autenticador** | Códigos TOTP ao vivo, anel de contagem regressiva (roxo → amarelo → vermelho) |
| **Gerador** | Modos caracteres/palavras, comprimento 8–40, toggles de conjuntos, força colorida |
| **Ajustes** | Conta Google, biometria, bloqueio automático (1 min), backup, exportar `.aegis`, bloquear cofre |

## Segurança

- **TOTP real** (RFC 6238): HMAC-SHA1 via WebCrypto, validado contra os vetores de teste do RFC.
- **Criptografia E2E**: o backup `.aegis` é cifrado com AES-256-GCM; a chave é derivada da senha-mestra com PBKDF2-SHA256 (600k iterações, recomendação OWASP). Nenhum servidor vê texto claro.
- **Biometria**: WebAuthn/Passkeys com `userVerification: required` — a digital nunca sai do dispositivo. Sem autenticador de plataforma, a demo usa o fluxo simulado do protótipo.
- **Gerador**: CSPRNG (`crypto.getRandomValues`) com rejection sampling (sem viés de módulo) e garantia de ao menos um caractere por conjunto ativo.
- **Autofill**: o content script casa o domínio da página com as entradas do cofre e preenche apenas no documento principal, via eventos de input nativos.

> **Nota (demo):** sem backend, o cofre usa dados de exemplo em memória (`packages/core/src/demo.ts`). Em produção: cofre persistido cifrado, Argon2id no lugar de PBKDF2, login Google (OIDC) para sincronização e unwrap da chave condicionado à asserção WebAuthn (PRF/largeBlob).

## Design

Tokens, tipografia (Sora / Manrope / JetBrains Mono), cores e microinterações seguem o handoff — ver `packages/ui/src/tokens.css`. Avatares de serviços são círculos com iniciais (não são logos das marcas); nomes de serviços são apenas rótulos de exemplo.
