import { mountIsland } from '../mountIsland.jsx';
import { TypeConvertDialog } from './TypeConvertDialog.jsx';

export function mountTypeConvertDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountTypeConvertDialog: target element is required');
    }

    const unmount = mountIsland(element, TypeConvertDialog, props);
    return { unmount };
}
