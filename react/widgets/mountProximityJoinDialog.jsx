import { mountIsland } from '../mountIsland.jsx';
import { ProximityJoinDialog } from './ProximityJoinDialog.jsx';

export function mountProximityJoinDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountProximityJoinDialog: target element is required');
    }

    const unmount = mountIsland(element, ProximityJoinDialog, props);
    return { unmount };
}
