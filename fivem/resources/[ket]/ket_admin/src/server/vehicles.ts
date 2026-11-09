import type { CustomVehicle } from '@shared/common/types.ts';

const MODEL = /^\w{1,64}$/;

/**
 * Add-on vehicles declared by started resources. A car resource opts in with
 *   ket_vehicle 'modelname'
 *   ket_vehicle_name 'Display Name'
 * in its fxmanifest (repeat both lines for several models). Read on demand, so a newly
 * ensured car shows up without restarting ket_admin.
 */
export function customVehicles(): CustomVehicle[] {
    const vehicles: CustomVehicle[] = [];
    for (let index = 0; index < GetNumResources(); index++) {
        const resource = GetResourceByFindIndex(index);
        if (!resource || GetResourceState(resource) !== 'started') continue;
        const count = GetNumResourceMetadata(resource, 'ket_vehicle');
        for (let entry = 0; entry < count; entry++) {
            const model = GetResourceMetadata(resource, 'ket_vehicle', entry)?.toLowerCase();
            if (!model || !MODEL.test(model)) continue;
            vehicles.push({ model, name: GetResourceMetadata(resource, 'ket_vehicle_name', entry) || model, resource });
        }
    }
    return vehicles.sort((a, b) => a.name.localeCompare(b.name));
}
