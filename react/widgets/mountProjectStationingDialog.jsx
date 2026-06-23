import { mountIsland } from '../mountIsland.jsx';
import { ProjectStationingDialog } from './ProjectStationingDialog.jsx';

export function mountProjectStationingDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountProjectStationingDialog: target element is required');
    }
    const unmount = mountIsland(element, ProjectStationingDialog, props);
    return { unmount };
}
