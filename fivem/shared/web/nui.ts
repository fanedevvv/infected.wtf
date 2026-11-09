declare function GetParentResourceName(): string;

/** True inside FiveM; false when the page is opened in a normal browser for styling. */
export const inGame = typeof GetParentResourceName === 'function';
const resource = inGame ? GetParentResourceName() : __RESOURCE__;

/** POSTs to a RegisterNuiCallback handler in the client script. */
export async function postNui<T = { ok: boolean; error?: string }>(endpoint: string, data: unknown = {}): Promise<T> {
    const response = await fetch(`https://${resource}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`NUI request "${endpoint}" failed (${response.status})`);
    return response.json() as Promise<T>;
}

type Handlers<M extends { type: string }> = { [K in M['type']]?: (message: Extract<M, { type: K }>) => void };

/** Dispatches window messages from the client script by their `type`. */
export function onNuiMessage<M extends { type: string }>(handlers: Handlers<M>): void {
    window.addEventListener('message', (event: MessageEvent<M>) => {
        const message = event.data;
        if (!message || typeof message.type !== 'string') return;
        (handlers[message.type as M['type']] as ((message: M) => void) | undefined)?.(message);
    });
}

/** Tells the client script the page is ready (once the DOM has loaded). */
export function notifyReady(): void {
    const send = () => postNui('ready').catch((error) => console.error(`[${resource}] ready failed`, error));
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', send, { once: true });
    else send();
}
