import { mountIsland } from '../mountIsland.jsx';
import { LineIntersectDialog } from './LineIntersectDialog.jsx';

export function mountLineIntersectDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountLineIntersectDialog: target element is required');
    }

    const unmount = mountIsland(element, LineIntersectDialog, props);
    return { unmount };
}
