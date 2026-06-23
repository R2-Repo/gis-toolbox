import { mountIsland } from '../mountIsland.jsx';
import { NearestPointDialog } from './NearestPointDialog.jsx';

export function mountNearestPointDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountNearestPointDialog: target element is required');
    }

    const unmount = mountIsland(element, NearestPointDialog, props);
    return { unmount };
}
