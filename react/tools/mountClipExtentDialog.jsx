import { mountIsland } from '../mountIsland.jsx';
import { ClipExtentDialog } from './ClipExtentDialog.jsx';

export function mountClipExtentDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountClipExtentDialog: target element is required');
    }

    const unmount = mountIsland(element, ClipExtentDialog, props);
    return { unmount };
}
