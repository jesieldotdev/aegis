/**
 * Desbloqueio biométrico via WebAuthn (Passkeys).
 *
 * No Android aciona o BiometricPrompt; no iOS, Face/Touch ID; no desktop,
 * Windows Hello / Touch ID. A biometria verifica o usuário localmente —
 * a digital nunca sai do dispositivo.
 *
 * Nesta demo (sem servidor) o challenge é gerado localmente e o resultado
 * apenas libera a UI. Em produção, o unwrap da chave de criptografia do
 * cofre deve ser condicionado à asserção (ex.: PRF extension / largeBlob).
 */

const CREDENTIAL_ID_KEY = 'aegis.webauthn.credentialId';

export function isWebAuthnAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnAvailable()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function randomChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

function toBase64Url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Registra uma passkey local (primeira utilização). */
export async function registerBiometric(userName: string): Promise<boolean> {
  if (!isWebAuthnAvailable()) return false;
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: randomChallenge() as unknown as BufferSource,
        rp: { name: 'Aegis', id: location.hostname },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)) as unknown as BufferSource,
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
        },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    if (!credential) return false;
    localStorage.setItem(CREDENTIAL_ID_KEY, toBase64Url(credential.rawId));
    return true;
  } catch {
    return false;
  }
}

/**
 * Solicita verificação biométrica. Registra a passkey na primeira vez.
 * Retorna true se o usuário foi verificado.
 */
export async function verifyBiometric(userName: string): Promise<boolean> {
  if (!isWebAuthnAvailable()) return false;
  const storedId = localStorage.getItem(CREDENTIAL_ID_KEY);
  if (!storedId) return registerBiometric(userName);
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge() as unknown as BufferSource,
        allowCredentials: [{ type: 'public-key', id: fromBase64Url(storedId) as unknown as BufferSource }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}
