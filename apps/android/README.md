# Aegis — Android (mini, somente leitura)

App Kotlin/Jetpack Compose mínimo: login com Google, baixa o cofre cifrado do
Google Drive (`appDataFolder`, mesmo arquivo `aegis-vault.json` da PWA/extensão),
pede a senha-mestra e mostra a lista de credenciais (nome, usuário, senha com
revelar/copiar). **Não** tem autofill de sistema, edição, nem sync de volta —
é um visualizador.

## Antes de rodar: criar o OAuth client Android no Google Cloud

O Client ID usado pela PWA/extensão é do tipo "Web"/"Chrome App" e não serve
para apps Android — o Google exige um client separado, vinculado ao
`applicationId` + assinatura (SHA-1) do APK.

1. Pegue o SHA-1 da sua chave de debug:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
2. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   no **mesmo projeto** já usado pela PWA/extensão (o client web começa com
   `333045718126-...`), crie um novo **OAuth client ID** do tipo **Android**:
   - Package name: `com.aegis.app`
   - SHA-1: o valor obtido acima
3. Não precisa colocar esse client ID em nenhum arquivo do projeto — o
   Google Play Services identifica o app pelo `applicationId` + assinatura
   automaticamente ao chamar `GoogleSignIn`. Só precisa existir cadastrado.
4. A API do Drive e o escopo `drive.appdata` já devem estar habilitados no
   projeto (é o que a PWA/extensão já usam).
5. Para publicar depois com chave de release, repita o passo 1/2 com o SHA-1
   da keystore de release.

## Rodando

Abra a pasta `apps/android` no Android Studio (Gradle sincroniza sozinho) ou,
com o Android SDK/JDK 17 instalado:

```bash
cd apps/android
./gradlew installDebug
```

> O wrapper (`gradlew`/`gradlew.bat`) não está commitado — ao abrir no Android
> Studio ele é gerado automaticamente. Rodando fora do Studio, gere antes com
> `gradle wrapper --gradle-version 8.7` (precisa de um Gradle instalado uma
> única vez para isso).

## Estrutura

```
app/src/main/kotlin/com/aegis/app/
├─ MainActivity.kt         # host da Activity única + Compose
├─ VaultViewModel.kt       # login -> download -> decifra -> estado de UI
├─ crypto/VaultCrypto.kt   # PBKDF2-SHA256 (600k) + AES-256-GCM, espelha packages/core/src/crypto.ts
├─ drive/DriveClient.kt    # REST do Drive appDataFolder, espelha packages/core/src/drive.ts
├─ model/Vault.kt          # EncryptedEnvelope / Credential / Vault, espelha packages/core/src/types.ts
└─ ui/Screens.kt           # telas Compose (login, carregando, senha, lista)
```
