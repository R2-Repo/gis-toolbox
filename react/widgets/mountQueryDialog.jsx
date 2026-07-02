import { mountIsland } from '../mountIsland.jsx';
import { QueryDialog } from './QueryDialog.jsx';

export function mountQueryDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountQueryDialog: target element is required');
    }

    const unmount = mountIsland(element, QueryDialog, props);
    return { unmount };
}
