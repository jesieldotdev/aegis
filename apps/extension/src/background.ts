/**
 * Service worker: garante que o content script (mundo isolado) possa ler o
 * cofre da sessão para oferecer autofill, mesmo que a popup não tenha sido
 * aberta nesta sessão.
 */
import { allowContentScriptSession } from './vault-store';

chrome.runtime.onInstalled.addListener(() => void allowContentScriptSession());
chrome.runtime.onStartup.addListener(() => void allowContentScriptSession());
