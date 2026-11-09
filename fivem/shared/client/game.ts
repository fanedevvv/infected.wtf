import { waitFor } from '../common/async.ts';
import type { Vec4 } from '../common/constants.ts';
import { emitLocal } from './events.ts';

export type Vec3 = [number, number, number];

/** Requests a model and waits until it is loaded. Returns the hash, or undefined if invalid / timed out. */
export async function loadModel(name: string | number, timeoutMs = 10_000): Promise<number | undefined> {
    const hash = typeof name === 'number' ? name : GetHashKey(name);
    if (!IsModelInCdimage(hash) || !IsModelValid(hash)) return undefined;
    RequestModel(hash);
    return (await waitFor(() => HasModelLoaded(hash), timeoutMs)) ? hash : undefined;
}

/** Requests network control of an entity. */
export async function requestControl(entity: number, timeoutMs = 3_000): Promise<boolean> {
    return waitFor(() => {
        if (NetworkHasControlOfEntity(entity)) return true;
        NetworkRequestControlOfEntity(entity);
        return false;
    }, timeoutMs);
}

/** Streams the world around a point (collision + LOD) before revealing it. */
export async function loadSceneAt(position: Vec3, radius: number, timeoutMs: number, direction: Vec3 = [0, 0, 0]): Promise<boolean> {
    const [x, y, z] = position;
    SetFocusPosAndVel(x, y, z, 0, 0, 0);
    NewLoadSceneStart(x, y, z, direction[0], direction[1], direction[2], radius, 0);
    const loaded = await waitFor(() => {
        RequestCollisionAtCoord(x, y, z);
        NetworkUpdateLoadScene();
        return IsNewLoadSceneLoaded();
    }, timeoutMs);
    NewLoadSceneStop();
    return loaded;
}

export async function fadeOut(ms: number): Promise<void> {
    DoScreenFadeOut(ms);
    await waitFor(IsScreenFadedOut, ms + 2_000);
}

export const vecDistance = (a: number[], b: number[]): number =>
    Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0));

export const pedCoords = (): Vec3 => GetEntityCoords(PlayerPedId(), false) as Vec3;

/** The entity the local player controls: their vehicle if driving, otherwise their ped. */
export function controlledEntity(): number {
    const ped = PlayerPedId();
    const vehicle = GetVehiclePedIsIn(ped, false);
    return vehicle !== 0 ? vehicle : ped;
}

export const toVec3 = (point: Pick<Vec4, 'x' | 'y' | 'z'>): Vec3 => [point.x, point.y, point.z];

/** Prints a local chat line, e.g. `notify('ADMIN', 'Noclip enabled.')`. */
export const notify = (author: string, text: string): void => emitLocal('chat:addMessage', { args: [author, text], multiline: true });

/** Draws centered, outlined 3D text for one frame (call from a tick). */
export function drawText3d(x: number, y: number, z: number, text: string, scale = 0.4, alpha = 235): void {
    SetDrawOrigin(x, y, z, 0);
    SetTextFont(4);
    SetTextProportional(true);
    SetTextScale(0, scale);
    SetTextColour(255, 255, 255, alpha);
    SetTextCentre(true);
    SetTextOutline();
    BeginTextCommandDisplayText('STRING');
    AddTextComponentSubstringPlayerName(text);
    EndTextCommandDisplayText(0, 0);
    ClearDrawOrigin();
}

/** A per-frame tick that can be started and stopped (no cost while stopped). */
export class Tick {
    private id: number | undefined;
    constructor(private readonly fn: () => void) {}
    get running() {
        return this.id !== undefined;
    }
    start(): void {
        this.id ??= setTick(this.fn);
    }
    stop(): void {
        if (this.id === undefined) return;
        clearTick(this.id);
        this.id = undefined;
    }
    toggle(on: boolean): void {
        if (on) this.start();
        else this.stop();
    }
}
