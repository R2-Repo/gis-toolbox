import { mountIsland } from '../mountIsland.jsx';
import { CombineFeaturesDialog } from './CombineFeaturesDialog.jsx';

export function mountCombineFeaturesDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountCombineFeaturesDialog: target element is required');
    }

    const unmount = mountIsland(element, CombineFeaturesDialog, props);
    return { unmount };
}
