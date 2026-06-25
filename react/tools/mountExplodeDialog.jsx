import { mountIsland } from '../mountIsland.jsx';
import { ExplodeDialog } from './ExplodeDialog.jsx';

export function mountExplodeDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountExplodeDialog: target element is required');
    }

    const unmount = mountIsland(element, ExplodeDialog, props);
    return { unmount };
}
