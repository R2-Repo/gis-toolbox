import { mountIsland } from '../mountIsland.jsx';
import { DissolveDialog } from './DissolveDialog.jsx';

export function mountDissolveDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountDissolveDialog: target element is required');
    }

    const unmount = mountIsland(element, DissolveDialog, props);
    return { unmount };
}
