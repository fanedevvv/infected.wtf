/** Fisherman NPC on the pier: spawned only while the player is nearby, plus a permanent map blip. */
import { drawText3d, loadModel, pedCoords, Tick, vecDistance } from '@shared/client/game.ts';
import { onResourceStop } from '@shared/client/events.ts';
import { FISHING } from '../common/config.ts';

const SPAWN_RANGE = 120;
const LABEL_RANGE = 12;
const NPC = FISHING.npc;
const npcPosition = [NPC.x, NPC.y, NPC.z];

let ped: number | undefined;
let spawning = false;
/** Label height, measured once the NPC is placed (ground lookups are too costly per frame). */
let labelZ = NPC.z + 1.1;

/** Ground height under the NPC spot (collision must be loaded, which it is within SPAWN_RANGE). */
function groundZ(): number {
    const [found, z] = GetGroundZFor_3dCoord(NPC.x, NPC.y, NPC.z + 5, false);
    return found ? z : NPC.z;
}

async function spawn(): Promise<void> {
    spawning = true;
    const model = await loadModel(FISHING.npcModel);
    spawning = false;
    if (model === undefined || ped !== undefined) return;
    const z = groundZ();
    labelZ = z + 2.1;
    ped = CreatePed(4, model, NPC.x, NPC.y, z, NPC.heading, false, false);
    SetModelAsNoLongerNeeded(model);
    SetEntityInvincible(ped, true);
    SetBlockingOfNonTemporaryEvents(ped, true);
    FreezeEntityPosition(ped, true);
    TaskStartScenarioInPlace(ped, 'WORLD_HUMAN_STAND_FISHING', 0, true);
}

function despawn(): void {
    if (ped !== undefined && DoesEntityExist(ped)) DeleteEntity(ped);
    ped = undefined;
}

const label = new Tick(() => drawText3d(NPC.x, NPC.y, labelZ, '~b~FISHERMAN~s~\nType ~y~/getjob~s~ to work as a fisherman', 0.38));

setInterval(() => {
    const distance = vecDistance(pedCoords(), npcPosition);
    if (distance < SPAWN_RANGE && ped === undefined && !spawning) void spawn();
    else if (distance > SPAWN_RANGE + 20 && ped !== undefined) despawn();
    label.toggle(distance < LABEL_RANGE);
}, 500);

const blip = AddBlipForCoord(NPC.x, NPC.y, NPC.z);
SetBlipSprite(blip, 68);
SetBlipColour(blip, 3);
SetBlipScale(blip, 0.8);
SetBlipAsShortRange(blip, true);
BeginTextCommandSetBlipName('STRING');
AddTextComponentSubstringPlayerName('Fisherman job');
EndTextCommandSetBlipName(blip);

onResourceStop(() => {
    label.stop();
    despawn();
    if (DoesBlipExist(blip)) RemoveBlip(blip);
});
