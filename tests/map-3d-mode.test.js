import { describe, expect, it, vi } from 'vitest';

vi.mock('../js/map/map-manager.js', () => ({
    default: {}
}));

import { createMapService } from '../js/map/map-service.js';

function createMockMapAdapter() {
    return {
        _3dEnabled: false,
        _terrainEnabled: false,
        getMap: vi.fn(() => null),
        enable3D: vi.fn(function enable3D() {
            this._3dEnabled = true;
        }),
        disable3D: vi.fn(function disable3D() {
            this._3dEnabled = false;
        }),
        reapply3DIfEnabled: vi.fn(function reapply3DIfEnabled() {
            if (this._3dEnabled) this._terrainEnabled = true;
        })
    };
}

describe('map 3D mode service', () => {
    it('set3DEnabled stores flag when map is unavailable (dual-screen primary)', () => {
        const adapter = createMockMapAdapter();
        const service = createMapService({ mapAdapter: adapter });

        expect(service.set3DEnabled(true)).toBe(true);
        expect(adapter._3dEnabled).toBe(true);
        expect(adapter.enable3D).not.toHaveBeenCalled();
    });

    it('set3DEnabled calls enable3D/disable3D when map exists', () => {
        const adapter = createMockMapAdapter();
        const map = {};
        adapter.getMap.mockReturnValue(map);
        const service = createMapService({ mapAdapter: adapter });

        service.set3DEnabled(true);
        expect(adapter.enable3D).toHaveBeenCalledTimes(1);

        service.set3DEnabled(false);
        expect(adapter.disable3D).toHaveBeenCalledTimes(1);
    });

    it('set3DEnabled reapplies visuals when flag already true and map returns', () => {
        const adapter = createMockMapAdapter();
        adapter._3dEnabled = true;
        adapter.getMap.mockReturnValue({});
        const service = createMapService({ mapAdapter: adapter });

        service.set3DEnabled(true);
        expect(adapter.reapply3DIfEnabled).toHaveBeenCalledTimes(1);
        expect(adapter.enable3D).not.toHaveBeenCalled();
    });
});
