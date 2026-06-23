import { mountIsland } from '../mountIsland.jsx';
import { BufferToolDialog } from './BufferToolDialog.jsx';

export function mountBufferToolDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountBufferToolDialog: target element is required');
    }

    const unmount = mountIsland(element, BufferToolDialog, props);
    return { unmount };
}
