/**
 * Declaração mínima das APIs de extensão usadas pelo popup.
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
  }
}
