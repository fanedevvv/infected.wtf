import type { AdminAction } from '@shared/common/contracts.ts';
import { sleep } from '@shared/common/async.ts';
import { controlledEntity, loadModel, notify as chat, pedCoords, requestControl, Tick, vecDistance } from '@shared/client/game.ts';
import { emitServer } from '@shared/client/events.ts';
import { resourceExports } from '@shared/common/fx.ts';

const notify = (message: string) => chat('ADMIN', message);

const Control = { Sprint: 21, Jump: 22, Forward: 32, Back: 33, Left: 34, Right: 35, Duck: 36 } as const;
const WAYPOINT_SPRITE = 8;
const CLEAR_RADIUS = 100;

const flags = { invisible: false, godmode: false, spectating: false };

// ── Noclip: per-frame movement only while enabled ──────────────────────────
const noclip = new Tick(() => {
    const ped = PlayerPedId();
    const [x = 0, y = 0, z = 0] = GetEntityCoords(ped, false);
    const [pitchDeg = 0, , yawDeg = 0] = GetGameplayCamRot(2);
    const yaw = (yawDeg * Math.PI) / 180;
    const pitch = (pitchDeg * Math.PI) / 180;
    const forward = [-Math.sin(yaw) * Math.cos(pitch), Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch)];
    const right = [Math.cos(yaw), Math.sin(yaw), 0];

    const dir = [0, 0, 0];
    const add = (v: number[], sign: number) => v.forEach((value, i) => (dir[i]! += value * sign));
    if (IsControlPressed(0, Control.Forward)) add(forward, 1);
    if (IsControlPressed(0, Control.Back)) add(forward, -1);
    if (IsControlPressed(0, Control.Right)) add(right, 1);
    if (IsControlPressed(0, Control.Left)) add(right, -1);
    if (IsControlPressed(0, Control.Jump)) dir[2]! += 1;
    if (IsControlPressed(0, Control.Duck)) dir[2]! -= 1;

    SetEntityVelocity(ped, 0, 0, 0);
    const length = Math.hypot(dir[0]!, dir[1]!, dir[2]!);
    if (length === 0) return;
    const step = ((IsControlPressed(0, Control.Sprint) ? 16 : 5) * GetFrameTime()) / length;
    SetEntityCoordsNoOffset(ped, x + dir[0]! * step, y + dir[1]! * step, z + dir[2]! * step, true, true, true);
});

function toggleNoclip(): void {
    const enable = !noclip.running;
    const ped = PlayerPedId();
    SetEntityCollision(ped, !enable, !enable);
    FreezeEntityPosition(ped, false);
    SetEntityVisible(ped, !flags.invisible, false);
    noclip.toggle(enable);
    notify(enable ? 'Noclip enabled.' : 'Noclip disabled.');
}

async function teleportToWaypoint(): Promise<void> {
    const blip = GetFirstBlipInfoId(WAYPOINT_SPRITE);
    if (!DoesBlipExist(blip)) return notify('Set a waypoint on the map first.');
    const [x = 0, y = 0] = GetBlipInfoIdCoord(blip);
    for (let height = 0; height <= 1000; height += 25) {
        RequestCollisionAtCoord(x, y, height);
        const [found, groundZ] = GetGroundZFor_3dCoord(x, y, height, false);
        if (found) {
            SetEntityCoordsNoOffset(controlledEntity(), x, y, groundZ + 1, false, false, false);
            return notify('Teleported to your waypoint.');
        }
        await sleep(0); // yield a tick so collision can stream
    }
    notify('Could not find ground near that waypoint. Set a waypoint on a road and try again.');
}

function toggleSpectate(serverId: number): void {
    if (flags.spectating) {
        NetworkSetInSpectatorMode(false, PlayerPedId());
        flags.spectating = false;
        return notify('Spectating stopped.');
    }
    const player = GetPlayerFromServerId(serverId);
    if (player === -1 || !NetworkIsPlayerActive(player)) return notify('That player is not available for spectating.');
    NetworkSetInSpectatorMode(true, GetPlayerPed(player));
    flags.spectating = true;
}

async function spawnVehicle(name: string): Promise<void> {
    const model = await loadModel(name);
    if (model === undefined || !IsModelAVehicle(model)) return notify('That vehicle model is not valid.');
    const ped = PlayerPedId();
    const [x = 0, y = 0, z = 0] = GetOffsetFromEntityInWorldCoords(ped, 0, 4, 0);
    const vehicle = CreateVehicle(model, x, y, z, GetEntityHeading(ped), true, false);
    SetModelAsNoLongerNeeded(model);
    if (vehicle === 0) return notify('Could not create the vehicle.');
    SetPedIntoVehicle(ped, vehicle, -1);
    SetVehicleOnGroundProperly(vehicle);
    notify(`Spawned ${name}.`);
}

function nearbyVehicle(): number {
    const ped = PlayerPedId();
    const current = GetVehiclePedIsIn(ped, false);
    if (current !== 0) return current;
    const [x = 0, y = 0, z = 0] = GetEntityCoords(ped, false);
    return GetClosestVehicle(x, y, z, 6, 0, 70);
}

function currentVehicle(): number | undefined {
    const vehicle = GetVehiclePedIsIn(PlayerPedId(), false);
    if (vehicle === 0) notify('Get in a vehicle first.');
    return vehicle || undefined;
}

async function clearArea(): Promise<void> {
    const origin = pedCoords();
    let removed = 0;
    for (const vehicle of GetGamePool('CVehicle') as number[]) {
        if (vecDistance(GetEntityCoords(vehicle, false), origin) > CLEAR_RADIUS) continue;
        if (GetVehicleNumberOfPassengers(vehicle) > 0 || !IsVehicleSeatFree(vehicle, -1)) continue;
        if (!(await requestControl(vehicle, 1_000))) continue;
        SetEntityAsMissionEntity(vehicle, true, true);
        DeleteVehicle(vehicle);
        if (!DoesEntityExist(vehicle)) removed++;
    }
    notify(`Removed ${removed} unoccupied vehicle(s) within ${CLEAR_RADIUS} meters.`);
}

/** Executes an action the server has already authorized. */
export async function runAction(action: AdminAction): Promise<void> {
    switch (action.type) {
        case 'teleport': {
            const entity = controlledEntity();
            RequestCollisionAtCoord(action.x, action.y, action.z);
            SetEntityCoordsNoOffset(entity, action.x, action.y, action.z, false, false, false);
            if (action.heading !== undefined) SetEntityHeading(entity, action.heading);
            return;
        }
        case 'respawn':
            return resourceExports('ket_core').respawn!();
        case 'waypoint':
            return teleportToWaypoint();
        case 'freeze':
            FreezeEntityPosition(PlayerPedId(), action.frozen);
            if (!action.frozen) SetPlayerControl(PlayerId(), true, 0);
            return;
        case 'heal': {
            const ped = PlayerPedId();
            SetEntityHealth(ped, GetEntityMaxHealth(ped));
            ClearPedBloodDamage(ped);
            return;
        }
        case 'spectate':
            return toggleSpectate(action.target);
        case 'noclip':
            return toggleNoclip();
        case 'invisible':
            flags.invisible = !flags.invisible;
            SetEntityVisible(PlayerPedId(), !flags.invisible, false);
            return notify(flags.invisible ? 'You are now invisible.' : 'You are visible again.');
        case 'godmode':
            flags.godmode = !flags.godmode;
            SetPlayerInvincible(PlayerId(), flags.godmode);
            return notify(flags.godmode ? 'Godmode enabled.' : 'Godmode disabled.');
        case 'deleteVehicle': {
            const vehicle = nearbyVehicle();
            if (vehicle === 0) return notify('No vehicle found nearby.');
            return emitServer('ket_admin:deleteVehicle', NetworkGetNetworkIdFromEntity(vehicle));
        }
        case 'fix': {
            const vehicle = currentVehicle();
            if (vehicle === undefined) return;
            SetVehicleFixed(vehicle);
            SetVehicleDeformationFixed(vehicle);
            SetVehicleEngineHealth(vehicle, 1000);
            return notify('Vehicle repaired.');
        }
        case 'fuel': {
            const vehicle = currentVehicle();
            if (vehicle === undefined) return;
            SetVehicleFuelLevel(vehicle, 100);
            return notify('Vehicle refueled.');
        }
        case 'clearArea':
            return clearArea();
        case 'spawnVehicle':
            return spawnVehicle(action.model);
    }
}

export function resetActions(): void {
    if (noclip.running) toggleNoclip();
    if (flags.spectating) toggleSpectate(0);
}
