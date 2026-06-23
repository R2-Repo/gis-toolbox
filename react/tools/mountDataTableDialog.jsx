import { mountIsland } from '../mountIsland.jsx';
import { DataTableDialog } from './DataTableDialog.jsx';

export function mountDataTableDialog(element, props = {}) {
    if (!element) throw new Error('mountDataTableDialog: target element is required');
    return { unmount: mountIsland(element, DataTableDialog, props) };
}
