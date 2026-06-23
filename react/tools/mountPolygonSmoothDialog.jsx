import { mountIsland } from '../mountIsland.jsx';
import { PolygonSmoothDialog } from './PolygonSmoothDialog.jsx';

export function mountPolygonSmoothDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountPolygonSmoothDialog: target element is required');
    }

    const unmount = mountIsland(element, PolygonSmoothDialog, props);
    return { unmount };
}
