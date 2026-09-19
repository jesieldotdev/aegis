package com.aegis.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.aegis.app.model.Credential
import com.aegis.app.model.Vault

@Composable
fun SignInScreen(onSignInClick: () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Aegis", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(8.dp))
            Text("Entre com a conta Google usada no cofre", style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(24.dp))
            Button(onClick = onSignInClick) {
                Text("Entrar com Google")
            }
        }
    }
}

@Composable
fun LoadingScreen(label: String = "Carregando…") {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator()
            Spacer(Modifier.height(16.dp))
            Text(label)
        }
    }
}

@Composable
fun NoVaultScreen(accountEmail: String, onSignOut: () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(24.dp)) {
            Text("Nenhum cofre encontrado no Drive de $accountEmail")
            Spacer(Modifier.height(16.dp))
            OutlinedButton(onClick = onSignOut) { Text("Trocar de conta") }
        }
    }
}

@Composable
fun UnlockScreen(accountEmail: String, error: String?, onUnlock: (String) -> Unit, onSignOut: () -> Unit) {
    var password by remember { mutableStateOf("") }
    var show by remember { mutableStateOf(false) }

    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(24.dp).fillMaxWidth(),
        ) {
            Text("Cofre de $accountEmail", style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Senha-mestra") },
                singleLine = true,
                visualTransformation = if (show) VisualTransformation.None else PasswordVisualTransformation(),
                trailingIcon = {
                    IconButton(onClick = { show = !show }) {
                        Icon(if (show) Icons.Filled.VisibilityOff else Icons.Filled.Visibility, contentDescription = null)
                    }
                },
                isError = error != null,
                supportingText = { if (error != null) Text(error) },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(16.dp))
            Button(onClick = { onUnlock(password) }, modifier = Modifier.fillMaxWidth()) {
                Text("Desbloquear")
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth()) {
                Text("Trocar de conta")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VaultScreen(vault: Vault, onCopyPassword: (String) -> Unit, onSignOut: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(vault.profileName.ifEmpty { "Cofre" }) },
                actions = {
                    IconButton(onClick = onSignOut) { Text("Sair") }
                },
            )
        },
    ) { padding ->
        if (vault.credentials.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("Nenhuma credencial neste cofre")
            }
        } else {
            LazyColumn(contentPadding = PaddingValues(16.dp, 8.dp), modifier = Modifier.padding(padding)) {
                items(vault.credentials, key = { it.id }) { credential ->
                    CredentialCard(credential, onCopyPassword)
                    Spacer(Modifier.height(10.dp))
                }
            }
        }
    }
}

@Composable
private fun CredentialCard(credential: Credential, onCopyPassword: (String) -> Unit) {
    var reveal by remember { mutableStateOf(false) }

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text(credential.name.ifEmpty { credential.domain }, style = MaterialTheme.typography.titleMedium)
            if (credential.domain.isNotEmpty()) {
                Text(credential.domain, style = MaterialTheme.typography.bodySmall)
            }
            Spacer(Modifier.height(6.dp))
            Text(credential.username, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(4.dp))
            Column {
                Text(
                    if (reveal) credential.password else "•".repeat(credential.password.length.coerceAtMost(16)),
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            Spacer(Modifier.height(8.dp))
            Row {
                IconButton(onClick = { reveal = !reveal }) {
                    Icon(if (reveal) Icons.Filled.VisibilityOff else Icons.Filled.Visibility, contentDescription = "Mostrar senha")
                }
                IconButton(onClick = { onCopyPassword(credential.password) }) {
                    Icon(Icons.Filled.ContentCopy, contentDescription = "Copiar senha")
                }
            }
        }
    }
}

@Composable
private fun Row(content: @Composable () -> Unit) {
    androidx.compose.foundation.layout.Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        content = { content() },
    )
}

@Composable
fun ErrorScreen(message: String, onRetry: () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(24.dp)) {
            Text(message, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(16.dp))
            OutlinedButton(onClick = onRetry) { Text("Voltar") }
        }
    }
}
