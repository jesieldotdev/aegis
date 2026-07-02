/**
 * Content script do Aegis: casa o domínio da página com entradas do cofre e
 * oferece autofill inline em formulários de login.
 *
 * Segurança: preenche apenas via eventos de input no documento principal —
 * nunca injeta segredos em iframes de terceiros; o casamento é por origem.
 */
import { avatarFor, type Credential, type Vault } from '@aegis/core';

const PREFIX = 'aegis-ext';
const SESSION_VAULT_KEY = 'aegis.vault';

/** Lê o cofre decifrado da sessão (só existe enquanto desbloqueado na popup). */
async function loadVault(): Promise<Vault | null> {
  if (typeof chrome === 'undefined' || !chrome.storage?.session) return null;
  try {
    const r = await chrome.storage.session.get(SESSION_VAULT_KEY);
    return (r[SESSION_VAULT_KEY] as Vault | undefined) ?? null;
  } catch {
    return null;
  }
}

const SHIELD_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 3l6.5 2.8v4.8c0 4-2.7 7.3-6.5 8.6-3.8-1.3-6.5-4.6-6.5-8.6V5.8L12 3z" fill="#fff" fill-opacity=".2" stroke="#fff" stroke-width="1.8"/></svg>`;

function pageDomain(): string {
  // A página demo (localhost/file) simula um domínio via data-attribute
  return document.body?.dataset.aegisDemo || location.hostname.replace(/^www\./, '');
}

function credentialsForDomain(creds: Credential[], domain: string): Credential[] {
  if (!domain) return [];
  const h = domain.toLowerCase();
  return creds.filter((c) => {
    const d = c.domain.toLowerCase();
    return d === h || d.endsWith(`.${h}`) || h.endsWith(`.${d}`) || d.split('.').slice(-2).join('.') === h;
  });
}

function findLoginFields(): { user: HTMLInputElement; pass: HTMLInputElement } | null {
  const pass = document.querySelector<HTMLInputElement>('input[type="password"]');
  if (!pass) return null;
  const form = pass.closest('form') ?? document;
  const user =
    form.querySelector<HTMLInputElement>('input[type="email"]') ??
    form.querySelector<HTMLInputElement>(
      'input[type="text"][name*="user" i], input[type="text"][name*="email" i], input[type="text"][autocomplete="username"], input[type="text"]',
    );
  return user ? { user, pass } : null;
}

/** Define o valor disparando eventos nativos (compatível com React/Vue). */
function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter ? setter.call(input, value) : (input.value = value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function injectStyles() {
  if (document.getElementById(`${PREFIX}-styles`)) return;
  const style = document.createElement('style');
  style.id = `${PREFIX}-styles`;
  style.textContent = `
@keyframes ${PREFIX}-toast {
  0% { transform: translate(-50%, 14px); opacity: 0; }
  12% { transform: translate(-50%, 0); opacity: 1; }
  88% { transform: translate(-50%, 0); opacity: 1; }
  100% { transform: translate(-50%, -6px); opacity: 0; }
}
.${PREFIX}-dropdown {
  position: absolute; z-index: 2147483646;
  background: #14141c; border-radius: 14px; padding: 6px;
  box-shadow: 0 18px 44px rgba(20,10,50,.34);
  border: 1px solid rgba(167,139,250,.25);
  font-family: 'Manrope', system-ui, sans-serif;
  box-sizing: border-box;
}
.${PREFIX}-dropdown * { box-sizing: border-box; }
.${PREFIX}-head {
  display: flex; align-items: center; gap: 7px; padding: 7px 9px 8px;
}
.${PREFIX}-head-logo {
  width: 20px; height: 20px; border-radius: 6px;
  background: linear-gradient(145deg,#a78bfa,#7c3aed);
  display: flex; align-items: center; justify-content: center;
}
.${PREFIX}-head-label {
  font-size: 11px; font-weight: 700; color: #a78bfa; letter-spacing: .3px;
}
.${PREFIX}-row {
  display: flex; align-items: center; gap: 11px; padding: 10px;
  border-radius: 10px; cursor: pointer; background: rgba(167,139,250,.1);
  border: none; width: 100%; text-align: left; margin-top: 2px;
}
.${PREFIX}-avatar {
  width: 36px; height: 36px; border-radius: 10px; flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-family: 'Sora', sans-serif;
}
.${PREFIX}-name { font-size: 13.5px; font-weight: 700; color: #f2f2f6; }
.${PREFIX}-user { font-size: 12px; color: #8b8b9c; }
.${PREFIX}-fill {
  padding: 7px 12px; border-radius: 8px;
  background: linear-gradient(145deg,#a78bfa,#7c3aed);
  color: #fff; font-size: 12px; font-weight: 700; flex: 0 0 auto;
}
.${PREFIX}-badge {
  position: absolute; z-index: 2147483646;
  width: 22px; height: 22px; border-radius: 6px;
  background: linear-gradient(145deg,#a78bfa,#7c3aed);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(124,58,237,.4); pointer-events: none;
}
.${PREFIX}-toast {
  position: fixed; bottom: 34px; left: 50%; z-index: 2147483647;
  animation: ${PREFIX}-toast 1.6s ease forwards;
  display: flex; align-items: center; gap: 9px; padding: 11px 18px;
  border-radius: 999px; background: #1c1c28;
  border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 12px 30px rgba(0,0,0,.5); white-space: nowrap;
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 14px; font-weight: 600; color: #f2f2f6;
}
`;
  document.head.appendChild(style);
}

function showToast(msg: string) {
  document.querySelector(`.${PREFIX}-toast`)?.remove();
  const toast = document.createElement('div');
  toast.className = `${PREFIX}-toast`;
  toast.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg><span></span>`;
  toast.querySelector('span')!.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1600);
}

function removeDropdown() {
  document.getElementById(`${PREFIX}-dropdown`)?.remove();
}

function fillCredential(cred: Credential) {
  const fields = findLoginFields();
  if (!fields) return;
  setValue(fields.user, cred.username);
  setValue(fields.pass, cred.password);
  removeDropdown();
  showToast('Preenchido pela Aegis');
}

function avatarStyle(cred: Credential): { background: string; initial: string } {
  const { color, initial } = avatarFor(cred.id, cred.name);
  return { background: color, initial };
}

function showDropdown(anchor: HTMLInputElement, creds: Credential[], domain: string) {
  removeDropdown();
  const rect = anchor.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.id = `${PREFIX}-dropdown`;
  dropdown.className = `${PREFIX}-dropdown`;
  dropdown.style.top = `${rect.bottom + window.scrollY + 7}px`;
  dropdown.style.left = `${rect.left + window.scrollX}px`;
  dropdown.style.width = `${Math.max(rect.width, 280)}px`;

  const head = document.createElement('div');
  head.className = `${PREFIX}-head`;
  head.innerHTML = `<div class="${PREFIX}-head-logo">${SHIELD_SVG}</div><span class="${PREFIX}-head-label"></span>`;
  head.querySelector('span')!.textContent = `AEGIS · ${creds.length} conta${creds.length > 1 ? 's' : ''} para ${domain}`;
  dropdown.appendChild(head);

  for (const cred of creds) {
    const { background, initial } = avatarStyle(cred);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `${PREFIX}-row`;
    row.innerHTML = `
      <div class="${PREFIX}-avatar"></div>
      <div style="flex:1; min-width:0;">
        <div class="${PREFIX}-name"></div>
        <div class="${PREFIX}-user"></div>
      </div>
      <div class="${PREFIX}-fill">Preencher</div>`;
    const avatar = row.querySelector<HTMLElement>(`.${PREFIX}-avatar`)!;
    avatar.style.background = background;
    avatar.textContent = initial;
    row.querySelector(`.${PREFIX}-name`)!.textContent = cred.name;
    row.querySelector(`.${PREFIX}-user`)!.textContent = cred.username;
    row.addEventListener('click', () => fillCredential(cred));
    dropdown.appendChild(row);
  }

  document.body.appendChild(dropdown);

  const dismiss = (e: MouseEvent) => {
    if (!dropdown.contains(e.target as Node) && e.target !== anchor) {
      removeDropdown();
      document.removeEventListener('mousedown', dismiss);
    }
  };
  document.addEventListener('mousedown', dismiss);
}

function addPasswordBadge(pass: HTMLInputElement) {
  if (document.getElementById(`${PREFIX}-badge`)) return;
  const badge = document.createElement('div');
  badge.id = `${PREFIX}-badge`;
  badge.className = `${PREFIX}-badge`;
  badge.innerHTML = SHIELD_SVG;
  const position = () => {
    const rect = pass.getBoundingClientRect();
    badge.style.top = `${rect.top + window.scrollY + (rect.height - 22) / 2}px`;
    badge.style.left = `${rect.right + window.scrollX - 22 - 10}px`;
  };
  position();
  document.body.appendChild(badge);
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
}

async function init() {
  const fields = findLoginFields();
  if (!fields) return;
  const vault = await loadVault();
  if (!vault) return; // cofre bloqueado ou não conectado — sem autofill
  const domain = pageDomain();
  const creds = credentialsForDomain(vault.credentials, domain);
  if (creds.length === 0) return;

  injectStyles();
  addPasswordBadge(fields.pass);
  showDropdown(fields.user, creds, domain);
  fields.user.addEventListener('focus', () => showDropdown(fields.user, creds, domain));
}

// Reage ao desbloquear/bloquear na popup: (re)avalia o autofill na hora.
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'session' && SESSION_VAULT_KEY in changes) {
      removeDropdown();
      void init();
    }
  });
}

// Preenchimento disparado pelo popup da toolbar
if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
  chrome.runtime.onMessage.addListener((message: unknown) => {
    const msg = message as { type?: string; username?: string; password?: string };
    if (msg?.type === 'aegis-fill' && msg.username && msg.password) {
      const fields = findLoginFields();
      if (fields) {
        injectStyles();
        setValue(fields.user, msg.username);
        setValue(fields.pass, msg.password);
        removeDropdown();
        showToast('Preenchido pela Aegis');
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
