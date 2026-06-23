import { mountIsland } from '../mountIsland.jsx';
import { SimplifyToolDialog } from './SimplifyToolDialog.jsx';

export function mountSimplifyToolDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountSimplifyToolDialog: target element is required');
    }

    const unmount = mountIsland(element, SimplifyToolDialog, props);
    return { unmount };
}
