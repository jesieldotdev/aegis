/**
 * Declaração mínima das APIs de extensão usadas pela popup/content/background.
 * (Evita a dependência @types/chrome para uma superfície tão pequena.)
 */
declare namespace chrome {
  namespace tabs {
    type Tab = { id?: number; url?: string };
    function query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Tab[]>;
    function sendMessage(tabId: number, message: unknown): Promise<unknown>;
  }
  namespace runtime {
    const id: string | undefined;
    const onMessage: {
      addListener(
        callback: (message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => void,
      ): void;
    };
    const onInstalled: { addListener(cb: () => void): void };
    const onStartup: { addListener(cb: () => void): void };
  }
  namespace identity {
    function getRedirectURL(path?: string): string;
    function launchWebAuthFlow(details: { url: string; interactive: boolean }): Promise<string>;
  }
  namespace storage {
    type AccessLevel = 'TRUSTED_CONTEXTS' | 'TRUSTED_AND_UNTRUSTED_CONTEXTS';
    interface StorageArea {
      get(keys: string | string[] | null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    }
    interface SessionStorageArea extends StorageArea {
      setAccessLevel(details: { accessLevel: AccessLevel }): Promise<void>;
    }
    const local: StorageArea;
    const session: SessionStorageArea;
    const onChanged: {
      addListener(
        cb: (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>, area: string) => void,
      ): void;
    };
  }
}
