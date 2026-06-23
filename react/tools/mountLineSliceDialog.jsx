import { mountIsland } from '../mountIsland.jsx';
import { LineSliceDialog } from './LineSliceDialog.jsx';

export function mountLineSliceDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountLineSliceDialog: target element is required');
    }

    const unmount = mountIsland(element, LineSliceDialog, props);
    return { unmount };
}
