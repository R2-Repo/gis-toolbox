import { mountIsland } from '../mountIsland.jsx';
import { NetworkLinksDialog } from './NetworkLinksDialog.jsx';

export function mountNetworkLinksDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountNetworkLinksDialog: target element is required');
    }

    const unmount = mountIsland(element, NetworkLinksDialog, props);
    return { unmount };
}
