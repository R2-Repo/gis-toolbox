import { mountIsland } from '../mountIsland.jsx';
import { NearestNeighborResultsDialog } from './NearestNeighborResultsDialog.jsx';

export function mountNearestNeighborResultsDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountNearestNeighborResultsDialog: target element is required');
    }

    const unmount = mountIsland(element, NearestNeighborResultsDialog, props);
    return { unmount };
}
