import { mountIsland } from '../mountIsland.jsx';
import { RouteMilepostSegmentDialog } from './RouteMilepostSegmentDialog.jsx';

export function mountRouteMilepostSegmentDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountRouteMilepostSegmentDialog: target element is required');
    }
    const unmount = mountIsland(element, RouteMilepostSegmentDialog, props);
    return { unmount };
}
