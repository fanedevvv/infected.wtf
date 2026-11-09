/** Connected player server ids. */
export const getPlayerIds = (): number[] => getPlayers().map(Number);

export const isConnected = (source: number): boolean => source > 0 && GetPlayerName(String(source)) !== null && GetPlayerName(String(source)) !== '';

export const getLicense = (source: number): string =>
    GetPlayerIdentifierByType(String(source), 'license') || `player:${source}`;

export const getPedCoords = (source: number): { x: number; y: number; z: number; heading: number } => {
    const ped = GetPlayerPed(String(source));
    const [x = 0, y = 0, z = 0] = GetEntityCoords(ped);
    return { x, y, z, heading: GetEntityHeading(ped) };
};

export const distance3 = (a: number[], b: number[]): number =>
    Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0));
