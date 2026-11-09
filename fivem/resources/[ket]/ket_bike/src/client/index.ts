import type { Vec4 } from '@shared/common/constants.ts';
import { log } from '@shared/common/log.ts';
import { waitFor } from '@shared/common/async.ts';
import { Core } from '@shared/client/core.ts';
import { onResourceStop } from '@shared/client/events.ts';
import { drawText3d, loadModel, notify as chat, pedCoords, requestControl, Tick, toVec3, vecDistance } from '@shared/client/game.ts';

const ATTENDANT: Vec4 = { x: 241.4508, y: -380.3485, z: 43.4511, heading: 204.5982 };
const BIKE_SPOT: Vec4 = { x: 247.0013, y: -376.0565, z: 44.4197, heading: 341.6211 };
const ATTENDANT_MODEL = 'a_m_y_business_01';
const BIKE_MODEL = 'inductor2';
const RENT_DISTANCE = 4;
const PROMPT_DISTANCE = 15;
const PROMPT = '~b~BIKE RENTAL~s~\nType ~y~/bike~s~ to rent a bike\nType ~r~/unrentbike~s~ to return your bike';

const notify = (message: string) => chat('BIKE RENTAL', message);
const attendantPos = toVec3(ATTENDANT);

let attendant: number | undefined;
let bike: number | undefined;
let busy = false;

/** Serializes rent/return so double-typed commands can't race. */
const exclusive = (job: () => Promise<void>) => async () => {
    if (busy) return;
    busy = true;
    try {
        await job();
    } finally {
        busy = false;
    }
};

const hasBike = () => bike !== undefined && DoesEntityExist(bike);

RegisterCommand(
    'bike',
    exclusive(async () => {
        if (!Core.isSpawned()) return notify('Log in before renting a bike.');
        const ped = PlayerPedId();
        if (vecDistance(pedCoords(), attendantPos) > RENT_DISTANCE) return notify('Visit the bike rental attendant to rent a bike.');
        if (IsPedInAnyVehicle(ped, false)) return notify('Exit your current vehicle before renting a bike.');
        if (hasBike()) return notify('You already have a rental bike.');

        const model = await loadModel(BIKE_MODEL);
        if (model === undefined) return notify('The bike is unavailable right now. Please try again.');

        RequestCollisionAtCoord(BIKE_SPOT.x, BIKE_SPOT.y, BIKE_SPOT.z);
        const vehicle = CreateVehicle(model, BIKE_SPOT.x, BIKE_SPOT.y, BIKE_SPOT.z, BIKE_SPOT.heading, true, false);
        SetModelAsNoLongerNeeded(model);
        if (vehicle === 0 || !DoesEntityExist(vehicle)) return notify('The bike could not be spawned. Please try again.');

        SetEntityAsMissionEntity(vehicle, true, true);
        SetVehicleOnGroundProperly(vehicle);
        SetVehicleDoorsLocked(vehicle, 1);
        TaskWarpPedIntoVehicle(ped, vehicle, -1);
        bike = vehicle;
        notify('Bike rented. Have a nice ride!');
    }),
    false,
);

RegisterCommand(
    'unrentbike',
    exclusive(async () => {
        if (!hasBike()) {
            bike = undefined;
            return notify('You do not have a rental bike.');
        }
        const vehicle = bike!;
        const ped = PlayerPedId();
        if (IsPedInVehicle(ped, vehicle, false)) {
            TaskLeaveVehicle(ped, vehicle, 0);
            if (!(await waitFor(() => !IsPedInVehicle(ped, vehicle, false), 3_000))) return notify('Could not exit the bike. Try again.');
        }
        if (!(await requestControl(vehicle))) return notify('The bike could not be returned. Please try again.');

        SetEntityAsMissionEntity(vehicle, true, true);
        DeleteVehicle(vehicle);
        if (DoesEntityExist(vehicle)) return notify('The bike could not be returned. Please try again.');
        bike = undefined;
        notify('Rental bike returned.');
    }),
    false,
);

// The 3D prompt draws every frame, but the tick only exists while the player is nearby.
const prompt = new Tick(() => drawText3d(ATTENDANT.x, ATTENDANT.y, ATTENDANT.z + 1.15, PROMPT));
setInterval(() => prompt.toggle(vecDistance(pedCoords(), attendantPos) < PROMPT_DISTANCE), 500);

void (async () => {
    const model = await loadModel(ATTENDANT_MODEL);
    if (model === undefined) return log.error('Could not load the rental attendant model.');
    attendant = CreatePed(4, model, ATTENDANT.x, ATTENDANT.y, ATTENDANT.z, ATTENDANT.heading, false, false);
    SetModelAsNoLongerNeeded(model);
    if (!attendant) return log.error('Failed to create the rental attendant.');
    SetEntityAsMissionEntity(attendant, true, true);
    SetEntityInvincible(attendant, true);
    SetBlockingOfNonTemporaryEvents(attendant, true);
    FreezeEntityPosition(attendant, true);
})();

onResourceStop(() => {
    prompt.stop();
    if (attendant !== undefined && DoesEntityExist(attendant)) DeleteEntity(attendant);
    if (hasBike()) DeleteEntity(bike!);
});
