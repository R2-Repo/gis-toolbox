import { mountIsland } from '../mountIsland.jsx';
import { NearestPointOnLineDialog } from './NearestPointOnLineDialog.jsx';

export function mountNearestPointOnLineDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountNearestPointOnLineDialog: target element is required');
    }

    const unmount = mountIsland(element, NearestPointOnLineDialog, props);
    return { unmount };
}
