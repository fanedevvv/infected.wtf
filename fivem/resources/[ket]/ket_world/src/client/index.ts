/**
 * World rules applied on every client: an empty city where only players exist.
 * - Police: crimes never raise a wanted level, no dispatch (cops, swat, helicopters, army…).
 * - Population: no pedestrians, animals, traffic, parked cars, boats, trains or distant traffic.
 * Script-spawned entities (vehicles from /car, rental bikes, the bike attendant) are untouched.
 */

/** GTA dispatch services 1–15: police, fire, ambulance, swat, army, helicopters, boats, roadblocks… */
const DISPATCH_SERVICES = 15;
/** Some settings reset on respawn or when other scripts touch them, so re-apply periodically. */
const REAPPLY_MS = 5_000;
/** Bounds covering the whole map (Los Santos, Blaine County, the ocean around it). */
const MAP: [number, number, number, number, number, number] = [-10_000, -10_000, -1_000, 10_000, 10_000, 3_000];

function applyRules(): void {
    const player = PlayerId();

    // Police
    SetMaxWantedLevel(0);
    SetWantedLevelMultiplier(0);
    if (GetPlayerWantedLevel(player) > 0) ClearPlayerWantedLevel(player);
    SetPoliceIgnorePlayer(player, true);
    SetDispatchCopsForPlayer(player, false);
    for (let service = 1; service <= DISPATCH_SERVICES; service++) EnableDispatchService(service, false);
    SetCreateRandomCops(false);
    SetCreateRandomCopsNotOnScenarios(false);
    SetCreateRandomCopsOnScenarios(false);

    // Population
    SetPedPopulationBudget(0);
    SetVehiclePopulationBudget(0);
    SetNumberOfParkedVehicles(0);
    SetAllVehicleGeneratorsActiveInArea(...MAP, false, false); // parked-car spawn points
    SetRandomBoats(false);
    SetRandomTrains(false);
    SetGarbageTrucks(false);
    SetDistantCarsEnabled(false); // fake headlights on far-away highways
}

/** True if a player sits anywhere in the vehicle. */
function hasPlayerInside(vehicle: number): boolean {
    for (let seat = -1; seat < GetVehicleModelNumberOfSeats(GetEntityModel(vehicle)) - 1; seat++) {
        const ped = GetPedInVehicleSeat(vehicle, seat);
        if (ped !== 0 && IsPedAPlayer(ped)) return true;
    }
    return false;
}

/** Ambient = spawned by the game's population system, not by a script, and ours to delete. */
const isAmbient = (entity: number) =>
    DoesEntityExist(entity) && !IsEntityAMissionEntity(entity) && (!NetworkGetEntityIsNetworked(entity) || NetworkHasControlOfEntity(entity));

function deleteEntity(entity: number): void {
    SetEntityAsMissionEntity(entity, true, true); // required before the game lets us delete it
    DeleteEntity(entity);
}

/** Removes ambient entities that spawned before the rules applied (or slipped through). */
function removeAmbient(): void {
    for (const ped of GetGamePool('CPed') as number[]) {
        if (!IsPedAPlayer(ped) && isAmbient(ped)) deleteEntity(ped);
    }
    for (const vehicle of GetGamePool('CVehicle') as number[]) {
        if (isAmbient(vehicle) && !hasPlayerInside(vehicle)) deleteEntity(vehicle);
    }
}

function tickRules(): void {
    applyRules();
    removeAmbient();
}

RemoveVehiclesFromGeneratorsInArea(...MAP, 0);
tickRules();
setInterval(tickRules, REAPPLY_MS);
on('playerSpawned', tickRules);

// The game resets density multipliers every frame, so they must be set every frame.
setTick(() => {
    SetPedDensityMultiplierThisFrame(0);
    SetScenarioPedDensityMultiplierThisFrame(0, 0);
    SetVehicleDensityMultiplierThisFrame(0);
    SetRandomVehicleDensityMultiplierThisFrame(0);
    SetParkedVehicleDensityMultiplierThisFrame(0);
    SetAmbientVehicleRangeMultiplierThisFrame(0);
});
