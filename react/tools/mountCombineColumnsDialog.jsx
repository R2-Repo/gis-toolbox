import { mountIsland } from '../mountIsland.jsx';
import { CombineColumnsDialog } from './CombineColumnsDialog.jsx';

export function mountCombineColumnsDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountCombineColumnsDialog: target element is required');
    }

    const unmount = mountIsland(element, CombineColumnsDialog, props);
    return { unmount };
}
