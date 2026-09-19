package com.aegis.app.model

import org.json.JSONObject

/** Espelha `EncryptedEnvelope` de packages/core/src/crypto.ts. */
data class EncryptedEnvelope(
    val v: Int,
    val kdf: String,
    val iterations: Int,
    val salt: String,
    val iv: String,
    val ct: String,
) {
    companion object {
        fun fromJson(json: String): EncryptedEnvelope {
            val o = JSONObject(json)
            return EncryptedEnvelope(
                v = o.getInt("v"),
                kdf = o.getString("kdf"),
                iterations = o.getInt("iterations"),
                salt = o.getString("salt"),
                iv = o.getString("iv"),
                ct = o.getString("ct"),
            )
        }
    }
}

/** Espelha `Credential` de packages/core/src/types.ts. */
data class Credential(
    val id: String,
    val name: String,
    val domain: String,
    val username: String,
    val password: String,
    val category: String,
    val hasTotp: Boolean,
    val notes: String?,
)

/** Cofre decifrado — só o necessário para a visualização somente-leitura. */
data class Vault(
    val profileName: String,
    val credentials: List<Credential>,
) {
    companion object {
        /** Analisa o JSON já decifrado (`JSON.stringify(vault)` original). */
        fun parse(plaintextJson: String): Vault {
            val root = JSONObject(plaintextJson)
            val profileName = root.optJSONObject("profile")?.optString("name").orEmpty()
            val credentialsJson = root.optJSONArray("credentials")
            val credentials = buildList {
                if (credentialsJson != null) {
                    for (i in 0 until credentialsJson.length()) {
                        val c = credentialsJson.getJSONObject(i)
                        add(
                            Credential(
                                id = c.getString("id"),
                                name = c.optString("name"),
                                domain = c.optString("domain"),
                                username = c.optString("username"),
                                password = c.optString("password"),
                                category = c.optString("category"),
                                hasTotp = !c.isNull("totpSecret") && c.optString("totpSecret").isNotEmpty(),
                                notes = c.optString("notes").takeIf { it.isNotEmpty() },
                            ),
                        )
                    }
                }
            }
            return Vault(profileName = profileName, credentials = credentials)
        }
    }
}
