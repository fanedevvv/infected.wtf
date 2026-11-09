import { emitServer } from '@shared/client/events.ts';

/**
 * Sends the current screen/camera state to the server console, so a login-scene problem
 * on a player's machine can be diagnosed from the server (see ket_core server log).
 */
export function reportScene(stage: string, camera: number | undefined): void {
    const [x = 0, y = 0, z = 0] = GetEntityCoords(PlayerPedId(), false);
    emitServer('ket_core:sceneReport', stage, {
        fadedIn: IsScreenFadedIn(),
        fadedOut: IsScreenFadedOut(),
        loadingScreen: GetIsLoadingScreenActive(),
        playerSwitch: IsPlayerSwitchInProgress(),
        spinner: BusyspinnerIsOn(),
        sessionStarted: NetworkIsSessionStarted(),
        sceneLoaded: IsNewLoadSceneLoaded(),
        camera: camera ?? null,
        renderingCam: GetRenderingCam(),
        camRendering: camera !== undefined ? IsCamRendering(camera) : null,
        ped: `${Math.round(x)},${Math.round(y)},${Math.round(z)}`,
        timer: GetGameTimer(),
    });
}
