import { mountIsland } from '../mountIsland.jsx';
import { ImportFlowDialog } from './ImportFlowDialog.jsx';

export function mountImportFlowDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountImportFlowDialog: target element is required');
    }

    const unmount = mountIsland(element, ImportFlowDialog, props);
    return { unmount };
}
