/**
 * World rules applied on every client.
 * Police: crimes never raise a wanted level, no dispatch (cops, swat, helicopters, army…),
 * and no ambient police peds or patrol cars.
 */

/** GTA dispatch services 1–15: police, fire, ambulance, swat, army, helicopters, boats, roadblocks… */
const DISPATCH_SERVICES = 15;
/** Some of these reset on respawn or when other scripts touch them, so re-apply periodically. */
const REAPPLY_MS = 5_000;

function disablePolice(): void {
    const player = PlayerId();

    SetMaxWantedLevel(0);
    SetWantedLevelMultiplier(0);
    if (GetPlayerWantedLevel(player) > 0) ClearPlayerWantedLevel(player);

    SetPoliceIgnorePlayer(player, true);
    SetDispatchCopsForPlayer(player, false);
    for (let service = 1; service <= DISPATCH_SERVICES; service++) EnableDispatchService(service, false);

    SetCreateRandomCops(false);
    SetCreateRandomCopsNotOnScenarios(false);
    SetCreateRandomCopsOnScenarios(false);
}

disablePolice();
setInterval(disablePolice, REAPPLY_MS);
on('playerSpawned', disablePolice);
