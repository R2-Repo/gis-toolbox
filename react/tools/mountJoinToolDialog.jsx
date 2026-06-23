import { mountIsland } from '../mountIsland.jsx';
import { JoinToolDialog } from './JoinToolDialog.jsx';

export function mountJoinToolDialog(element, props = {}) {
    if (!element) throw new Error('mountJoinToolDialog: target element is required');
    return { unmount: mountIsland(element, JoinToolDialog, props) };
}
