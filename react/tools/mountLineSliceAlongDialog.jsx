import { mountIsland } from '../mountIsland.jsx';
import { LineSliceAlongDialog } from './LineSliceAlongDialog.jsx';

export function mountLineSliceAlongDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountLineSliceAlongDialog: target element is required');
    }

    const unmount = mountIsland(element, LineSliceAlongDialog, props);
    return { unmount };
}
