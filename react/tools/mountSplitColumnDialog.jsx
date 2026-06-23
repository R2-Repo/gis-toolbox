import { mountIsland } from '../mountIsland.jsx';
import { SplitColumnDialog } from './SplitColumnDialog.jsx';

export function mountSplitColumnDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountSplitColumnDialog: target element is required');
    }

    const unmount = mountIsland(element, SplitColumnDialog, props);
    return { unmount };
}
