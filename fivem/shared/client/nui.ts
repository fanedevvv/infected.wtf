import { log } from '../common/log.ts';

/** Sends a typed message to this resource's NUI page. */
export const sendNui = <M extends { type: string }>(message: M): void => SendNUIMessage(message);

/** Registers a NUI callback. Thrown errors become `{ ok: false, error }` responses. */
export function onNui<T = unknown, R = unknown>(name: string, handler: (data: T) => R | Promise<R>): void {
    RegisterNuiCallback(name, async (data: T, cb: (response: unknown) => void) => {
        try {
            cb((await handler(data)) ?? { ok: true });
        } catch (error) {
            log.error(`NUI callback ${name} failed:`, error);
            cb({ ok: false, error: error instanceof Error ? error.message : 'Something went wrong.' });
        }
    });
}

export function setNuiFocus(focused: boolean, keepInput = false): void {
    SetNuiFocus(focused, focused);
    SetNuiFocusKeepInput(keepInput);
}
