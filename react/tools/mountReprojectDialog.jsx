import { mountIsland } from '../mountIsland.jsx';
import { ReprojectDialog } from './ReprojectDialog.jsx';

export function mountReprojectDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountReprojectDialog: target element is required');
    }
    const unmount = mountIsland(element, ReprojectDialog, props);
    return { unmount };
}
