import { mountIsland } from '../mountIsland.jsx';
import { ReplaceCleanDialog } from './ReplaceCleanDialog.jsx';

export function mountReplaceCleanDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountReplaceCleanDialog: target element is required');
    }

    const unmount = mountIsland(element, ReplaceCleanDialog, props);
    return { unmount };
}
