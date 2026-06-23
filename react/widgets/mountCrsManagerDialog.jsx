import { mountIsland } from '../mountIsland.jsx';
import { CrsManagerDialog } from './CrsManagerDialog.jsx';

export function mountCrsManagerDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountCrsManagerDialog: target element is required');
    }
    return { unmount: mountIsland(element, CrsManagerDialog, props) };
}
