# Contribuindo com o Aegis

## Fluxo de branches

```
feat/algo  →  dev  →  master
 (trabalho)  (integração)  (produção)
```

- **`master`** — branch de produção. Estável, sempre deployável. Só recebe merge vinda de `dev` (via PR).
- **`dev`** — branch de integração. Onde as features se juntam e são testadas antes de virar release.
- **`feat/*`** — branches de trabalho, uma por tarefa. Saem de `dev` e voltam para `dev` via PR.

### Passo a passo

1. **Comece a partir da `dev` atualizada:**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/nome-curto-da-tarefa
   ```
   Convenção de nome: `feat/`, `fix/`, `chore/`, `docs/` + descrição em kebab-case
   (ex.: `feat/extensao-criar-conta`, `fix/lock-thumb-zone`).

2. **Desenvolva e faça commits pequenos e descritivos.** Antes de abrir o PR:
   ```bash
   npm run build       # PWA + extensão precisam buildar sem erro
   npm run typecheck   # sem erros de tipo
   ```

3. **Abra o PR para `dev`** (não para `master`). Descreva o que mudou e como testar.

4. **Release para produção:** quando `dev` estiver estável, abre-se um PR `dev → master`.
   O merge em `master` representa uma versão pronta para deploy.

### Regras

- Nunca faça commit direto em `master` — sempre via PR de `dev`.
- Mantenha `feat/*` curtas; rebaseie em `dev` se ela andar muito.
- Um PR = uma intenção. Evite misturar refactor grande com feature.

## Estrutura do projeto

Monorepo com npm workspaces (detalhes no `README.md`):

- `packages/core` — lógica pura (cripto, TOTP, gerador, sync, Drive). Sem UI.
- `packages/ui` — design tokens e componentes React compartilhados.
- `apps/pwa` — app mobile (Vite + React).
- `apps/extension` — extensão Chrome MV3.

## Scripts úteis

```bash
npm run dev              # PWA em modo dev
npm run build            # build de PWA + extensão
npm run build:pwa        # só a PWA
npm run build:extension  # só a extensão
npm run typecheck        # checagem de tipos do monorepo
```
