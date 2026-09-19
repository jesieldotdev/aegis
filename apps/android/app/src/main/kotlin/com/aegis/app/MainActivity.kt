package com.aegis.app

import android.content.ClipData
import android.content.ClipboardManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.aegis.app.ui.ErrorScreen
import com.aegis.app.ui.LoadingScreen
import com.aegis.app.ui.NoVaultScreen
import com.aegis.app.ui.SignInScreen
import com.aegis.app.ui.UnlockScreen
import com.aegis.app.ui.VaultScreen

class MainActivity : ComponentActivity() {

    private val viewModel: VaultViewModel by viewModels()

    private val signInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        viewModel.onSignInResult(result.data)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier) {
                    val state by viewModel.state.collectAsState()
                    when (val current = state) {
                        is VaultUiState.SignedOut -> SignInScreen(
                            onSignInClick = { signInLauncher.launch(viewModel.signInIntent()) },
                        )
                        is VaultUiState.Loading -> LoadingScreen("Baixando cofre do Drive…")
                        is VaultUiState.NoVaultFound -> NoVaultScreen(
                            accountEmail = current.accountEmail,
                            onSignOut = viewModel::signOut,
                        )
                        is VaultUiState.NeedsPassword -> UnlockScreen(
                            accountEmail = current.accountEmail,
                            error = current.error,
                            onUnlock = viewModel::unlock,
                            onSignOut = viewModel::signOut,
                        )
                        is VaultUiState.Unlocked -> VaultScreen(
                            vault = current.vault,
                            onCopyPassword = ::copyToClipboard,
                            onSignOut = viewModel::signOut,
                        )
                        is VaultUiState.Error -> ErrorScreen(
                            message = current.message,
                            onRetry = viewModel::signOut,
                        )
                    }
                }
            }
        }
    }

    private fun copyToClipboard(text: String) {
        val clipboard = getSystemService(ClipboardManager::class.java)
        clipboard.setPrimaryClip(ClipData.newPlainText("Senha", text))
    }
}
