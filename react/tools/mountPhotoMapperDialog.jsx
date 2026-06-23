import { mountIsland } from '../mountIsland.jsx';
import { PhotoMapperDialog } from './PhotoMapperDialog.jsx';

export function mountPhotoMapperDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountPhotoMapperDialog: target element is required');
    }

    const unmount = mountIsland(element, PhotoMapperDialog, props);
    return { unmount };
}
