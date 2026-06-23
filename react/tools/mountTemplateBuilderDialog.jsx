import { mountIsland } from '../mountIsland.jsx';
import { TemplateBuilderDialog } from './TemplateBuilderDialog.jsx';

export function mountTemplateBuilderDialog(element, props = {}) {
    if (!element) throw new Error('mountTemplateBuilderDialog: target element is required');
    return { unmount: mountIsland(element, TemplateBuilderDialog, props) };
}
