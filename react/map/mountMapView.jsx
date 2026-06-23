import { mountIsland } from '../mountIsland.jsx';
import { MapView } from './MapView.jsx';

export function mountMapView(element, props = {}) {
    let resolveReady;
    let rejectReady;
    const ready = new Promise((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
    });

    const unmount = mountIsland(element, MapView, {
        ...props,
        onReady: (map) => {
            props.onReady?.(map);
            resolveReady?.(map);
        },
        onError: (error) => {
            props.onError?.(error);
            rejectReady?.(error);
        }
    });

    return { unmount, ready };
}
