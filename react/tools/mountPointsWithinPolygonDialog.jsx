import { mountIsland } from '../mountIsland.jsx';
import { PointsWithinPolygonDialog } from './PointsWithinPolygonDialog.jsx';

export function mountPointsWithinPolygonDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountPointsWithinPolygonDialog: target element is required');
    }

    const unmount = mountIsland(element, PointsWithinPolygonDialog, props);
    return { unmount };
}
