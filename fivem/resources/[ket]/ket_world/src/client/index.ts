/**
 * World rules applied on every client.
 * - Police: crimes never raise a wanted level, no dispatch (cops, swat, helicopters, army…),
 *   and no ambient police peds or patrol cars.
 * - Population: no pedestrians and no traffic. Script-spawned peds (e.g. the bike attendant)
 *   and player vehicles are unaffected.
 */

const WORLD = {
    /** Keep parked cars along the streets (set false for completely empty streets). */
    parkedCars: true,
} as const;

/** GTA dispatch services 1–15: police, fire, ambulance, swat, army, helicopters, boats, roadblocks… */
const DISPATCH_SERVICES = 15;
/** Some of these reset on respawn or when other scripts touch them, so re-apply periodically. */
const REAPPLY_MS = 5_000;

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

    // Population (persistent settings)
    SetPedPopulationBudget(0);
    if (!WORLD.parkedCars) SetVehiclePopulationBudget(0);
    SetRandomBoats(false);
    SetRandomTrains(false);
    SetGarbageTrucks(false);
}

applyRules();
setInterval(applyRules, REAPPLY_MS);
on('playerSpawned', applyRules);

// The game resets density multipliers every frame, so they must be set every frame.
const parkedDensity = WORLD.parkedCars ? 1 : 0;
setTick(() => {
    SetPedDensityMultiplierThisFrame(0);
    SetScenarioPedDensityMultiplierThisFrame(0, 0);
    SetVehicleDensityMultiplierThisFrame(0);
    SetRandomVehicleDensityMultiplierThisFrame(0);
    SetParkedVehicleDensityMultiplierThisFrame(parkedDensity);
});
