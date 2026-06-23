import { mountIsland } from '../mountIsland.jsx';
import { LineOffsetDialog } from './LineOffsetDialog.jsx';

export function mountLineOffsetDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountLineOffsetDialog: target element is required');
    }

    const unmount = mountIsland(element, LineOffsetDialog, props);
    return { unmount };
}
