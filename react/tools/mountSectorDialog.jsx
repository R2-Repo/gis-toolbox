import { mountIsland } from '../mountIsland.jsx';
import { SectorDialog } from './SectorDialog.jsx';

export function mountSectorDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountSectorDialog: target element is required');
    }

    const unmount = mountIsland(element, SectorDialog, props);
    return { unmount };
}
