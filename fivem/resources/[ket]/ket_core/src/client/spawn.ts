/** Native player spawning (replaces spawnmanager). */
import { waitFor } from '@shared/common/async.ts';
import { DEFAULT_SKIN, SPAWN_POINT, type Vec4 } from '@shared/common/constants.ts';
import { log } from '@shared/common/log.ts';
import { loadModel, loadSceneAt, toVec3 } from '@shared/client/game.ts';

const FREEMODE = new Set([GetHashKey('mp_m_freemode_01'), GetHashKey('mp_f_freemode_01')]);
const SKIN_NAME = /^\w{1,64}$/;

/** Loads the account skin, falling back to the default freemode ped. */
export async function loadSkin(skin: string): Promise<number | undefined> {
    for (const name of SKIN_NAME.test(skin) ? [skin, DEFAULT_SKIN] : [DEFAULT_SKIN]) {
        const hash = await loadModel(name);
        if (hash !== undefined && IsModelAPed(hash)) return hash;
        log.warn(`Skin "${name}" is unavailable.`);
    }
    return undefined;
}

/** Hides and freezes the local ped while the login screen is shown. */
export function parkPlayer(point: Vec4 = SPAWN_POINT): void {
    NetworkResurrectLocalPlayer(point.x, point.y, point.z, point.heading, 0, false);
    const ped = PlayerPedId();
    FreezeEntityPosition(ped, true);
    SetEntityVisible(ped, false, false);
    SetEntityCollision(ped, false, false);
    SetPlayerControl(PlayerId(), false, 0);
    DisplayRadar(false);
}

/** Places the local player at `point` with `model`, waits for collision, and gives back control. */
export async function spawnPlayer(model: number | undefined, point: Vec4 = SPAWN_POINT): Promise<void> {
    const player = PlayerId();
    const { x, y, z, heading } = point;

    await loadSceneAt(toVec3(point), 50, 10_000);

    if (model !== undefined && GetEntityModel(PlayerPedId()) !== model) {
        SetPlayerModel(player, model);
        SetModelAsNoLongerNeeded(model);
        if (FREEMODE.has(model)) SetPedDefaultComponentVariation(PlayerPedId());
    }

    RequestCollisionAtCoord(x, y, z);
    SetEntityCoordsNoOffset(PlayerPedId(), x, y, z, false, false, false);
    NetworkResurrectLocalPlayer(x, y, z, heading, 0, false);

    const ped = PlayerPedId();
    ClearPedTasksImmediately(ped);
    ClearPedBloodDamage(ped);
    RemoveAllPedWeapons(ped, false);
    ClearPlayerWantedLevel(player);
    SetEntityHealth(ped, GetEntityMaxHealth(ped));

    SetFocusEntity(ped);
    if (!(await waitFor(() => HasCollisionLoadedAroundEntity(ped), 10_000))) log.warn('Spawn collision still streaming.');

    SetEntityVisible(ped, true, false);
    SetEntityCollision(ped, true, true);
    FreezeEntityPosition(ped, false);
    SetGameplayCamRelativeHeading(0);
    DisplayRadar(true);
    SetPlayerControl(player, true, 0);
    emit('playerSpawned', { x, y, z, heading, model });
}
