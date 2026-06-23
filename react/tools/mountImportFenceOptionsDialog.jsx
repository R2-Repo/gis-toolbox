import { mountIsland } from '../mountIsland.jsx';
import { ImportFenceOptionsDialog } from './ImportFenceOptionsDialog.jsx';

export function mountImportFenceOptionsDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountImportFenceOptionsDialog: target element is required');
    }

    const unmount = mountIsland(element, ImportFenceOptionsDialog, props);
    return { unmount };
}
