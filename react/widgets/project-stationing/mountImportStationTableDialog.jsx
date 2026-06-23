import { mountIsland } from '../../mountIsland.jsx';
import { ImportStationTableDialog } from './ImportStationTableDialog.jsx';

export function mountImportStationTableDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountImportStationTableDialog: target element is required');
    }
    const unmount = mountIsland(element, ImportStationTableDialog, props);
    return { unmount };
}
