import { mountIsland } from '../mountIsland.jsx';
import { ArcGISImporterDialog } from './ArcGISImporterDialog.jsx';

export function mountArcGISImporterDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountArcGISImporterDialog: target element is required');
    }

    const unmount = mountIsland(element, ArcGISImporterDialog, props);
    return { unmount };
}
