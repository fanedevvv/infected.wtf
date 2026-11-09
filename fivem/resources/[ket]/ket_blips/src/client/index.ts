import { onResourceStop } from '@shared/client/events.ts';

interface BlipDefinition {
    name: string;
    coords: [number, number, number];
    /** https://docs.fivem.net/docs/game-references/blips/ */
    sprite: number;
    color: number;
    scale: number;
}

const BLIPS: BlipDefinition[] = [
    { name: 'Spawn',
      coords: [237.2323, -407.0282, 43.4511],
      sprite: 419,
      color: 4,
      scale: 0.8
    },
    {
        name: 'Bike Rental',
        coords: [241.4508, -380.3485, 43.4511],
        sprite: 811,
        color: 4,
        scale: 0.8
    }
];

const handles = BLIPS.map(({ name, coords, sprite, color, scale }) => {
    const blip = AddBlipForCoord(...coords);
    SetBlipSprite(blip, sprite);
    SetBlipDisplay(blip, 4);
    SetBlipScale(blip, scale);
    SetBlipColour(blip, color);
    SetBlipAsShortRange(blip, true);
    BeginTextCommandSetBlipName('STRING');
    AddTextComponentSubstringPlayerName(name);
    EndTextCommandSetBlipName(blip);
    return blip;
});

onResourceStop(() => handles.forEach((blip) => DoesBlipExist(blip) && RemoveBlip(blip)));
