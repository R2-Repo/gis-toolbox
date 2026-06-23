import { mountIsland } from '../mountIsland.jsx';
import { DeduplicateDialog } from './DeduplicateDialog.jsx';

export function mountDeduplicateDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountDeduplicateDialog: target element is required');
    }

    const unmount = mountIsland(element, DeduplicateDialog, props);
    return { unmount };
}
