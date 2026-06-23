import { mountIsland } from '../mountIsland.jsx';
import { NearestNeighborAnalysisDialog } from './NearestNeighborAnalysisDialog.jsx';

export function mountNearestNeighborAnalysisDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountNearestNeighborAnalysisDialog: target element is required');
    }

    const unmount = mountIsland(element, NearestNeighborAnalysisDialog, props);
    return { unmount };
}
