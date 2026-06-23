import { mountIsland } from '../mountIsland.jsx';
import { AlongToolDialog } from './AlongToolDialog.jsx';

export function mountAlongToolDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountAlongToolDialog: target element is required');
    }

    const unmount = mountIsland(element, AlongToolDialog, props);
    return { unmount };
}
