import { mountIsland } from '../mountIsland.jsx';
import { ValidationDialog } from './ValidationDialog.jsx';

export function mountValidationDialog(element, props = {}) {
    if (!element) throw new Error('mountValidationDialog: target element is required');
    return { unmount: mountIsland(element, ValidationDialog, props) };
}
