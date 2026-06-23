import { mountIsland } from '../mountIsland.jsx';
import { BboxClipDialog } from './BboxClipDialog.jsx';

export function mountBboxClipDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountBboxClipDialog: target element is required');
    }

    const unmount = mountIsland(element, BboxClipDialog, props);
    return { unmount };
}
