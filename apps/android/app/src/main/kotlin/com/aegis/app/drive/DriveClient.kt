package com.aegis.app.drive

import com.aegis.app.model.EncryptedEnvelope
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Escopo do Drive usado só para o `appDataFolder` — nunca vê o cofre em texto claro. */
const val DRIVE_APPDATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata"

private const val VAULT_FILE_NAME = "aegis-vault.json"

/**
 * Baixa o envelope cifrado do cofre no Google Drive (pasta oculta `appDataFolder`),
 * mesmo arquivo que a PWA e a extensão leem/escrevem via `packages/core/src/drive.ts`.
 * Somente leitura: não reimplementa o upload.
 */
object DriveClient {

    fun downloadEnvelope(accessToken: String): EncryptedEnvelope? {
        val fileId = findVaultFileId(accessToken) ?: return null
        val body = get(
            "https://www.googleapis.com/drive/v3/files/$fileId?alt=media",
            accessToken,
        )
        return EncryptedEnvelope.fromJson(body)
    }

    private fun findVaultFileId(accessToken: String): String? {
        val query = "name='$VAULT_FILE_NAME'"
        val url = "https://www.googleapis.com/drive/v3/files" +
            "?spaces=appDataFolder" +
            "&q=" + java.net.URLEncoder.encode(query, "UTF-8") +
            "&fields=" + java.net.URLEncoder.encode("files(id)", "UTF-8")
        val body = get(url, accessToken)
        val files = JSONObject(body).optJSONArray("files") ?: return null
        if (files.length() == 0) return null
        return files.getJSONObject(0).getString("id")
    }

    private fun get(urlString: String, accessToken: String): String {
        val connection = URL(urlString).openConnection() as HttpURLConnection
        connection.requestMethod = "GET"
        connection.setRequestProperty("Authorization", "Bearer $accessToken")
        connection.connectTimeout = 15_000
        connection.readTimeout = 15_000
        try {
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val text = stream.bufferedReader().use { it.readText() }
            if (status !in 200..299) {
                throw RuntimeException("Drive API retornou $status: $text")
            }
            return text
        } finally {
            connection.disconnect()
        }
    }
}
