import type { CustomVehicle } from '@shared/common/types.ts';
import type { VehicleCategory, VehicleEntry } from '../common/nui.ts';

/** GTA vehicle classes, indexed by GetVehicleClassFromName. */
const CLASS_NAMES = [
    'Compacts', 'Sedans', 'SUVs', 'Coupes', 'Muscle', 'Sports Classics', 'Sports', 'Super', 'Motorcycles', 'Off-road', 'Industrial',
    'Utility', 'Vans', 'Cycles', 'Boats', 'Helicopters', 'Planes', 'Service', 'Emergency', 'Military', 'Commercial', 'Trains', 'Open Wheel',
];

const text = (label: string): string => {
    if (!label) return '';
    const value = GetLabelText(label);
    return value && value !== 'NULL' ? value : '';
};

/** Every vehicle model the client knows (base game + streamed add-ons), with CUSTOM first. */
export function buildCatalog(custom: CustomVehicle[]): { categories: VehicleCategory[]; vehicles: VehicleEntry[] } {
    const customByModel = new Map(custom.map((vehicle) => [vehicle.model, vehicle]));
    const byModel = new Map<string, VehicleEntry>();

    for (const raw of GetAllVehicleModels() as string[]) {
        const model = raw.toLowerCase();
        const hash = GetHashKey(model);
        const display = GetDisplayNameFromVehicleModel(hash);
        const added = customByModel.get(model);
        byModel.set(model, {
            model,
            name: added?.name ?? (text(display) || display || model),
            make: text(GetMakeNameFromVehicleModel(hash)),
            classId: GetVehicleClassFromName(hash),
            custom: added !== undefined,
        });
    }
    // Declared but not (yet) streamed: still list them so the admin can see something is wrong.
    for (const vehicle of custom) {
        if (!byModel.has(vehicle.model)) byModel.set(vehicle.model, { model: vehicle.model, name: vehicle.name, make: '', classId: -1, custom: true });
    }

    const vehicles = [...byModel.values()].sort((a, b) => a.name.localeCompare(b.name));
    const classes = [...new Set(vehicles.map((vehicle) => vehicle.classId))].filter((id) => CLASS_NAMES[id]).sort((a, b) => a - b);
    return {
        categories: [{ id: 'custom', label: 'CUSTOM' }, ...classes.map((id) => ({ id: String(id), label: CLASS_NAMES[id]! }))],
        vehicles,
    };
}
