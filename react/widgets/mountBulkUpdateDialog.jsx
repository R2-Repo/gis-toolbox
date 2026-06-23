import { mountIsland } from '../mountIsland.jsx';
import { BulkUpdateDialog } from './BulkUpdateDialog.jsx';

export function mountBulkUpdateDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountBulkUpdateDialog: target element is required');
    }

    const unmount = mountIsland(element, BulkUpdateDialog, props);
    return { unmount };
}
