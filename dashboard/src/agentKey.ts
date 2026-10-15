// The agent API key is the worker agent's credential. It is held client-side
// only (localStorage, never sent anywhere but the X-API-Key header) so the
// console can drive the keyed /api/v1/agent/* flow on the operator's behalf.

const STORAGE = 'pop.agentKey';

export function getAgentKey(): string {
  try {
    return localStorage.getItem(STORAGE) ?? (import.meta.env.VITE_AGENT_KEY as string | undefined) ?? '';
  } catch {
    return '';
  }
}

export function setAgentKey(value: string): void {
  try {
    if (value) localStorage.setItem(STORAGE, value);
    else localStorage.removeItem(STORAGE);
  } catch {
    /* storage unavailable; key stays in memory for this session */
  }
}
