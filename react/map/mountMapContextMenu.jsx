import { mountIsland } from '../mountIsland.jsx';
import { MapContextMenu } from './MapContextMenu.jsx';

export function mountMapContextMenu(element, props = {}) {
    if (!element) throw new Error('mountMapContextMenu: target element is required');
    return { unmount: mountIsland(element, MapContextMenu, props) };
}
