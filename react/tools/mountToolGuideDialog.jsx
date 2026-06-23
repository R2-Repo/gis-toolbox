import { mountIsland } from '../mountIsland.jsx';
import { ToolGuideDialog } from './ToolGuideDialog.jsx';

export function mountToolGuideDialog(element, props = {}) {
    if (!element) throw new Error('mountToolGuideDialog: target element is required');
    return { unmount: mountIsland(element, ToolGuideDialog, props) };
}
