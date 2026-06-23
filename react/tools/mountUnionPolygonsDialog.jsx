import { mountIsland } from '../mountIsland.jsx';
import { UnionPolygonsDialog } from './UnionPolygonsDialog.jsx';

export function mountUnionPolygonsDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountUnionPolygonsDialog: target element is required');
    }

    const unmount = mountIsland(element, UnionPolygonsDialog, props);
    return { unmount };
}
