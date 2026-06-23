import { mountIsland } from '../mountIsland.jsx';
import { ImportOptimizerDialog } from './ImportOptimizerDialog.jsx';

export function mountImportOptimizerDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountImportOptimizerDialog: target element is required');
    }
    const unmount = mountIsland(element, ImportOptimizerDialog, props);
    return { unmount };
}
