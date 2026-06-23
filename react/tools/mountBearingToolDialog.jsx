import { mountIsland } from '../mountIsland.jsx';
import { BearingToolDialog } from './BearingToolDialog.jsx';

export function mountBearingToolDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountBearingToolDialog: target element is required');
    }

    const unmount = mountIsland(element, BearingToolDialog, props);
    return { unmount };
}
