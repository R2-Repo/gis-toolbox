import { showModal } from './modals.js';

function watchOverlayUnmount(overlay, onUnmount) {
    const observer = new MutationObserver(() => {
        if (!document.body.contains(overlay)) {
            try {
                onUnmount?.();
            } finally {
                observer.disconnect();
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Open a modal hosting a dynamically imported React dialog.
 * @param {object} options
 * @param {string} options.title
 * @param {string} [options.width]
 * @param {string} options.mountPath - dynamic import path
 * @param {string} [options.mountExport] - named export to call
 * @param {(close: () => void) => object | Promise<object>} options.getProps
 */
export async function openReactIsland({ title, width, mountPath, mountExport, getProps }) {
    const rootId = `react-dialog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    showModal(title, `<div id="${rootId}"></div>`, {
        width,
        docked: true,
        onMount: async (overlay, close) => {
            const root = overlay.querySelector(`#${rootId}`);
            if (!root) return;

            const mod = await import(/* @vite-ignore */ mountPath);
            const mountFn = mountExport
                ? mod[mountExport]
                : Object.values(mod).find((fn) => typeof fn === 'function' && fn.name.startsWith('mount'));

            if (typeof mountFn !== 'function') {
                throw new Error(`openReactIsland: no mount function found in ${mountPath}`);
            }

            const props = await getProps(close);
            const mounted = mountFn(root, props);
            watchOverlayUnmount(overlay, () => mounted?.unmount?.());
        }
    });
}

export { watchOverlayUnmount };
