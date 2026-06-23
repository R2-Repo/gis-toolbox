import { mountIsland } from '../mountIsland.jsx';
import { FilterBuilderDialog } from './FilterBuilderDialog.jsx';

export function mountFilterBuilderDialog(element, props = {}) {
    if (!element) throw new Error('mountFilterBuilderDialog: target element is required');
    return { unmount: mountIsland(element, FilterBuilderDialog, props) };
}
