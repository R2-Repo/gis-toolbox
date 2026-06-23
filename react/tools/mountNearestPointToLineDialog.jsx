import { mountIsland } from '../mountIsland.jsx';
import { NearestPointToLineDialog } from './NearestPointToLineDialog.jsx';

export function mountNearestPointToLineDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountNearestPointToLineDialog: target element is required');
    }

    const unmount = mountIsland(element, NearestPointToLineDialog, props);
    return { unmount };
}
