/**
 * The sky-high Los Santos camera shown behind the sign-in form.
 * The native call order mirrors the legacy ket_auth sequence that is known to render correctly:
 * fade out → shut down loading screens → park player → stream scene (with NetworkUpdateLoadScene)
 * → render camera → stop load scene → fade in.
 */
import { sleep } from '@shared/common/async.ts';
import { log } from '@shared/common/log.ts';
import type { Vec3 } from '@shared/client/game.ts';
import { reportScene } from './diagnostics.ts';

const CAMERA_POSITION: Vec3 = [-320, -1150, 300];
const CAMERA_TARGET: Vec3 = [-75, -819, 180];
const SCENE_TIMEOUT_MS = 15_000;

let camera: number | undefined;

export async function showLoginScene(parkPlayer: () => void): Promise<void> {
    DoScreenFadeOut(0); // stay black until the city has streamed in
    ShutdownLoadingScreen();
    ShutdownLoadingScreenNui();
    parkPlayer();
    reportScene('start', camera);

    // Bright, consistent backdrop regardless of session time or weather.
    ClearOverrideWeather();
    ClearWeatherTypePersist();
    SetWeatherTypeNowPersist('EXTRASUNNY');
    NetworkOverrideClockTime(12, 0, 0);

    const [cx, cy, cz] = CAMERA_POSITION;
    const [tx, ty, tz] = CAMERA_TARGET;
    SetFocusPosAndVel(cx, cy, cz, 0, 0, 0);
    SetHdArea(tx, ty, tz, 300);
    RequestCollisionAtCoord(tx, ty, tz);
    RequestCollisionAtCoord(cx, cy, cz);
    NewLoadSceneStart(cx, cy, cz, tx - cx, ty - cy, tz - cz, 300, 0);

    const deadline = GetGameTimer() + SCENE_TIMEOUT_MS;
    while (!IsNewLoadSceneLoaded() && GetGameTimer() < deadline) {
        RequestCollisionAtCoord(tx, ty, tz);
        RequestCollisionAtCoord(cx, cy, cz);
        NetworkUpdateLoadScene();
        await sleep(0);
    }
    if (!IsNewLoadSceneLoaded()) log.warn('Los Santos camera scene did not finish loading before the timeout.');
    reportScene('streamed', camera);

    camera = CreateCam('DEFAULT_SCRIPTED_CAMERA', true);
    SetCamCoord(camera, cx, cy, cz);
    PointCamAtCoord(camera, tx, ty, tz);
    SetCamFov(camera, 42);
    SetCamActive(camera, true);
    RenderScriptCams(true, false, 0, true, true);
    NewLoadSceneStop();
    DoScreenFadeIn(2_500);
    reportScene('rendering', camera);

    // Self-heal in the background (the form opens immediately): clear anything that can
    // still cover the camera once the fade-in has finished.
    void (async () => {
        await sleep(3_000);
        if (GetIsLoadingScreenActive()) ShutdownLoadingScreen();
        if (IsPlayerSwitchInProgress()) StopPlayerSwitch();
        if (BusyspinnerIsOn()) BusyspinnerOff();
        if (!IsScreenFadedIn() && !IsScreenFadingIn()) DoScreenFadeIn(500);
        reportScene('settled', camera);
    })();
}

/** Swings the camera over the spawn point while the player is placed. */
export function aimCameraAt([x, y, z]: Vec3): void {
    if (camera === undefined) return;
    SetCamCoord(camera, x + 35, y - 75, z + 90);
    PointCamAtCoord(camera, x, y, z + 8);
}

export function hideLoginScene(): void {
    if (camera !== undefined && DoesCamExist(camera)) {
        SetCamActive(camera, false);
        RenderScriptCams(false, false, 0, true, true);
        DestroyCam(camera, true);
    }
    camera = undefined;
    ClearFocus();
    ClearHdArea();
    ClearTimecycleModifier();
    ClearExtraTimecycleModifier();
    ClearOverrideWeather();
    ClearWeatherTypePersist();
}
