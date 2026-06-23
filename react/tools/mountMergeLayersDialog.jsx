import { mountIsland } from '../mountIsland.jsx';
import { MergeLayersDialog } from './MergeLayersDialog.jsx';

export function mountMergeLayersDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountMergeLayersDialog: target element is required');
    }

    const unmount = mountIsland(element, MergeLayersDialog, props);
    return { unmount };
}
