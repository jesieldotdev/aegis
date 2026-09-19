package com.aegis.app.crypto

import android.util.Base64
import com.aegis.app.model.EncryptedEnvelope
import javax.crypto.AEADBadTagException
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/** Senha-mestra incorreta (falha de autenticação da tag do AES-GCM). */
class WrongPasswordException : Exception("Senha-mestra incorreta")

/**
 * Decifra o envelope do cofre exatamente como `packages/core/src/crypto.ts`:
 * PBKDF2-HMAC-SHA256 (iterações do próprio envelope, salt de 16 bytes) para
 * derivar uma chave AES-256, depois AES-GCM (IV de 12 bytes, tag de 16 bytes
 * já embutida no ciphertext, sem AAD).
 */
object VaultCrypto {

    fun decrypt(envelope: EncryptedEnvelope, password: String): String {
        val salt = Base64.decode(envelope.salt, Base64.DEFAULT)
        val iv = Base64.decode(envelope.iv, Base64.DEFAULT)
        val ciphertextAndTag = Base64.decode(envelope.ct, Base64.DEFAULT)

        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val spec = PBEKeySpec(password.toCharArray(), salt, envelope.iterations, 256)
        val keyBytes = factory.generateSecret(spec).encoded
        val secretKey = SecretKeySpec(keyBytes, "AES")

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(128, iv))

        val plainBytes = try {
            cipher.doFinal(ciphertextAndTag)
        } catch (e: AEADBadTagException) {
            throw WrongPasswordException()
        }
        return String(plainBytes, Charsets.UTF_8)
    }
}
