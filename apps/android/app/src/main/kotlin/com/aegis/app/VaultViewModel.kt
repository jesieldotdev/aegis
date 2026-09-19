package com.aegis.app

import android.accounts.Account
import android.app.Application
import android.content.Intent
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.aegis.app.crypto.VaultCrypto
import com.aegis.app.crypto.WrongPasswordException
import com.aegis.app.drive.DRIVE_APPDATA_SCOPE
import com.aegis.app.drive.DriveClient
import com.aegis.app.model.EncryptedEnvelope
import com.aegis.app.model.Vault
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.Scope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

sealed interface VaultUiState {
    data object SignedOut : VaultUiState
    data object Loading : VaultUiState
    data class NoVaultFound(val accountEmail: String) : VaultUiState
    data class NeedsPassword(val accountEmail: String, val error: String? = null) : VaultUiState
    data class Unlocked(val vault: Vault) : VaultUiState
    data class Error(val message: String) : VaultUiState
}

class VaultViewModel(application: Application) : AndroidViewModel(application) {

    private val _state = MutableStateFlow<VaultUiState>(VaultUiState.SignedOut)
    val state: StateFlow<VaultUiState> = _state

    private var account: GoogleSignInAccount? = null
    private var envelope: EncryptedEnvelope? = null

    private val signInClient: GoogleSignInClient by lazy {
        val options = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestScopes(Scope(DRIVE_APPDATA_SCOPE))
            .build()
        GoogleSignIn.getClient(getApplication(), options)
    }

    fun signInIntent(): Intent = signInClient.signInIntent

    fun onSignInResult(data: Intent?) {
        val task = GoogleSignIn.getSignedInAccountFromIntent(data)
        try {
            val acc = task.getResult(ApiException::class.java)
            account = acc
            downloadAndPromptPassword(acc)
        } catch (e: ApiException) {
            _state.value = VaultUiState.Error("Login com Google falhou (${e.statusCode})")
        }
    }

    private fun downloadAndPromptPassword(acc: GoogleSignInAccount) {
        _state.value = VaultUiState.Loading
        viewModelScope.launch {
            try {
                val token = withContext(Dispatchers.IO) { fetchAccessToken(acc) }
                val env = withContext(Dispatchers.IO) { DriveClient.downloadEnvelope(token) }
                envelope = env
                _state.value = if (env == null) {
                    VaultUiState.NoVaultFound(acc.email.orEmpty())
                } else {
                    VaultUiState.NeedsPassword(acc.email.orEmpty())
                }
            } catch (e: Exception) {
                _state.value = VaultUiState.Error(e.message ?: "Falha ao baixar o cofre do Drive")
            }
        }
    }

    private fun fetchAccessToken(acc: GoogleSignInAccount): String {
        val account = Account(acc.email, "com.google")
        return GoogleAuthUtil.getToken(getApplication(), account, "oauth2:$DRIVE_APPDATA_SCOPE")
    }

    fun unlock(password: String) {
        val env = envelope ?: return
        val email = account?.email.orEmpty()
        viewModelScope.launch {
            try {
                val plaintext = withContext(Dispatchers.Default) { VaultCrypto.decrypt(env, password) }
                val vault = Vault.parse(plaintext)
                _state.value = VaultUiState.Unlocked(vault)
            } catch (e: WrongPasswordException) {
                _state.value = VaultUiState.NeedsPassword(email, error = "Senha-mestra incorreta")
            } catch (e: Exception) {
                _state.value = VaultUiState.NeedsPassword(email, error = "Não foi possível ler o cofre")
            }
        }
    }

    fun signOut() {
        signInClient.signOut()
        account = null
        envelope = null
        _state.value = VaultUiState.SignedOut
    }
}
