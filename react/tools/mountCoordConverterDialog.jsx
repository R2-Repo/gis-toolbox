import { mountIsland } from '../mountIsland.jsx';
import { CoordConverterDialog } from './CoordConverterDialog.jsx';

export function mountCoordConverterDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountCoordConverterDialog: target element is required');
    }

    const unmount = mountIsland(element, CoordConverterDialog, props);
    return { unmount };
}
