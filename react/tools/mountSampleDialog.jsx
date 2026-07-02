import { mountIsland } from '../mountIsland.jsx';
import { SampleDialog } from './SampleDialog.jsx';

export function mountSampleDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountSampleDialog: target element is required');
    }

    const unmount = mountIsland(element, SampleDialog, props);
    return { unmount };
}
