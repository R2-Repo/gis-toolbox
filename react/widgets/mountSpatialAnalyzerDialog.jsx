import { mountIsland } from '../mountIsland.jsx';
import { SpatialAnalyzerDialog } from './SpatialAnalyzerDialog.jsx';

export function mountSpatialAnalyzerDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountSpatialAnalyzerDialog: target element is required');
    }

    const unmount = mountIsland(element, SpatialAnalyzerDialog, props);
    return { unmount };
}
