import { mountIsland } from '../mountIsland.jsx';
import { FiberSlackOtdrHelperDialog } from './FiberSlackOtdrHelperDialog.jsx';

export function mountFiberSlackOtdrHelperDialog(element, props = {}) {
    const unmount = mountIsland(element, FiberSlackOtdrHelperDialog, props);
    return { unmount };
}
