import { mountIsland } from '../mountIsland.jsx';
import { BezierSplineDialog } from './BezierSplineDialog.jsx';

export function mountBezierSplineDialog(element, props = {}) {
    if (!element) {
        throw new Error('mountBezierSplineDialog: target element is required');
    }

    const unmount = mountIsland(element, BezierSplineDialog, props);
    return { unmount };
}
