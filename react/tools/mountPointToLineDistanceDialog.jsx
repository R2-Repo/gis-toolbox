import { mountIsland } from '../mountIsland.jsx';
import { PointToLineDistanceDialog } from './PointToLineDistanceDialog.jsx';

export function mountPointToLineDistanceDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountPointToLineDistanceDialog: target element is required');
    }

    const unmount = mountIsland(element, PointToLineDistanceDialog, props);
    return { unmount };
}
