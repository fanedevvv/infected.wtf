import { onPlayerDropped } from '@shared/server/events.ts';
import { getPedCoords } from '@shared/server/players.ts';

type Position = ReturnType<typeof getPedCoords>;

/** Where a staff member stood before their last /goto, for /return. */
const lastPositions = new Map<number, Position>();
onPlayerDropped((source) => lastPositions.delete(source));

export const rememberPosition = (source: number) => lastPositions.set(source, getPedCoords(source));
export const takeLastPosition = (source: number): Position | undefined => {
    const position = lastPositions.get(source);
    lastPositions.delete(source);
    return position;
};
