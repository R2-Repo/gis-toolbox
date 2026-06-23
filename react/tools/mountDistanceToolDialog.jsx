import { mountIsland } from '../mountIsland.jsx';
import { DistanceToolDialog } from './DistanceToolDialog.jsx';

export function mountDistanceToolDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountDistanceToolDialog: target element is required');
    }

    const unmount = mountIsland(element, DistanceToolDialog, props);
    return { unmount };
}
