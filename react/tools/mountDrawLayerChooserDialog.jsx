import { mountIsland } from '../mountIsland.jsx';
import { DrawLayerChooserDialog } from './DrawLayerChooserDialog.jsx';

export function mountDrawLayerChooserDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountDrawLayerChooserDialog: target element is required');
    }

    const unmount = mountIsland(element, DrawLayerChooserDialog, props);
    return { unmount };
}
