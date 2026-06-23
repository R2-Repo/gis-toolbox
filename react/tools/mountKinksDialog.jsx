import { mountIsland } from '../mountIsland.jsx';
import { KinksDialog } from './KinksDialog.jsx';

export function mountKinksDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountKinksDialog: target element is required');
    }

    const unmount = mountIsland(element, KinksDialog, props);
    return { unmount };
}
