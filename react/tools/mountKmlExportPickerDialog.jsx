import { mountIsland } from '../mountIsland.jsx';
import { KmlExportPickerDialog } from './KmlExportPickerDialog.jsx';

export function mountKmlExportPickerDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountKmlExportPickerDialog: target element is required');
    }

    const unmount = mountIsland(element, KmlExportPickerDialog, props);
    return { unmount };
}
