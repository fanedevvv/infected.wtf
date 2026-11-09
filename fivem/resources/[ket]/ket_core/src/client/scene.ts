/** The sky-high Los Santos camera shown behind the sign-in form. */
import { loadSceneAt, type Vec3 } from '@shared/client/game.ts';
import { log } from '@shared/common/log.ts';

const CAMERA_POSITION: Vec3 = [-320, -1150, 300];
const CAMERA_TARGET: Vec3 = [-75, -819, 180];

let camera: number | undefined;

export async function showLoginScene(): Promise<void> {
    DoScreenFadeOut(0); // stay black until the city has streamed in
    ShutdownLoadingScreen();
    ShutdownLoadingScreenNui();

    // Bright, consistent backdrop regardless of session time or weather.
    ClearOverrideWeather();
    ClearWeatherTypePersist();
    SetWeatherTypeNowPersist('EXTRASUNNY');
    NetworkOverrideClockTime(12, 0, 0);

    const [tx, ty, tz] = CAMERA_TARGET;
    SetHdArea(tx, ty, tz, 300);
    const direction: Vec3 = [tx - CAMERA_POSITION[0], ty - CAMERA_POSITION[1], tz - CAMERA_POSITION[2]];
    if (!(await loadSceneAt(CAMERA_POSITION, 300, 15_000, direction))) log.warn('Login scene did not finish streaming.');

    camera = CreateCam('DEFAULT_SCRIPTED_CAMERA', true);
    SetCamCoord(camera, ...CAMERA_POSITION);
    PointCamAtCoord(camera, tx, ty, tz);
    SetCamFov(camera, 42);
    SetCamActive(camera, true);
    RenderScriptCams(true, false, 0, true, true);
    DoScreenFadeIn(2_500);
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
